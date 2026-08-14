import {recordPerformanceMetric} from './diagnosticsRepository';

export function performanceNow() {
  if (typeof globalThis.performance?.now === 'function') {
    return globalThis.performance.now();
  }
  return Date.now();
}

export async function measureAsync<T>(
  name: string,
  task: () => Promise<T>,
  detail = '',
): Promise<T> {
  const start = performanceNow();
  try {
    return await task();
  } finally {
    await recordPerformanceMetric(name, performanceNow() - start, detail);
  }
}
