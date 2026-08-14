import {database} from '../database/client';
import type {
  Exercise,
  GymSnapshot,
  RoutineExercise,
  UpdateWorkoutSetInput,
  WorkoutRoutine,
  WorkoutSession,
  WorkoutSet,
} from '../../features/gym/types';
import {createId} from '../../utils/createId';
import {localDateKey} from '../../utils/dateTime';
import type {GymRepository} from './GymRepositoryContract';

type ExerciseRow = {
  id: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string;
  equipment: string;
  instructions: string;
  image_key: string;
  default_rest_seconds: number;
  created_at: string;
  updated_at: string;
};
type RoutineRow = {id: string; name: string; subtitle: string; icon: string; position: number; created_at: string; updated_at: string};
type RoutineExerciseRow = {routine_id: string; exercise_id: string; position: number; target_sets: number; target_reps_min: number; target_reps_max: number; rest_seconds: number; notes: string | null};
type SessionRow = {id: string; routine_id: string | null; title: string; status: WorkoutSession['status']; started_at: string; ended_at: string | null; duration_seconds: number | null; notes: string | null; created_at: string; updated_at: string};
type SetRow = {id: string; session_id: string; exercise_id: string; set_number: number; weight_grams: number; reps: number; completed: number; rpe: number | null; completed_at: string | null; created_at: string; updated_at: string};

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    primaryMuscle: row.primary_muscle,
    secondaryMuscles: row.secondary_muscles ? row.secondary_muscles.split(',').map(item => item.trim()).filter(Boolean) : [],
    equipment: row.equipment,
    instructions: row.instructions,
    imageKey: row.image_key,
    defaultRestSeconds: Number(row.default_rest_seconds),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapRoutine(row: RoutineRow): WorkoutRoutine {
  return {id: row.id, name: row.name, subtitle: row.subtitle, icon: row.icon, position: Number(row.position), createdAt: row.created_at, updatedAt: row.updated_at};
}
function mapRoutineExercise(row: RoutineExerciseRow): RoutineExercise {
  return {routineId: row.routine_id, exerciseId: row.exercise_id, position: Number(row.position), targetSets: Number(row.target_sets), targetRepsMin: Number(row.target_reps_min), targetRepsMax: Number(row.target_reps_max), restSeconds: Number(row.rest_seconds), notes: row.notes};
}
function mapSession(row: SessionRow): WorkoutSession {
  return {id: row.id, routineId: row.routine_id, title: row.title, status: row.status, startedAt: row.started_at, endedAt: row.ended_at, durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds), notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at};
}
function mapSet(row: SetRow): WorkoutSet {
  return {id: row.id, sessionId: row.session_id, exerciseId: row.exercise_id, setNumber: Number(row.set_number), weightGrams: Number(row.weight_grams), reps: Number(row.reps), completed: Boolean(row.completed), rpe: row.rpe == null ? null : Number(row.rpe), completedAt: row.completed_at, createdAt: row.created_at, updatedAt: row.updated_at};
}

class SQLiteGymRepository implements GymRepository {
  async loadSnapshot(): Promise<GymSnapshot> {
    let exercises: ExerciseRow[] = [];
    let routines: RoutineRow[] = [];
    let routineExercises: RoutineExerciseRow[] = [];
    let sessions: SessionRow[] = [];
    let sets: SetRow[] = [];
    await database.transaction(async tx => {
      exercises = (await tx.execute(`SELECT id, name, primary_muscle, secondary_muscles, equipment, instructions, image_key, default_rest_seconds, created_at, updated_at FROM exercises ORDER BY name;`)).rows as unknown as ExerciseRow[];
      routines = (await tx.execute(`SELECT id, name, subtitle, icon, position, created_at, updated_at FROM workout_routines ORDER BY position, name;`)).rows as unknown as RoutineRow[];
      routineExercises = (await tx.execute(`SELECT routine_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes FROM routine_exercises ORDER BY routine_id, position;`)).rows as unknown as RoutineExerciseRow[];
      sessions = (await tx.execute(`SELECT id, routine_id, title, status, started_at, ended_at, duration_seconds, notes, created_at, updated_at FROM workout_sessions ORDER BY started_at DESC LIMIT 100;`)).rows as unknown as SessionRow[];
      sets = (await tx.execute(`SELECT id, session_id, exercise_id, set_number, weight_grams, reps, completed, rpe, completed_at, created_at, updated_at FROM workout_sets ORDER BY created_at DESC LIMIT 2000;`)).rows as unknown as SetRow[];
    });
    return {
      exercises: exercises.map(mapExercise),
      routines: routines.map(mapRoutine),
      routineExercises: routineExercises.map(mapRoutineExercise),
      sessions: sessions.map(mapSession),
      sets: sets.map(mapSet),
    };
  }

  async startWorkout(routineId: string): Promise<GymSnapshot> {
    const now = new Date().toISOString();
    await database.transaction(async tx => {
      const active = await tx.execute(`SELECT id FROM workout_sessions WHERE status = 'active' LIMIT 1;`);
      if (active.rows.length > 0) throw new Error('Finish or cancel your active workout first.');
      const routineResult = await tx.execute(`SELECT id, name FROM workout_routines WHERE id = ? LIMIT 1;`, [routineId]);
      const routine = routineResult.rows[0] as {id?: string; name?: string} | undefined;
      if (!routine?.id) throw new Error('Workout routine not found.');
      const sessionId = createId('workout');
      await tx.execute(
        `INSERT INTO workout_sessions(id, routine_id, title, status, started_at, ended_at, duration_seconds, notes, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, NULL, NULL, NULL, ?, ?);`,
        [sessionId, routineId, routine.name ?? 'Workout', now, now, now],
      );
      const plan = await tx.execute(`SELECT exercise_id, target_sets FROM routine_exercises WHERE routine_id = ? ORDER BY position;`, [routineId]);
      for (const row of plan.rows as unknown as Array<{exercise_id: string; target_sets: number}>) {
        for (let setNumber = 1; setNumber <= Number(row.target_sets); setNumber += 1) {
          await tx.execute(
            `INSERT INTO workout_sets(id, session_id, exercise_id, set_number, weight_grams, reps, completed, rpe, completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, 0, 0, NULL, NULL, ?, ?);`,
            [createId('set'), sessionId, row.exercise_id, setNumber, now, now],
          );
        }
      }
    });
    return this.loadSnapshot();
  }

  async updateSet(input: UpdateWorkoutSetInput): Promise<GymSnapshot> {
    if (!Number.isSafeInteger(input.weightGrams) || input.weightGrams < 0) throw new Error('Invalid weight.');
    if (!Number.isSafeInteger(input.reps) || input.reps < 0 || input.reps > 500) throw new Error('Invalid reps.');
    const now = new Date().toISOString();
    await database.transaction(async tx => {
      const result = await tx.execute(
        `UPDATE workout_sets
         SET weight_grams = ?, reps = ?, completed = ?, completed_at = ?, updated_at = ?
         WHERE id = ?;`,
        [input.weightGrams, input.reps, input.completed ? 1 : 0, input.completed ? now : null, now, input.setId],
      );
      if (result.rowsAffected === 0) throw new Error('Workout set not found.');
    });
    return this.loadSnapshot();
  }

  async finishWorkout(sessionId: string): Promise<GymSnapshot> {
    const nowDate = new Date();
    const now = nowDate.toISOString();
    await database.transaction(async tx => {
      const result = await tx.execute(`SELECT started_at FROM workout_sessions WHERE id = ? AND status = 'active' LIMIT 1;`, [sessionId]);
      const row = result.rows[0] as {started_at?: string} | undefined;
      if (!row?.started_at) throw new Error('Active workout not found.');
      const completedSets = await tx.execute(`SELECT COUNT(*) AS count FROM workout_sets WHERE session_id = ? AND completed = 1;`, [sessionId]);
      const count = Number((completedSets.rows[0] as {count?: number} | undefined)?.count ?? 0);
      if (count === 0) throw new Error('Complete at least one set before finishing.');
      const durationSeconds = Math.max(1, Math.round((nowDate.getTime() - new Date(row.started_at).getTime()) / 1000));
      await tx.execute(
        `UPDATE workout_sessions SET status = 'completed', ended_at = ?, duration_seconds = ?, updated_at = ? WHERE id = ?;`,
        [now, durationSeconds, now, sessionId],
      );
      await tx.execute(
        `INSERT INTO habit_checkins(id, habit_id, date_key, completed, value, note, created_at, updated_at)
         SELECT ?, id, ?, 1, 1, 'Completed through Gym Mode', ?, ? FROM habits WHERE id = 'habit_train'
         ON CONFLICT(habit_id, date_key) DO UPDATE SET completed = 1, updated_at = excluded.updated_at;`,
        [createId('checkin'), localDateKey(nowDate), now, now],
      );
    });
    return this.loadSnapshot();
  }

  async cancelWorkout(sessionId: string): Promise<GymSnapshot> {
    const now = new Date().toISOString();
    await database.transaction(async tx => {
      await tx.execute(`UPDATE workout_sessions SET status = 'cancelled', ended_at = ?, updated_at = ? WHERE id = ? AND status = 'active';`, [now, now, sessionId]);
    });
    return this.loadSnapshot();
  }
}

export const gymRepository: GymRepository = new SQLiteGymRepository();
