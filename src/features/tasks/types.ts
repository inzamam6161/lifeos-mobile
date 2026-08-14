export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskContext = 'personal' | 'work' | 'study' | 'gym' | 'shopping';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  context: TaskContext;
  dueAt: string | null;
  startAt: string | null;
  sortOrder: number;
  priority: TaskPriority;
  estimateMinutes: number | null;
  boardId: string | null;
  columnId: string | null;
  completedAt: string | null;
  version: number;
  syncState: 'local' | 'dirty' | 'synced';
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  title: string;
  notes?: string;
  context?: TaskContext;
  dueAt?: string;
  startAt?: string;
  priority?: TaskPriority;
  estimateMinutes?: number;
  boardId?: string;
  columnId?: string;
};

export type UpdateTaskInput = {
  id: string;
  title?: string;
  notes?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: TaskPriority;
  estimateMinutes?: number | null;
};

export type Workspace = {
  id: string;
  name: string;
  icon: string;
  position: number;
};

export type Board = {
  id: string;
  workspaceId: string;
  name: string;
  context: TaskContext;
  icon: string;
  position: number;
};

export type BoardColumn = {
  id: string;
  boardId: string;
  title: string;
  semanticStatus: TaskStatus;
  position: number;
};

export type Label = {
  id: string;
  name: string;
  tone: 'blue' | 'purple' | 'green' | 'orange' | 'red';
};

export type Subtask = {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskSystemSnapshot = {
  workspaces: Workspace[];
  boards: Board[];
  columns: BoardColumn[];
  labels: Label[];
  subtasks: Subtask[];
  taskLabels: Record<string, string[]>;
};
