import type {RootState} from '../../app/store';
export const selectProgress=(state:RootState)=>state.progress;
export const selectGoals=(state:RootState)=>state.progress.goals;
export const selectHabits=(state:RootState)=>state.progress.habits;
export const selectRoutines=(state:RootState)=>state.progress.routines;
export const selectLifeScore=(state:RootState)=>state.progress.lifeScore;
export const selectTodayProgress=(state:RootState)=>({habits:state.progress.habits,metrics:state.progress.todayMetrics,reviews:state.progress.reviews,lifeScore:state.progress.lifeScore});
