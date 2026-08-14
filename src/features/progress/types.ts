export type GoalStatus = 'active' | 'completed' | 'paused';
export type GoalArea = 'personal' | 'work' | 'money' | 'fitness' | 'learning';
export type HabitFrequency = 'daily' | 'weekly';
export type ReviewType = 'daily' | 'weekly';

export type Goal = {
  id: string;
  title: string;
  description: string;
  area: GoalArea | string;
  status: GoalStatus;
  targetValue: number;
  currentValue: number;
  unit: string;
  dueAt: string | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoalMilestone = {
  id: string;
  goalId: string;
  title: string;
  completed: boolean;
  position: number;
  completedAt: string | null;
};

export type Habit = {
  id: string;
  name: string;
  icon: string;
  context: string;
  frequency: HabitFrequency;
  targetPerWeek: number;
  active: boolean;
  position: number;
  currentStreak: number;
  weekCount: number;
  completedToday: boolean;
};

export type Routine = {
  id: string;
  name: string;
  icon: string;
  context: string;
  active: boolean;
  position: number;
};

export type RoutineStep = {
  id: string;
  routineId: string;
  title: string;
  position: number;
  estimatedMinutes: number;
  linkedHabitId: string | null;
};

export type RoutineRun = {
  id: string;
  routineId: string;
  dateKey: string;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: string;
  endedAt: string | null;
};

export type RoutineStepCompletion = {
  runId: string;
  stepId: string;
  completed: boolean;
  completedAt: string | null;
};

export type LifeReview = {
  id: string;
  reviewType: ReviewType;
  periodKey: string;
  rating: number | null;
  wins: string;
  friction: string;
  nextFocus: string;
  createdAt: string;
  updatedAt: string;
};

export type LifeScore = {
  total: number;
  work: number;
  money: number;
  fitness: number;
  learning: number;
  habits: number;
  goals: number;
};

export type ReviewMetrics = {
  tasksCompleted: number;
  remindersCompleted: number;
  workoutSessions: number;
  studyMinutes: number;
  expenseMinor: number;
  habitsCompleted: number;
  habitsTotal: number;
  activeGoals: number;
};

export type ProgressSnapshot = {
  goals: Goal[];
  milestones: GoalMilestone[];
  habits: Habit[];
  routines: Routine[];
  routineSteps: RoutineStep[];
  routineRuns: RoutineRun[];
  routineStepCompletions: RoutineStepCompletion[];
  reviews: LifeReview[];
  lifeScore: LifeScore;
  todayMetrics: ReviewMetrics;
  weekMetrics: ReviewMetrics;
};

export type CreateGoalInput = {title: string; description?: string; area?: GoalArea | string; targetValue?: number; unit?: string; dueAt?: string | null};
export type CreateHabitInput = {name: string; icon?: string; context?: string; frequency?: HabitFrequency; targetPerWeek?: number};
export type SaveReviewInput = {reviewType: ReviewType; periodKey: string; rating: number | null; wins: string; friction: string; nextFocus: string};
