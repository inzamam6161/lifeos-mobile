export type ModeType = 'work' | 'gym' | 'shopping';

export type RootStackParamList = {
  MainTabs: undefined;
  Mode: {mode: ModeType};
  TaskBoards: undefined;
  TaskBoard: {boardId: string};
  TaskDetail: {taskId: string};
  WorkMode: {taskId?: string};
  Reminders: undefined;
  ReminderEditor: {taskId?: string; title?: string; context?: 'personal' | 'work' | 'study' | 'gym' | 'shopping'};
  Money: undefined;
  TransactionEditor: undefined;
  Budgets: undefined;
  RecurringPayments: undefined;
  ShoppingMode: undefined;
  Gym: undefined;
  WorkoutSession: undefined;
  ExerciseLibrary: undefined;
  ExerciseDetail: {exerciseId: string};
  WorkoutHistory: undefined;
  Study: undefined;
  StudySubject: {subjectId: string};
  StudyMaterial: {materialId: string};
  StudyNoteEditor: {subjectId: string};
  Flashcards: undefined;
  StudySession: undefined;
  Goals: undefined;
  GoalDetail: {goalId: string};
  Habits: undefined;
  Routines: undefined;
  RoutineRun: {routineId: string};
  LifeReview: {type: 'daily' | 'weekly'};
  AIModel: undefined;
  Memory: undefined;
  Security: undefined;
  Backup: undefined;
  Diagnostics: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  Life: undefined;
  Assistant: undefined;
  Insights: undefined;
  You: undefined;
};
