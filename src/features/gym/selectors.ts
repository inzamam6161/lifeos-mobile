import type {RootState} from '../../app/store';

export const selectActiveWorkout = (state: RootState) => state.gym.sessions.find(item => item.status === 'active') ?? null;
export const selectCompletedWorkouts = (state: RootState) => state.gym.sessions.filter(item => item.status === 'completed');

export function selectGymSummary(state: RootState) {
  const completed = selectCompletedWorkouts(state);
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const weekSessions = completed.filter(item => new Date(item.startedAt).getTime() >= start.getTime());
  const completedSessionIds = new Set(completed.map(item => item.id));
  const completedSets = state.gym.sets.filter(item => item.completed && completedSessionIds.has(item.sessionId));
  const totalVolumeKg = completedSets.reduce((sum, item) => sum + (item.weightGrams / 1000) * item.reps, 0);
  return {weekSessions: weekSessions.length, totalSessions: completed.length, totalVolumeKg};
}

export function bestSetForExercise(state: RootState, exerciseId: string, excludeSessionId?: string) {
  const validSessionIds = new Set(state.gym.sessions.filter(item => item.status === 'completed' && item.id !== excludeSessionId).map(item => item.id));
  const sets = state.gym.sets.filter(item => item.exerciseId === exerciseId && item.completed && validSessionIds.has(item.sessionId));
  if (!sets.length) return null;
  return [...sets].sort((a, b) => b.weightGrams - a.weightGrams || b.reps - a.reps)[0];
}
