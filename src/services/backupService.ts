import {open} from '@op-engineering/op-sqlite';
import {keepLocalCopy, pick, saveDocuments, types} from '@react-native-documents/picker';
import {Dirs, FileSystem, Util} from 'react-native-file-access';
import {closeDatabaseConnection, database, setDatabaseConnection} from '../data/database/client';
import {getDatabaseKey} from '../security/secureStore';
import {createId} from '../utils/createId';

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function pathFromUri(uri: string) {
  return decodeURIComponent(uri.replace(/^file:\/\//, ''));
}

function fileUri(path: string) {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function backupName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `LifeOS-${stamp}.lifeosbackup`;
}

async function record(operation: 'export' | 'restore', status: 'success' | 'failed', fileName: string) {
  await database.execute(
    'INSERT INTO backup_history(id, operation, status, file_name, created_at) VALUES (?, ?, ?, ?, ?);',
    [createId('backup'), operation, status, fileName, new Date().toISOString()],
  ).catch(() => undefined);
}

export async function exportEncryptedBackup(passphrase: string) {
  if (passphrase.trim().length < 12) throw new Error('Use a backup passphrase of at least 12 characters.');
  const fileName = backupName();
  const outputPath = `${Dirs.DocumentDir}/${fileName}`;
  if (await FileSystem.exists(outputPath)) await FileSystem.unlink(outputPath);

  try {
    await database.execute('PRAGMA wal_checkpoint(TRUNCATE);').catch(() => undefined);
    await database.execute(
      `ATTACH DATABASE ${sqlString(outputPath)} AS lifeos_backup KEY ${sqlString(passphrase)};`,
    );
    await database.execute("SELECT sqlcipher_export('lifeos_backup');");
    await database.execute('DETACH DATABASE lifeos_backup;');

    const check = open({
      name: Util.basename(outputPath),
      location: Util.dirname(outputPath),
      encryptionKey: passphrase,
      failOnCreate: true,
    });
    await check.execute('SELECT count(*) AS count FROM sqlite_master;');
    check.close();

    await saveDocuments({
      sourceUris: [fileUri(outputPath)],
      copy: true,
      mimeType: 'application/octet-stream',
      fileName,
    });
    await record('export', 'success', fileName);
    return fileName;
  } catch (error) {
    await database.execute('DETACH DATABASE lifeos_backup;').catch(() => undefined);
    await record('export', 'failed', fileName);
    throw error;
  } finally {
    await FileSystem.unlink(outputPath).catch(() => undefined);
  }
}

async function validateEncryptedDatabase(path: string, key: string) {
  const connection = open({
    name: Util.basename(path),
    location: Util.dirname(path),
    encryptionKey: key,
    failOnCreate: true,
  });
  try {
    await connection.execute('SELECT count(*) AS count FROM sqlite_master;');
    return true;
  } catch {
    return false;
  } finally {
    connection.close();
  }
}

export async function restoreEncryptedBackup(passphrase: string) {
  const [selected] = await pick({type: [types.allFiles], mode: 'import'});
  if (!selected) throw new Error('No backup selected.');
  const copies = await keepLocalCopy({
    destination: 'documentDirectory',
    files: [{uri: selected.uri, fileName: selected.name ?? 'LifeOS-Restore.lifeosbackup'}],
  });
  const copy = copies[0];
  if (copy.status !== 'success') throw new Error(copy.copyError || 'Could not copy the backup locally.');
  const backupPath = pathFromUri(copy.localUri);
  const fileName = selected.name ?? 'LifeOS backup';

  try {
    if (!(await validateEncryptedDatabase(backupPath, passphrase))) {
      throw new Error('Backup could not be decrypted. Check the backup passphrase.');
    }
    const currentKey = await getDatabaseKey();
    if (!currentKey) throw new Error('LifeOS database key is unavailable.');

    const source = open({
      name: Util.basename(backupPath),
      location: Util.dirname(backupPath),
      encryptionKey: passphrase,
      failOnCreate: true,
    });
    const mainPath = database.getDbPath();
    const restoredPath = `${Util.dirname(mainPath)}/lifeos-restored.sqlite`;
    const rollbackPath = `${Util.dirname(mainPath)}/lifeos-before-restore.sqlite`;
    if (await FileSystem.exists(restoredPath)) await FileSystem.unlink(restoredPath);
    if (await FileSystem.exists(rollbackPath)) await FileSystem.unlink(rollbackPath);

    try {
      await source.execute(
        `ATTACH DATABASE ${sqlString(restoredPath)} AS restored KEY ${sqlString(currentKey)};`,
      );
      await source.execute("SELECT sqlcipher_export('restored');");
      await source.execute('DETACH DATABASE restored;');
    } finally {
      source.close();
    }

    if (!(await validateEncryptedDatabase(restoredPath, currentKey))) {
      throw new Error('Restored database validation failed. Current LifeOS data was not changed.');
    }

    closeDatabaseConnection();
    for (const suffix of ['-wal', '-shm']) {
      await FileSystem.unlink(`${mainPath}${suffix}`).catch(() => undefined);
    }
    await FileSystem.mv(mainPath, rollbackPath);
    try {
      await FileSystem.mv(restoredPath, mainPath);
      const reopened = open({name: Util.basename(mainPath), location: Util.dirname(mainPath), encryptionKey: currentKey, failOnCreate: true});
      await reopened.execute('SELECT count(*) AS count FROM sqlite_master;');
      setDatabaseConnection(reopened);
      await record('restore', 'success', fileName);
      await FileSystem.unlink(rollbackPath).catch(() => undefined);
    } catch (error) {
      await FileSystem.unlink(mainPath).catch(() => undefined);
      await FileSystem.mv(rollbackPath, mainPath).catch(() => undefined);
      const fallback = open({name: Util.basename(mainPath), location: Util.dirname(mainPath), encryptionKey: currentKey, failOnCreate: true});
      setDatabaseConnection(fallback);
      throw error;
    }
    return fileName;
  } catch (error) {
    await record('restore', 'failed', fileName);
    throw error;
  } finally {
    await FileSystem.unlink(backupPath).catch(() => undefined);
  }
}
