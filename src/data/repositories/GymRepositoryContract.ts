import type {GymSnapshot, UpdateWorkoutSetInput} from '../../features/gym/types';

export interface GymRepository {
  loadSnapshot(): Promise<GymSnapshot>;
  startWorkout(routineId: string): Promise<GymSnapshot>;
  updateSet(input: UpdateWorkoutSetInput): Promise<GymSnapshot>;
  finishWorkout(sessionId: string): Promise<GymSnapshot>;
  cancelWorkout(sessionId: string): Promise<GymSnapshot>;
}
