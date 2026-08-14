import {CreateTaskInput, Task, UpdateTaskInput} from '../../features/tasks/types';

export interface TaskRepository {
  listActive(): Promise<Task[]>;
  create(input: CreateTaskInput): Promise<Task>;
  update(input: UpdateTaskInput): Promise<Task>;
  setCompleted(id: string, completed: boolean): Promise<Task>;
  moveToColumn(id: string, columnId: string): Promise<Task>;
  reorder(id: string, direction: 'up' | 'down'): Promise<Task[]>;
  softDelete(id: string): Promise<void>;
}
