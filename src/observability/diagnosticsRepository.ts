import {database} from '../data/database/client';
import {createId} from '../utils/createId';
import {sanitizeDiagnosticText} from './sanitize';
import {
  DatabaseHealth,
  DiagnosticEvent,
  DiagnosticLevel,
  DiagnosticsSnapshot,
  PerformanceMetric,
} from './types';

type EventRow = {
  id: string;
  level: DiagnosticLevel;
  category: string;
  message: string;
  detail: string;
  created_at: string;
};

type MetricRow = {
  id: string;
  name: string;
  duration_ms: number;
  detail: string;
  created_at: string;
};

async function safeExecute(sql: string, params: unknown[] = []) {
  try {
    return await database.execute(sql, params);
  } catch {
    return null;
  }
}

export async function recordDiagnosticEvent(input: {
  level: DiagnosticLevel;
  category: string;
  message: string;
  detail?: string;
}) {
  await safeExecute(
    `INSERT INTO app_diagnostic_events
      (id, level, category, message, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      createId('diag'),
      input.level,
      sanitizeDiagnosticText(input.category),
      sanitizeDiagnosticText(input.message),
      sanitizeDiagnosticText(input.detail ?? ''),
      new Date().toISOString(),
    ],
  );
}

export async function recordPerformanceMetric(
  name: string,
  durationMs: number,
  detail = '',
) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  await safeExecute(
    `INSERT INTO app_performance_metrics
      (id, name, duration_ms, detail, created_at)
     VALUES (?, ?, ?, ?, ?);`,
    [
      createId('perf'),
      sanitizeDiagnosticText(name),
      Math.round(durationMs * 100) / 100,
      sanitizeDiagnosticText(detail),
      new Date().toISOString(),
    ],
  );
}

async function loadDatabaseHealth(): Promise<DatabaseHealth> {
  let schemaVersion = 0;
  let quickCheck = 'unknown';
  let cipherVersion = 'unknown';

  const version = await safeExecute(
    'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations;',
  );
  if (version?.rows?.[0]) {
    schemaVersion = Number((version.rows[0] as {version?: number}).version ?? 0);
  }

  const quick = await safeExecute('PRAGMA quick_check;');
  if (quick?.rows?.[0]) {
    const row = quick.rows[0] as Record<string, unknown>;
    quickCheck = String(Object.values(row)[0] ?? 'unknown');
  }

  const cipher = await safeExecute('PRAGMA cipher_version;');
  if (cipher?.rows?.[0]) {
    const row = cipher.rows[0] as Record<string, unknown>;
    cipherVersion = String(Object.values(row)[0] ?? 'unknown');
  }

  return {schemaVersion, quickCheck, cipherVersion};
}

export async function loadDiagnostics(limit = 30): Promise<DiagnosticsSnapshot> {
  const bounded = Math.min(Math.max(Math.floor(limit), 1), 100);
  const eventsResult = await safeExecute(
    `SELECT id, level, category, message, detail, created_at
     FROM app_diagnostic_events
     ORDER BY created_at DESC
     LIMIT ?;`,
    [bounded],
  );
  const metricsResult = await safeExecute(
    `SELECT id, name, duration_ms, detail, created_at
     FROM app_performance_metrics
     ORDER BY created_at DESC
     LIMIT ?;`,
    [bounded],
  );

  const events = ((eventsResult?.rows ?? []) as EventRow[]).map(row => ({
    id: row.id,
    level: row.level,
    category: row.category,
    message: row.message,
    detail: row.detail,
    createdAt: row.created_at,
  } satisfies DiagnosticEvent));

  const metrics = ((metricsResult?.rows ?? []) as MetricRow[]).map(row => ({
    id: row.id,
    name: row.name,
    durationMs: Number(row.duration_ms),
    detail: row.detail,
    createdAt: row.created_at,
  } satisfies PerformanceMetric));

  return {
    events,
    metrics,
    database: await loadDatabaseHealth(),
  };
}

export async function clearDiagnostics() {
  await database.transaction(async tx => {
    await tx.execute('DELETE FROM app_diagnostic_events;');
    await tx.execute('DELETE FROM app_performance_metrics;');
  });
}
