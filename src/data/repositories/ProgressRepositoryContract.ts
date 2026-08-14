import type {CreateGoalInput, CreateHabitInput, ProgressSnapshot, SaveReviewInput} from '../../features/progress/types';

export interface ProgressRepository {
  loadSnapshot(): Promise<ProgressSnapshot>;
  createGoal(input: CreateGoalInput): Promise<ProgressSnapshot>;
  updateGoalProgress(goalId: string, value: number, note?: string): Promise<ProgressSnapshot>;
  toggleMilestone(milestoneId: string): Promise<ProgressSnapshot>;
  createHabit(input: CreateHabitInput): Promise<ProgressSnapshot>;
  toggleHabitToday(habitId: string): Promise<ProgressSnapshot>;
  startRoutine(routineId: string): Promise<ProgressSnapshot>;
  toggleRoutineStep(runId: string, stepId: string): Promise<ProgressSnapshot>;
  finishRoutine(runId: string): Promise<ProgressSnapshot>;
  cancelRoutine(runId: string): Promise<ProgressSnapshot>;
  saveReview(input: SaveReviewInput): Promise<ProgressSnapshot>;
}
