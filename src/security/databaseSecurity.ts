import {open} from '@op-engineering/op-sqlite';
import {FileSystem} from 'react-native-file-access';
import {setDatabaseConnection, closeDatabaseConnection} from '../data/database/client';
import {createSecureRandomHex, getDatabaseKey, saveDatabaseKey} from './secureStore';
import {DatabaseSecurityStatus} from './types';

const DB_NAME = 'lifeos.sqlite';
const MIGRATION_NAME = 'lifeos-encrypted-migration.sqlite';
const LEGACY_BACKUP_NAME = 'lifeos-legacy-plaintext.sqlite';

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function canRead(connection: ReturnType<typeof open>) {
  try {
    await connection.execute('SELECT count(*) AS count FROM sqlite_master;');
    return true;
  } catch {
    return false;
  }
}

async function cleanupSidecars(path: string) {
  for (const suffix of ['-wal', '-shm']) {
    const file = `${path}${suffix}`;
    if (await FileSystem.exists(file)) {
      await FileSystem.unlink(file).catch(() => undefined);
    }
  }
}

async function migratePlaintextDatabase(key: string, plaintext: ReturnType<typeof open>) {
  const sourcePath = plaintext.getDbPath();
  const slash = sourcePath.lastIndexOf('/');
  const directory = sourcePath.slice(0, slash);
  const encryptedPath = `${directory}/${MIGRATION_NAME}`;
  const legacyPath = `${directory}/${LEGACY_BACKUP_NAME}`;

  if (await FileSystem.exists(encryptedPath)) await FileSystem.unlink(encryptedPath);
  await plaintext.execute('PRAGMA wal_checkpoint(TRUNCATE);').catch(() => undefined);
  await plaintext.execute(
    `ATTACH DATABASE ${sqlString(encryptedPath)} AS encrypted KEY ${sqlString(key)};`,
  );
  await plaintext.execute("SELECT sqlcipher_export('encrypted');");
  await plaintext.execute('DETACH DATABASE encrypted;');
  plaintext.close();
  await cleanupSidecars(sourcePath);

  const encrypted = open({name: MIGRATION_NAME, encryptionKey: key, failOnCreate: true});
  const valid = await canRead(encrypted);
  encrypted.close();
  if (!valid) throw new Error('Encrypted database validation failed. Original database was not changed.');

  if (await FileSystem.exists(legacyPath)) await FileSystem.unlink(legacyPath);
  await FileSystem.mv(sourcePath, legacyPath);
  try {
    await FileSystem.mv(encryptedPath, sourcePath);
    const finalConnection = open({name: DB_NAME, encryptionKey: key, failOnCreate: true});
    if (!(await canRead(finalConnection))) {
      finalConnection.close();
      throw new Error('Encrypted LifeOS database could not be reopened.');
    }
    // Best-effort removal: flash filesystems cannot guarantee physical secure erase.
    await FileSystem.unlink(legacyPath).catch(() => undefined);
    setDatabaseConnection(finalConnection);
    return {encrypted: true, migratedFromPlaintext: true, path: sourcePath};
  } catch (error) {
    if (await FileSystem.exists(sourcePath)) await FileSystem.unlink(sourcePath).catch(() => undefined);
    await FileSystem.mv(legacyPath, sourcePath).catch(() => undefined);
    throw error;
  }
}

export async function initializeSecureDatabase(): Promise<DatabaseSecurityStatus> {
  let key = await getDatabaseKey();
  if (!key) {
    key = await createSecureRandomHex(32);
    await saveDatabaseKey(key);
  }

  // Existing encrypted installation.
  try {
    const encrypted = open({name: DB_NAME, encryptionKey: key, failOnCreate: true});
    if (await canRead(encrypted)) {
      setDatabaseConnection(encrypted);
      return {encrypted: true, migratedFromPlaintext: false, path: encrypted.getDbPath()};
    }
    encrypted.close();
  } catch {
    // File may not exist yet or may be a Milestone 10 plaintext DB.
  }

  // Existing Milestone 10 plaintext installation. Only failure to OPEN/read a
  // plaintext database is treated as a fresh install. Once conversion starts,
  // migration errors must propagate so we never hide a failed upgrade.
  let plaintext: ReturnType<typeof open> | null = null;
  try {
    plaintext = open({name: DB_NAME, failOnCreate: true});
  } catch {
    plaintext = null;
  }
  if (plaintext) {
    if (await canRead(plaintext)) {
      return migratePlaintextDatabase(key, plaintext);
    }
    plaintext.close();
  }

  const fresh = open({name: DB_NAME, encryptionKey: key});
  if (!(await canRead(fresh))) {
    fresh.close();
    throw new Error('Could not create encrypted LifeOS database. Confirm OP-SQLite SQLCipher is enabled.');
  }
  setDatabaseConnection(fresh);
  return {encrypted: true, migratedFromPlaintext: false, path: fresh.getDbPath()};
}

export async function reopenSecureDatabase() {
  const key = await getDatabaseKey();
  if (!key) throw new Error('LifeOS database encryption key is unavailable.');
  closeDatabaseConnection();
  const connection = open({name: DB_NAME, encryptionKey: key, failOnCreate: true});
  if (!(await canRead(connection))) {
    connection.close();
    throw new Error('Could not reopen encrypted LifeOS database.');
  }
  setDatabaseConnection(connection);
}
