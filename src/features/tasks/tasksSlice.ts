import {createAsyncThunk, createEntityAdapter, createSlice} from '@reduxjs/toolkit';
import {taskRepository} from '../../data/repositories/taskRepository';
import {CreateTaskInput, Task, UpdateTaskInput} from './types';

const tasksAdapter = createEntityAdapter<Task>({
  sortComparer: (a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    if (a.columnId === b.columnId) return a.sortOrder - b.sortOrder;
    return b.updatedAt.localeCompare(a.updatedAt);
  },
});

export const loadTasks = createAsyncThunk('tasks/load', async () => taskRepository.listActive());

export const addTask = createAsyncThunk(
  'tasks/add',
  async (input: CreateTaskInput) => taskRepository.create(input),
);

export const updateTask = createAsyncThunk(
  'tasks/update',
  async (input: UpdateTaskInput) => taskRepository.update(input),
);

export const moveTask = createAsyncThunk(
  'tasks/move',
  async ({id, columnId}: {id: string; columnId: string}) =>
    taskRepository.moveToColumn(id, columnId),
);

export const reorderTask = createAsyncThunk(
  'tasks/reorder',
  async ({id, direction}: {id: string; direction: 'up' | 'down'}) =>
    taskRepository.reorder(id, direction),
);

export const toggleTask = createAsyncThunk(
  'tasks/toggle',
  async ({id, completed}: {id: string; completed: boolean}) =>
    taskRepository.setCompleted(id, completed),
);

export const deleteTask = createAsyncThunk('tasks/delete', async (id: string) => {
  await taskRepository.softDelete(id);
  return id;
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: tasksAdapter.getInitialState({
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
    error: null as string | null,
  }),
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadTasks.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadTasks.fulfilled, (state, action) => {
        tasksAdapter.setAll(state, action.payload);
        state.status = 'ready';
      })
      .addCase(loadTasks.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Unable to load tasks.';
      })
      .addCase(addTask.fulfilled, tasksAdapter.addOne)
      .addCase(updateTask.fulfilled, tasksAdapter.upsertOne)
      .addCase(moveTask.fulfilled, tasksAdapter.upsertOne)
      .addCase(reorderTask.fulfilled, (state, action) => {
        tasksAdapter.upsertMany(state, action.payload);
      })
      .addCase(toggleTask.fulfilled, tasksAdapter.upsertOne)
      .addCase(deleteTask.fulfilled, tasksAdapter.removeOne);
  },
});

export const tasksReducer = tasksSlice.reducer;
export {tasksAdapter};
