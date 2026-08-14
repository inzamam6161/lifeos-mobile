import {recordDiagnosticEvent} from './diagnosticsRepository';
import {sanitizeDiagnosticText, sanitizeError} from './sanitize';

export type CrashReport = {
  type: 'exception' | 'message';
  name: string;
  message: string;
  stack: string;
  context: string;
};

export type CrashReporterAdapter = {
  capture(report: CrashReport): void | Promise<void>;
};

let externalAdapter: CrashReporterAdapter | null = null;

export function configureCrashReporter(adapter: CrashReporterAdapter | null) {
  externalAdapter = adapter;
}

async function persistAndForward(report: CrashReport) {
  await recordDiagnosticEvent({
    level: 'error',
    category: 'runtime',
    message: `${report.name}: ${report.message}`,
    detail: `${report.context}\n${report.stack}`,
  });

  if (externalAdapter) {
    await Promise.resolve(externalAdapter.capture(report)).catch(() => undefined);
  }
}

export async function reportCaughtError(error: unknown, context = '') {
  const safe = sanitizeError(error);
  await persistAndForward({
    type: 'exception',
    name: safe.name,
    message: safe.message,
    stack: safe.stack,
    context: sanitizeDiagnosticText(context),
  });
}

export async function reportNonFatal(message: string, context = '') {
  await persistAndForward({
    type: 'message',
    name: 'NonFatal',
    message: sanitizeDiagnosticText(message),
    stack: '',
    context: sanitizeDiagnosticText(context),
  });
}
