export type DiagnosticLevel = 'info' | 'warning' | 'error';

export type DiagnosticEvent = {
  id: string;
  level: DiagnosticLevel;
  category: string;
  message: string;
  detail: string;
  createdAt: string;
};

export type PerformanceMetric = {
  id: string;
  name: string;
  durationMs: number;
  detail: string;
  createdAt: string;
};

export type DatabaseHealth = {
  schemaVersion: number;
  quickCheck: string;
  cipherVersion: string;
};

export type DiagnosticsSnapshot = {
  events: DiagnosticEvent[];
  metrics: PerformanceMetric[];
  database: DatabaseHealth;
};
