import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {progressRepository} from '../../data/repositories/progressRepository';
import type {CreateGoalInput, CreateHabitInput, ProgressSnapshot, SaveReviewInput} from './types';

type ProgressState=ProgressSnapshot&{loading:boolean;error:string|null};
const emptyScore={total:0,work:0,money:0,fitness:0,learning:0,habits:0,goals:0};
const emptyMetrics={tasksCompleted:0,remindersCompleted:0,workoutSessions:0,studyMinutes:0,expenseMinor:0,habitsCompleted:0,habitsTotal:0,activeGoals:0};
const initialState:ProgressState={goals:[],milestones:[],habits:[],routines:[],routineSteps:[],routineRuns:[],routineStepCompletions:[],reviews:[],lifeScore:emptyScore,todayMetrics:emptyMetrics,weekMetrics:emptyMetrics,loading:false,error:null};
const apply=(state:ProgressState,payload:ProgressSnapshot)=>{Object.assign(state,payload);state.loading=false;state.error=null;};
const pending=(state:ProgressState)=>{state.loading=true;state.error=null;};
const rejected=(state:ProgressState,action:{error:{message?:string}})=>{state.loading=false;state.error=action.error.message??'Progress operation failed.';};
export const loadProgress=createAsyncThunk('progress/load',()=>progressRepository.loadSnapshot());
export const createGoal=createAsyncThunk('progress/createGoal',(input:CreateGoalInput)=>progressRepository.createGoal(input));
export const updateGoalProgress=createAsyncThunk('progress/updateGoalProgress',(input:{goalId:string;value:number;note?:string})=>progressRepository.updateGoalProgress(input.goalId,input.value,input.note));
export const toggleGoalMilestone=createAsyncThunk('progress/toggleMilestone',(id:string)=>progressRepository.toggleMilestone(id));
export const createHabit=createAsyncThunk('progress/createHabit',(input:CreateHabitInput)=>progressRepository.createHabit(input));
export const toggleHabitToday=createAsyncThunk('progress/toggleHabitToday',(id:string)=>progressRepository.toggleHabitToday(id));
export const startRoutine=createAsyncThunk('progress/startRoutine',(id:string)=>progressRepository.startRoutine(id));
export const toggleRoutineStep=createAsyncThunk('progress/toggleRoutineStep',(input:{runId:string;stepId:string})=>progressRepository.toggleRoutineStep(input.runId,input.stepId));
export const finishRoutine=createAsyncThunk('progress/finishRoutine',(id:string)=>progressRepository.finishRoutine(id));
export const cancelRoutine=createAsyncThunk('progress/cancelRoutine',(id:string)=>progressRepository.cancelRoutine(id));
export const saveLifeReview=createAsyncThunk('progress/saveReview',(input:SaveReviewInput)=>progressRepository.saveReview(input));
const slice=createSlice({name:'progress',initialState,reducers:{},extraReducers:b=>{
  const thunks=[loadProgress,createGoal,updateGoalProgress,toggleGoalMilestone,createHabit,toggleHabitToday,startRoutine,toggleRoutineStep,finishRoutine,cancelRoutine,saveLifeReview] as const;
  thunks.forEach(t=>{b.addCase(t.pending,pending).addCase(t.fulfilled,(state,action)=>apply(state,action.payload)).addCase(t.rejected,rejected);});
}});
export const progressReducer=slice.reducer;
