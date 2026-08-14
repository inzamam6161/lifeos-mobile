import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {gymRepository} from '../../data/repositories/gymRepository';
import type {GymSnapshot, UpdateWorkoutSetInput} from './types';

type GymState = GymSnapshot & {loading: boolean; error: string | null};
const initialState: GymState = {exercises: [], routines: [], routineExercises: [], sessions: [], sets: [], loading: false, error: null};

export const loadGym = createAsyncThunk('gym/load', () => gymRepository.loadSnapshot());
export const startWorkout = createAsyncThunk('gym/startWorkout', (routineId: string) => gymRepository.startWorkout(routineId));
export const updateWorkoutSet = createAsyncThunk('gym/updateSet', (input: UpdateWorkoutSetInput) => gymRepository.updateSet(input));
export const finishWorkout = createAsyncThunk('gym/finishWorkout', (sessionId: string) => gymRepository.finishWorkout(sessionId));
export const cancelWorkout = createAsyncThunk('gym/cancelWorkout', (sessionId: string) => gymRepository.cancelWorkout(sessionId));

const slice = createSlice({
  name: 'gym', initialState, reducers: {},
  extraReducers: builder => {
    const pending = (state: GymState) => { state.loading = true; state.error = null; };
    const fulfilled = (state: GymState, action: {payload: GymSnapshot}) => {
      state.loading = false; state.error = null;
      state.exercises = action.payload.exercises;
      state.routines = action.payload.routines;
      state.routineExercises = action.payload.routineExercises;
      state.sessions = action.payload.sessions;
      state.sets = action.payload.sets;
    };
    const rejected = (state: GymState, action: {error: {message?: string}}) => { state.loading = false; state.error = action.error.message ?? 'Gym operation failed.'; };
    builder
      .addCase(loadGym.pending, pending).addCase(loadGym.fulfilled, fulfilled).addCase(loadGym.rejected, rejected)
      .addCase(startWorkout.pending, pending).addCase(startWorkout.fulfilled, fulfilled).addCase(startWorkout.rejected, rejected)
      .addCase(updateWorkoutSet.pending, pending).addCase(updateWorkoutSet.fulfilled, fulfilled).addCase(updateWorkoutSet.rejected, rejected)
      .addCase(finishWorkout.pending, pending).addCase(finishWorkout.fulfilled, fulfilled).addCase(finishWorkout.rejected, rejected)
      .addCase(cancelWorkout.pending, pending).addCase(cancelWorkout.fulfilled, fulfilled).addCase(cancelWorkout.rejected, rejected);
  },
});
export const gymReducer = slice.reducer;
