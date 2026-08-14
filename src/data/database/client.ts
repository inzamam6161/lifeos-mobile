import {open} from '@op-engineering/op-sqlite';

export type LifeOSDatabase = ReturnType<typeof open>;

let activeDatabase: LifeOSDatabase | null = null;

export function setDatabaseConnection(connection: LifeOSDatabase) {
  if (activeDatabase && activeDatabase !== connection) {
    try {
      activeDatabase.close();
    } catch {
      // Replacing the process-wide connection is intentionally best-effort.
    }
  }
  activeDatabase = connection;
}

export function getDatabaseConnection(): LifeOSDatabase {
  if (!activeDatabase) {
    throw new Error('LifeOS database has not been initialized yet.');
  }
  return activeDatabase;
}

export function closeDatabaseConnection() {
  if (!activeDatabase) return;
  activeDatabase.close();
  activeDatabase = null;
}

/**
 * Stable proxy imported by repositories. Milestone 11 initializes the real
 * SQLCipher connection only after retrieving the encryption key from secure
 * platform storage, but repositories can keep importing `database` normally.
 */
export const database = new Proxy({} as LifeOSDatabase, {
  get(_target, property) {
    const connection = getDatabaseConnection() as unknown as Record<PropertyKey, unknown>;
    const value = connection[property];
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(connection)
      : value;
  },
});
