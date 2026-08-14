import {database} from '../database/client';
import {
  CreateTaskInput,
  Task,
  TaskContext,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from '../../features/tasks/types';
import {createId} from '../../utils/createId';
import {TaskRepository} from './TaskRepositoryContract';

type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  context: TaskContext;
  due_at: string | null;
  start_at: string | null;
  sort_order: number;
  priority: TaskPriority;
  estimate_minutes: number | null;
  board_id: string | null;
  column_id: string | null;
  completed_at: string | null;
  version: number;
  sync_state: Task['syncState'];
  created_at: string;
  updated_at: string;
};

const taskSelect = `SELECT id, title, notes, status, context, due_at, start_at, sort_order,
  priority, estimate_minutes, board_id, column_id, completed_at, version,
  sync_state, created_at, updated_at
  FROM tasks`;

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    context: row.context,
    dueAt: row.due_at,
    startAt: row.start_at,
    sortOrder: Number(row.sort_order),
    priority: row.priority,
    estimateMinutes: row.estimate_minutes == null ? null : Number(row.estimate_minutes),
    boardId: row.board_id,
    columnId: row.column_id,
    completedAt: row.completed_at,
    version: Number(row.version),
    syncState: row.sync_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getTask(id: string): Promise<Task> {
  let row: TaskRow | undefined;
  await database.transaction(async tx => {
    const result = await tx.execute(`${taskSelect} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`, [id]);
    row = result.rows[0] as unknown as TaskRow | undefined;
  });
  if (!row) throw new Error('Task not found.');
  return mapTask(row);
}

async function resolveDefaultPlacement(context: TaskContext) {
  const boardId = context === 'work' ? 'board_work' : context === 'study' ? 'board_study' : 'board_personal';
  const columnId = context === 'work' ? 'column_work_todo' : context === 'study' ? 'column_study_todo' : 'column_personal_todo';
  return {boardId, columnId};
}

class SQLiteTaskRepository implements TaskRepository {
  async listActive(): Promise<Task[]> {
    let rows: TaskRow[] = [];
    await database.transaction(async tx => {
      const result = await tx.execute(
        `${taskSelect}
         WHERE deleted_at IS NULL
         ORDER BY CASE status WHEN 'done' THEN 1 ELSE 0 END,
                  sort_order ASC,
                  updated_at DESC;`,
      );
      rows = result.rows as unknown as TaskRow[];
    });
    return rows.map(mapTask);
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const title = input.title.trim();
    if (!title) throw new Error('Task title is required.');

    const context = input.context ?? 'personal';
    const defaultPlacement = await resolveDefaultPlacement(context);
    const boardId = input.boardId ?? defaultPlacement.boardId;
    const columnId = input.columnId ?? defaultPlacement.columnId;
    const now = new Date().toISOString();

    let sortOrder = Date.now();
    let initialStatus: TaskStatus = 'todo';
    await database.transaction(async tx => {
      const columnResult = await tx.execute(
        'SELECT semantic_status FROM board_columns WHERE id = ? LIMIT 1;',
        [columnId],
      );
      initialStatus = (columnResult.rows[0] as {semantic_status?: TaskStatus} | undefined)?.semantic_status ?? 'todo';
      const result = await tx.execute(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM tasks WHERE column_id = ? AND deleted_at IS NULL;',
        [columnId],
      );
      sortOrder = Number((result.rows[0] as {next_order?: number} | undefined)?.next_order ?? Date.now());
    });

    const task: Task = {
      id: createId('task'),
      title,
      notes: input.notes?.trim() || null,
      status: initialStatus,
      context,
      dueAt: input.dueAt ?? null,
      startAt: input.startAt ?? null,
      sortOrder,
      priority: input.priority ?? 'medium',
      estimateMinutes: input.estimateMinutes ?? null,
      boardId,
      columnId,
      completedAt: null,
      version: 1,
      syncState: 'local',
      createdAt: now,
      updatedAt: now,
    };

    await database.transaction(async tx => {
      await tx.execute(
        `INSERT INTO tasks(
          id, title, notes, status, context, due_at, start_at, sort_order, version,
          sync_state, created_at, updated_at, deleted_at, board_id, column_id,
          priority, estimate_minutes, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL);`,
        [
          task.id, task.title, task.notes, task.status, task.context, task.dueAt, task.startAt,
          task.sortOrder, task.version, task.syncState, task.createdAt, task.updatedAt,
          task.boardId, task.columnId, task.priority, task.estimateMinutes,
        ],
      );
    });

    return task;
  }

  async update(input: UpdateTaskInput): Promise<Task> {
    const existing = await getTask(input.id);
    const title = input.title === undefined ? existing.title : input.title.trim();
    if (!title) throw new Error('Task title is required.');
    const now = new Date().toISOString();

    await database.transaction(async tx => {
      await tx.execute(
        `UPDATE tasks SET title = ?, notes = ?, due_at = ?, start_at = ?, priority = ?, estimate_minutes = ?,
         updated_at = ?, version = version + 1, sync_state = 'local'
         WHERE id = ? AND deleted_at IS NULL;`,
        [
          title,
          input.notes === undefined ? existing.notes : input.notes,
          input.dueAt === undefined ? existing.dueAt : input.dueAt,
          input.startAt === undefined ? existing.startAt : input.startAt,
          input.priority ?? existing.priority,
          input.estimateMinutes === undefined ? existing.estimateMinutes : input.estimateMinutes,
          now,
          input.id,
        ],
      );
    });
    return getTask(input.id);
  }

  async setCompleted(id: string, completed: boolean): Promise<Task> {
    const existing = await getTask(id);
    const doneColumn = existing.boardId
      ? await this.findColumnByStatus(existing.boardId, completed ? 'done' : 'todo')
      : null;
    if (doneColumn) return this.moveToColumn(id, doneColumn);

    const status: TaskStatus = completed ? 'done' : 'todo';
    const updatedAt = new Date().toISOString();
    await database.transaction(async tx => {
      await tx.execute(
        `UPDATE tasks SET status = ?, completed_at = ?, updated_at = ?, version = version + 1,
         sync_state = 'local' WHERE id = ? AND deleted_at IS NULL;`,
        [status, completed ? updatedAt : null, updatedAt, id],
      );
    });
    return getTask(id);
  }

  private async findColumnByStatus(boardId: string, status: TaskStatus): Promise<string | null> {
    let id: string | null = null;
    await database.transaction(async tx => {
      const result = await tx.execute(
        `SELECT id FROM board_columns WHERE board_id = ? AND semantic_status = ? ORDER BY position LIMIT 1;`,
        [boardId, status],
      );
      id = (result.rows[0] as {id?: string} | undefined)?.id ?? null;
    });
    return id;
  }

  async moveToColumn(id: string, columnId: string): Promise<Task> {
    let status: TaskStatus | null = null;
    let boardId: string | null = null;
    let sortOrder = Date.now();
    await database.transaction(async tx => {
      const columnResult = await tx.execute(
        `SELECT board_id, semantic_status FROM board_columns WHERE id = ? LIMIT 1;`,
        [columnId],
      );
      const column = columnResult.rows[0] as {board_id?: string; semantic_status?: TaskStatus} | undefined;
      if (!column?.board_id || !column.semantic_status) throw new Error('Board column not found.');
      boardId = column.board_id;
      status = column.semantic_status;
      const orderResult = await tx.execute(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM tasks WHERE column_id = ? AND deleted_at IS NULL;',
        [columnId],
      );
      sortOrder = Number((orderResult.rows[0] as {next_order?: number} | undefined)?.next_order ?? Date.now());
      const now = new Date().toISOString();
      await tx.execute(
        `UPDATE tasks SET board_id = ?, column_id = ?, status = ?, sort_order = ?, completed_at = ?,
         updated_at = ?, version = version + 1, sync_state = 'local'
         WHERE id = ? AND deleted_at IS NULL;`,
        [boardId, columnId, status, sortOrder, status === 'done' ? now : null, now, id],
      );
    });
    return getTask(id);
  }

  async reorder(id: string, direction: 'up' | 'down'): Promise<Task[]> {
    const task = await getTask(id);
    if (!task.columnId) return [task];
    let neighborId: string | null = null;
    let neighborOrder = 0;
    await database.transaction(async tx => {
      const comparator = direction === 'up' ? '<' : '>';
      const ordering = direction === 'up' ? 'DESC' : 'ASC';
      const result = await tx.execute(
        `SELECT id, sort_order FROM tasks
         WHERE column_id = ? AND deleted_at IS NULL AND sort_order ${comparator} ?
         ORDER BY sort_order ${ordering} LIMIT 1;`,
        [task.columnId, task.sortOrder],
      );
      const row = result.rows[0] as {id?: string; sort_order?: number} | undefined;
      neighborId = row?.id ?? null;
      neighborOrder = Number(row?.sort_order ?? 0);
      if (!neighborId) return;
      const now = new Date().toISOString();
      await tx.execute(
        `UPDATE tasks SET sort_order = ?, updated_at = ?, version = version + 1 WHERE id = ?;`,
        [neighborOrder, now, id],
      );
      await tx.execute(
        `UPDATE tasks SET sort_order = ?, updated_at = ?, version = version + 1 WHERE id = ?;`,
        [task.sortOrder, now, neighborId],
      );
    });
    if (!neighborId) return [task];
    return [await getTask(id), await getTask(neighborId)];
  }

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await database.transaction(async tx => {
      await tx.execute(
        `UPDATE tasks SET deleted_at = ?, updated_at = ?, version = version + 1,
         sync_state = 'local' WHERE id = ?;`,
        [now, now, id],
      );
    });
  }
}

export const taskRepository: TaskRepository = new SQLiteTaskRepository();
