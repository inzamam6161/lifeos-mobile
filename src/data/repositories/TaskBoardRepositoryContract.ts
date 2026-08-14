import {Subtask, TaskSystemSnapshot} from '../../features/tasks/types';

export interface TaskBoardRepository {
  loadSnapshot(): Promise<TaskSystemSnapshot>;
  addSubtask(taskId: string, title: string): Promise<Subtask>;
  toggleSubtask(id: string, completed: boolean): Promise<Subtask>;
  attachLabel(taskId: string, labelId: string): Promise<void>;
  detachLabel(taskId: string, labelId: string): Promise<void>;
  recordFocusSession(taskId: string | null, startedAt: string, endedAt: string, durationSeconds: number): Promise<void>;
}
