export type Exercise = {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  instructions: string;
  imageKey: string;
  defaultRestSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutRoutine = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type RoutineExercise = {
  routineId: string;
  exerciseId: string;
  position: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  notes: string | null;
};

export type WorkoutSessionStatus = 'active' | 'completed' | 'cancelled';

export type WorkoutSession = {
  id: string;
  routineId: string | null;
  title: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutSet = {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightGrams: number;
  reps: number;
  completed: boolean;
  rpe: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GymSnapshot = {
  exercises: Exercise[];
  routines: WorkoutRoutine[];
  routineExercises: RoutineExercise[];
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
};

export type UpdateWorkoutSetInput = {
  setId: string;
  weightGrams: number;
  reps: number;
  completed: boolean;
};
