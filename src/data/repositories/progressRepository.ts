import {database} from '../database/client';
import {createId} from '../../utils/createId';
import type {ProgressRepository} from './ProgressRepositoryContract';
import type {
  CreateGoalInput, CreateHabitInput, Goal, GoalMilestone, Habit, LifeReview, LifeScore,
  ProgressSnapshot, ReviewMetrics, Routine, RoutineRun, RoutineStep, RoutineStepCompletion, SaveReviewInput,
} from '../../features/progress/types';

const row = (value: unknown) => value as Record<string, unknown>;
const num = (value: unknown) => Number(value ?? 0);
const text = (value: unknown) => String(value ?? '');
const nullableText = (value: unknown) => value == null ? null : String(value);
const bool = (value: unknown) => Number(value ?? 0) === 1;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const weekStart = (date = new Date()) => { const d=new Date(date); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d; };
const weekKey = (date = new Date()) => dateKey(weekStart(date));
const startIso = (date: Date) => { const d=new Date(date); d.setHours(0,0,0,0); return d.toISOString(); };
const endIso = (date: Date) => { const d=new Date(date); d.setHours(23,59,59,999); return d.toISOString(); };

async function scalar(sql: string, params: unknown[] = []): Promise<number> {
  const result = await database.execute(sql, params);
  const first = result.rows[0] as Record<string, unknown> | undefined;
  return Number(first?.value ?? 0);
}

async function metricsBetween(start: Date, end: Date): Promise<ReviewMetrics> {
  const startDateKey=dateKey(start), endDateKey=dateKey(end);
  const [tasksCompleted, remindersCompleted, workoutSessions, studySeconds, expenseMinor, habitsCompleted, habitsTotal, activeGoals] = await Promise.all([
    scalar(`SELECT COUNT(*) AS value FROM tasks WHERE deleted_at IS NULL AND completed_at BETWEEN ? AND ?;`,[startIso(start),endIso(end)]),
    scalar(`SELECT COUNT(*) AS value FROM reminders WHERE completed_at BETWEEN ? AND ?;`,[startIso(start),endIso(end)]),
    scalar(`SELECT COUNT(*) AS value FROM workout_sessions WHERE status='completed' AND ended_at BETWEEN ? AND ?;`,[startIso(start),endIso(end)]),
    scalar(`SELECT COALESCE(SUM(duration_seconds),0) AS value FROM study_sessions WHERE status='completed' AND ended_at BETWEEN ? AND ?;`,[startIso(start),endIso(end)]),
    scalar(`SELECT COALESCE(SUM(amount_minor),0) AS value FROM transactions WHERE deleted_at IS NULL AND kind='expense' AND occurred_at BETWEEN ? AND ?;`,[startIso(start),endIso(end)]),
    scalar(`SELECT COUNT(*) AS value FROM habit_checkins WHERE completed=1 AND date_key BETWEEN ? AND ?;`,[startDateKey,endDateKey]),
    scalar(`SELECT COUNT(*) AS value FROM habits WHERE active=1;`),
    scalar(`SELECT COUNT(*) AS value FROM goals WHERE status='active';`),
  ]);
  return {tasksCompleted, remindersCompleted, workoutSessions, studyMinutes:Math.round(studySeconds/60), expenseMinor, habitsCompleted, habitsTotal, activeGoals};
}

function dailyStreak(checkinKeys: string[], todayKey: string): number {
  const set=new Set(checkinKeys); let cursor=new Date(`${todayKey}T12:00:00`); let streak=0;
  if(!set.has(todayKey)){cursor.setDate(cursor.getDate()-1);}
  for(let i=0;i<366;i+=1){const key=dateKey(cursor); if(!set.has(key)) break; streak+=1; cursor.setDate(cursor.getDate()-1);} return streak;
}

class SQLiteProgressRepository implements ProgressRepository {
  async loadSnapshot(): Promise<ProgressSnapshot> {
    const today=dateKey(); const week=weekStart(); const weekEnd=new Date(week); weekEnd.setDate(weekEnd.getDate()+6);
    const [goalsR,milestonesR,habitsR,checkinsR,routinesR,stepsR,runsR,completionsR,reviewsR,todayMetrics,weekMetrics] = await Promise.all([
      database.execute(`SELECT * FROM goals ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, position, updated_at DESC;`),
      database.execute(`SELECT * FROM goal_milestones ORDER BY goal_id, position;`),
      database.execute(`SELECT * FROM habits WHERE active=1 ORDER BY position,name;`),
      database.execute(`SELECT * FROM habit_checkins WHERE completed=1 AND date_key >= ? ORDER BY date_key DESC;`,[dateKey(new Date(Date.now()-45*86400000))]),
      database.execute(`SELECT * FROM routines WHERE active=1 ORDER BY position,name;`),
      database.execute(`SELECT * FROM routine_steps ORDER BY routine_id,position;`),
      database.execute(`SELECT * FROM routine_runs WHERE date_key >= ? ORDER BY started_at DESC;`,[dateKey(new Date(Date.now()-14*86400000))]),
      database.execute(`SELECT * FROM routine_step_completions WHERE run_id IN (SELECT id FROM routine_runs WHERE date_key >= ?);`,[dateKey(new Date(Date.now()-14*86400000))]),
      database.execute(`SELECT * FROM life_reviews ORDER BY updated_at DESC LIMIT 40;`),
      metricsBetween(new Date(),new Date()), metricsBetween(week,weekEnd),
    ]);

    const goals:Goal[]=goalsR.rows.map(v=>{const r=row(v);return {id:text(r.id),title:text(r.title),description:text(r.description),area:text(r.area),status:text(r.status) as Goal['status'],targetValue:num(r.target_value),currentValue:num(r.current_value),unit:text(r.unit),dueAt:nullableText(r.due_at),position:num(r.position),completedAt:nullableText(r.completed_at),createdAt:text(r.created_at),updatedAt:text(r.updated_at)}});
    const milestones:GoalMilestone[]=milestonesR.rows.map(v=>{const r=row(v);return {id:text(r.id),goalId:text(r.goal_id),title:text(r.title),completed:bool(r.completed),position:num(r.position),completedAt:nullableText(r.completed_at)}});
    const checkins=checkinsR.rows.map(v=>{const r=row(v);return {habitId:text(r.habit_id),dateKey:text(r.date_key)}});
    const weekStartKey=dateKey(week), weekEndKey=dateKey(weekEnd);
    const habits:Habit[]=habitsR.rows.map(v=>{const r=row(v); const id=text(r.id); const keys=checkins.filter(c=>c.habitId===id).map(c=>c.dateKey); return {id,name:text(r.name),icon:text(r.icon),context:text(r.context),frequency:text(r.frequency) as Habit['frequency'],targetPerWeek:num(r.target_per_week),active:bool(r.active),position:num(r.position),currentStreak:dailyStreak(keys,today),weekCount:keys.filter(k=>k>=weekStartKey&&k<=weekEndKey).length,completedToday:keys.includes(today)}});
    const routines:Routine[]=routinesR.rows.map(v=>{const r=row(v);return {id:text(r.id),name:text(r.name),icon:text(r.icon),context:text(r.context),active:bool(r.active),position:num(r.position)}});
    const routineSteps:RoutineStep[]=stepsR.rows.map(v=>{const r=row(v);return {id:text(r.id),routineId:text(r.routine_id),title:text(r.title),position:num(r.position),estimatedMinutes:num(r.estimated_minutes),linkedHabitId:nullableText(r.linked_habit_id)}});
    const routineRuns:RoutineRun[]=runsR.rows.map(v=>{const r=row(v);return {id:text(r.id),routineId:text(r.routine_id),dateKey:text(r.date_key),status:text(r.status) as RoutineRun['status'],startedAt:text(r.started_at),endedAt:nullableText(r.ended_at)}});
    const routineStepCompletions:RoutineStepCompletion[]=completionsR.rows.map(v=>{const r=row(v);return {runId:text(r.run_id),stepId:text(r.step_id),completed:bool(r.completed),completedAt:nullableText(r.completed_at)}});
    const reviews:LifeReview[]=reviewsR.rows.map(v=>{const r=row(v);return {id:text(r.id),reviewType:text(r.review_type) as LifeReview['reviewType'],periodKey:text(r.period_key),rating:r.rating==null?null:num(r.rating),wins:text(r.wins),friction:text(r.friction),nextFocus:text(r.next_focus),createdAt:text(r.created_at),updatedAt:text(r.updated_at)}});

    const goalScore=goals.filter(g=>g.status==='active').length ? Math.round(goals.filter(g=>g.status==='active').reduce((sum,g)=>sum+Math.min(1,g.currentValue/g.targetValue),0)/goals.filter(g=>g.status==='active').length*100) : 100;
    const habitTargets=habits.reduce((sum,h)=>sum+h.targetPerWeek,0); const habitDone=habits.reduce((sum,h)=>sum+Math.min(h.weekCount,h.targetPerWeek),0); const habitScore=habitTargets?clamp(habitDone/habitTargets*100):100;
    const workScore=clamp(weekMetrics.tasksCompleted/10*100); const fitnessScore=clamp(weekMetrics.workoutSessions/4*100); const learningScore=clamp(weekMetrics.studyMinutes/300*100);
    const monthStart=new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const monthlyBudget=await scalar(`SELECT COALESCE(SUM(limit_minor),0) AS value FROM budgets WHERE month_key=?;`,[`${monthStart.getFullYear()}-${String(monthStart.getMonth()+1).padStart(2,'0')}`]);
    const monthExpense=await scalar(`SELECT COALESCE(SUM(amount_minor),0) AS value FROM transactions WHERE deleted_at IS NULL AND kind='expense' AND occurred_at>=?;`,[monthStart.toISOString()]);
    const moneyScore=monthlyBudget>0?clamp((1-Math.max(0,monthExpense-monthlyBudget)/monthlyBudget)*100):100;
    const total=clamp((workScore+moneyScore+fitnessScore+learningScore+habitScore+goalScore)/6);
    const lifeScore:LifeScore={total,work:workScore,money:moneyScore,fitness:fitnessScore,learning:learningScore,habits:habitScore,goals:goalScore};
    return {goals,milestones,habits,routines,routineSteps,routineRuns,routineStepCompletions,reviews,lifeScore,todayMetrics,weekMetrics};
  }

  async createGoal(input:CreateGoalInput):Promise<ProgressSnapshot>{
    const title=input.title.trim(); if(!title) throw new Error('Goal title is required.'); const now=new Date().toISOString();
    const target=Math.max(1,Math.round(input.targetValue??100));
    await database.execute(`INSERT INTO goals(id,title,description,area,status,target_value,current_value,unit,due_at,position,completed_at,created_at,updated_at) VALUES(?,?,?,?,'active',?,0,?,?,999,NULL,?,?);`,[createId('goal'),title,input.description?.trim()??'',input.area??'personal',target,input.unit?.trim()||'%',input.dueAt??null,now,now]);
    return this.loadSnapshot();
  }
  async updateGoalProgress(goalId:string,value:number,note=''):Promise<ProgressSnapshot>{
    const result=await database.execute(`SELECT target_value FROM goals WHERE id=? LIMIT 1;`,[goalId]); const target=num((result.rows[0] as Record<string,unknown>|undefined)?.target_value); if(!target) throw new Error('Goal not found.'); const next=Math.max(0,Math.round(value)); const now=new Date().toISOString();
    await database.transaction(async tx=>{await tx.execute(`UPDATE goals SET current_value=?,status=?,completed_at=?,updated_at=? WHERE id=?;`,[next,next>=target?'completed':'active',next>=target?now:null,now,goalId]); await tx.execute(`INSERT INTO goal_progress_logs(id,goal_id,value,note,logged_at,created_at) VALUES(?,?,?,?,?,?);`,[createId('goal_log'),goalId,next,note.trim()||null,now,now]);}); return this.loadSnapshot();
  }
  async toggleMilestone(milestoneId:string):Promise<ProgressSnapshot>{const result=await database.execute(`SELECT completed FROM goal_milestones WHERE id=? LIMIT 1;`,[milestoneId]); const current=bool((result.rows[0] as Record<string,unknown>|undefined)?.completed); const now=new Date().toISOString(); await database.execute(`UPDATE goal_milestones SET completed=?,completed_at=?,updated_at=? WHERE id=?;`,[current?0:1,current?null:now,now,milestoneId]); return this.loadSnapshot();}
  async createHabit(input:CreateHabitInput):Promise<ProgressSnapshot>{const name=input.name.trim();if(!name)throw new Error('Habit name is required.');const now=new Date().toISOString();const target=Math.max(1,Math.min(7,Math.round(input.targetPerWeek??(input.frequency==='weekly'?1:7))));await database.execute(`INSERT INTO habits(id,name,icon,context,frequency,target_per_week,active,position,created_at,updated_at) VALUES(?,?,?,?,?,?,1,999,?,?);`,[createId('habit'),name,input.icon?.trim()||'✓',input.context??'personal',input.frequency??'daily',target,now,now]);return this.loadSnapshot();}
  async toggleHabitToday(habitId:string):Promise<ProgressSnapshot>{const key=dateKey(),now=new Date().toISOString();const result=await database.execute(`SELECT id,completed FROM habit_checkins WHERE habit_id=? AND date_key=? LIMIT 1;`,[habitId,key]);if(result.rows.length){const r=row(result.rows[0]);const next=bool(r.completed)?0:1;await database.execute(`UPDATE habit_checkins SET completed=?,updated_at=? WHERE id=?;`,[next,now,text(r.id)]);}else{await database.execute(`INSERT INTO habit_checkins(id,habit_id,date_key,completed,value,note,created_at,updated_at) VALUES(?,?,?,1,1,NULL,?,?);`,[createId('checkin'),habitId,key,now,now]);}return this.loadSnapshot();}
  async startRoutine(routineId:string):Promise<ProgressSnapshot>{const key=dateKey();const existing=await database.execute(`SELECT id FROM routine_runs WHERE routine_id=? AND date_key=? AND status='active' LIMIT 1;`,[routineId,key]);if(existing.rows.length)return this.loadSnapshot();const now=new Date().toISOString(),runId=createId('routine_run');await database.transaction(async tx=>{await tx.execute(`INSERT INTO routine_runs(id,routine_id,date_key,status,started_at,ended_at,created_at,updated_at) VALUES(?,?,?,'active',?,NULL,?,?);`,[runId,routineId,key,now,now,now]);const steps=await tx.execute(`SELECT id FROM routine_steps WHERE routine_id=? ORDER BY position;`,[routineId]);for(const value of steps.rows){await tx.execute(`INSERT INTO routine_step_completions(run_id,step_id,completed,completed_at,updated_at) VALUES(?,?,0,NULL,?);`,[runId,text(row(value).id),now]);}});return this.loadSnapshot();}
  async toggleRoutineStep(runId:string,stepId:string):Promise<ProgressSnapshot>{const result=await database.execute(`SELECT completed FROM routine_step_completions WHERE run_id=? AND step_id=? LIMIT 1;`,[runId,stepId]);if(!result.rows.length)throw new Error('Routine step not found.');const current=bool(row(result.rows[0]).completed),now=new Date().toISOString();await database.execute(`UPDATE routine_step_completions SET completed=?,completed_at=?,updated_at=? WHERE run_id=? AND step_id=?;`,[current?0:1,current?null:now,now,runId,stepId]);return this.loadSnapshot();}
  async finishRoutine(runId:string):Promise<ProgressSnapshot>{const now=new Date().toISOString();await database.transaction(async tx=>{const result=await tx.execute(`SELECT rs.linked_habit_id FROM routine_step_completions c JOIN routine_steps rs ON rs.id=c.step_id WHERE c.run_id=? AND c.completed=1 AND rs.linked_habit_id IS NOT NULL;`,[runId]);for(const value of result.rows){const habitId=text(row(value).linked_habit_id);await tx.execute(`INSERT INTO habit_checkins(id,habit_id,date_key,completed,value,note,created_at,updated_at) VALUES(?,?,?,1,1,'Completed through routine',?,?) ON CONFLICT(habit_id,date_key) DO UPDATE SET completed=1,updated_at=excluded.updated_at;`,[createId('checkin'),habitId,dateKey(),now,now]);}await tx.execute(`UPDATE routine_runs SET status='completed',ended_at=?,updated_at=? WHERE id=? AND status='active';`,[now,now,runId]);});return this.loadSnapshot();}
  async cancelRoutine(runId:string):Promise<ProgressSnapshot>{const now=new Date().toISOString();await database.execute(`UPDATE routine_runs SET status='cancelled',ended_at=?,updated_at=? WHERE id=? AND status='active';`,[now,now,runId]);return this.loadSnapshot();}
  async saveReview(input:SaveReviewInput):Promise<ProgressSnapshot>{const now=new Date().toISOString();await database.execute(`INSERT INTO life_reviews(id,review_type,period_key,rating,wins,friction,next_focus,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(review_type,period_key) DO UPDATE SET rating=excluded.rating,wins=excluded.wins,friction=excluded.friction,next_focus=excluded.next_focus,updated_at=excluded.updated_at;`,[createId('review'),input.reviewType,input.periodKey,input.rating,input.wins.trim(),input.friction.trim(),input.nextFocus.trim(),now,now]);return this.loadSnapshot();}
}
export const progressRepository:ProgressRepository=new SQLiteProgressRepository();
