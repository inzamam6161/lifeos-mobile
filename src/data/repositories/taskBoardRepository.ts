import {database} from '../database/client';
import {createId} from '../../utils/createId';
import {localDateKey} from '../../utils/dateTime';
import {
  Board,
  BoardColumn,
  Label,
  Subtask,
  TaskContext,
  TaskStatus,
  TaskSystemSnapshot,
  Workspace,
} from '../../features/tasks/types';
import {TaskBoardRepository} from './TaskBoardRepositoryContract';

type WorkspaceRow = {id: string; name: string; icon: string; position: number};
type BoardRow = {id: string; workspace_id: string; name: string; context: TaskContext; icon: string; position: number};
type ColumnRow = {id: string; board_id: string; title: string; semantic_status: TaskStatus; position: number};
type LabelRow = {id: string; name: string; tone: Label['tone']};
type SubtaskRow = {id: string; task_id: string; title: string; completed: number; position: number; created_at: string; updated_at: string};

const mapWorkspace = (row: WorkspaceRow): Workspace => ({...row});
const mapBoard = (row: BoardRow): Board => ({id: row.id, workspaceId: row.workspace_id, name: row.name, context: row.context, icon: row.icon, position: Number(row.position)});
const mapColumn = (row: ColumnRow): BoardColumn => ({id: row.id, boardId: row.board_id, title: row.title, semanticStatus: row.semantic_status, position: Number(row.position)});
const mapLabel = (row: LabelRow): Label => ({...row});
const mapSubtask = (row: SubtaskRow): Subtask => ({id: row.id, taskId: row.task_id, title: row.title, completed: Boolean(row.completed), position: Number(row.position), createdAt: row.created_at, updatedAt: row.updated_at});

class SQLiteTaskBoardRepository implements TaskBoardRepository {
  async loadSnapshot(): Promise<TaskSystemSnapshot> {
    let snapshot: TaskSystemSnapshot = {workspaces: [], boards: [], columns: [], labels: [], subtasks: [], taskLabels: {}};
    await database.transaction(async tx => {
      const workspaceResult = await tx.execute('SELECT id, name, icon, position FROM workspaces ORDER BY position;');
      const boardResult = await tx.execute('SELECT id, workspace_id, name, context, icon, position FROM boards ORDER BY position;');
      const columnResult = await tx.execute('SELECT id, board_id, title, semantic_status, position FROM board_columns ORDER BY board_id, position;');
      const labelResult = await tx.execute('SELECT id, name, tone FROM labels ORDER BY name;');
      const subtaskResult = await tx.execute('SELECT id, task_id, title, completed, position, created_at, updated_at FROM subtasks ORDER BY task_id, position;');
      const taskLabelResult = await tx.execute('SELECT task_id, label_id FROM task_labels ORDER BY created_at;');
      const taskLabels: Record<string, string[]> = {};
      for (const raw of taskLabelResult.rows as unknown as {task_id: string; label_id: string}[]) {
        taskLabels[raw.task_id] = [...(taskLabels[raw.task_id] ?? []), raw.label_id];
      }
      snapshot = {
        workspaces: (workspaceResult.rows as unknown as WorkspaceRow[]).map(mapWorkspace),
        boards: (boardResult.rows as unknown as BoardRow[]).map(mapBoard),
        columns: (columnResult.rows as unknown as ColumnRow[]).map(mapColumn),
        labels: (labelResult.rows as unknown as LabelRow[]).map(mapLabel),
        subtasks: (subtaskResult.rows as unknown as SubtaskRow[]).map(mapSubtask),
        taskLabels,
      };
    });
    return snapshot;
  }

  async addSubtask(taskId: string, title: string): Promise<Subtask> {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('Subtask title is required.');
    const now = new Date().toISOString();
    const subtask: Subtask = {id: createId('subtask'), taskId, title: trimmed, completed: false, position: Date.now(), createdAt: now, updatedAt: now};
    await database.transaction(async tx => {
      await tx.execute(
        `INSERT INTO subtasks(id, task_id, title, completed, position, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?, ?);`,
        [subtask.id, taskId, subtask.title, subtask.position, now, now],
      );
    });
    return subtask;
  }

  async toggleSubtask(id: string, completed: boolean): Promise<Subtask> {
    const now = new Date().toISOString();
    let row: SubtaskRow | undefined;
    await database.transaction(async tx => {
      await tx.execute('UPDATE subtasks SET completed = ?, updated_at = ? WHERE id = ?;', [completed ? 1 : 0, now, id]);
      const result = await tx.execute('SELECT id, task_id, title, completed, position, created_at, updated_at FROM subtasks WHERE id = ? LIMIT 1;', [id]);
      row = result.rows[0] as unknown as SubtaskRow | undefined;
    });
    if (!row) throw new Error('Subtask not found.');
    return mapSubtask(row);
  }

  async attachLabel(taskId: string, labelId: string): Promise<void> {
    await database.transaction(async tx => {
      await tx.execute('INSERT OR IGNORE INTO task_labels(task_id, label_id, created_at) VALUES (?, ?, ?);', [taskId, labelId, new Date().toISOString()]);
    });
  }

  async detachLabel(taskId: string, labelId: string): Promise<void> {
    await database.transaction(async tx => {
      await tx.execute('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?;', [taskId, labelId]);
    });
  }

  async recordFocusSession(taskId: string | null, startedAt: string, endedAt: string, durationSeconds: number): Promise<void> {
    await database.transaction(async tx => {
      await tx.execute(
        `INSERT INTO focus_sessions(id, task_id, started_at, ended_at, duration_seconds, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [createId('focus'), taskId, startedAt, endedAt, Math.max(0, Math.round(durationSeconds)), new Date().toISOString()],
      );
      if (durationSeconds >= 5 * 60) {
        const now = new Date().toISOString();
        await tx.execute(
          `INSERT INTO habit_checkins(id, habit_id, date_key, completed, value, note, created_at, updated_at)
           SELECT ?, id, ?, 1, 1, 'Completed through Work focus', ?, ? FROM habits WHERE id = 'habit_deep_work'
           ON CONFLICT(habit_id, date_key) DO UPDATE SET completed = 1, updated_at = excluded.updated_at;`,
          [createId('checkin'), localDateKey(), now, now],
        );
      }
    });
  }
}

export const taskBoardRepository: TaskBoardRepository = new SQLiteTaskBoardRepository();
