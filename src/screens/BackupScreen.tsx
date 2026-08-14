import React, {useEffect, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {database} from '../data/database/client';
import {exportEncryptedBackup, restoreEncryptedBackup} from '../services/backupService';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';

type HistoryRow = {id: string; operation: string; status: string; file_name: string; created_at: string};

export function BackupScreen() {
  const navigation = useNavigation();
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const loadHistory = async () => {
    const result = await database.execute('SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 8;');
    setHistory(result.rows as HistoryRow[]);
  };
  useEffect(() => { void loadHistory(); }, []);

  const doExport = async () => {
    setBusy(true); setMessage('');
    try {
      const name = await exportEncryptedBackup(exportPassphrase);
      setExportPassphrase('');
      setMessage(`Encrypted backup exported: ${name}`);
      await loadHistory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup export failed.');
    } finally { setBusy(false); }
  };

  const doRestore = () => {
    Alert.alert('Restore LifeOS backup?', 'Current local database content will be replaced after the selected backup is decrypted and fully validated. A rollback copy is kept until the replacement opens successfully.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Restore', style: 'destructive', onPress: () => void (async () => {
        setBusy(true); setMessage('');
        try {
          const name = await restoreEncryptedBackup(restorePassphrase);
          setRestorePassphrase('');
          setMessage(`Restored ${name}. Fully close and reopen LifeOS so every Redux screen reloads from the restored database.`);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'Restore failed.');
        } finally { setBusy(false); }
      })()},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Security</Text></Pressable>
        <Text style={styles.eyebrow}>ENCRYPTED BACKUP</Text>
        <Text style={styles.title}>Own your LifeOS data</Text>
        <Text style={styles.subtitle}>Portable backups contain the encrypted SQLite database only. GGUF models and imported study files are intentionally excluded in this milestone.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export backup</Text>
          <Text style={styles.copy}>Choose a strong passphrase different from your LifeOS PIN. You need this exact passphrase to restore on another device.</Text>
          <TextInput value={exportPassphrase} onChangeText={setExportPassphrase} secureTextEntry autoCapitalize="none" placeholder="Backup passphrase · 12+ characters" placeholderTextColor={colors.textMuted} style={styles.input} />
          <Pressable disabled={busy || exportPassphrase.length < 12} style={[styles.primary, (busy || exportPassphrase.length < 12) && styles.disabled]} onPress={() => void doExport()}>
            <Text style={styles.primaryText}>{busy ? 'Working…' : 'Create encrypted backup'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Restore backup</Text>
          <Text style={styles.copy}>LifeOS validates the selected SQLCipher backup before replacing your current local database.</Text>
          <TextInput value={restorePassphrase} onChangeText={setRestorePassphrase} secureTextEntry autoCapitalize="none" placeholder="Backup passphrase" placeholderTextColor={colors.textMuted} style={styles.input} />
          <Pressable disabled={busy || restorePassphrase.length < 1} style={[styles.dangerButton, (busy || !restorePassphrase) && styles.disabled]} onPress={doRestore}>
            <Text style={styles.dangerText}>Choose backup & restore</Text>
          </Pressable>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Text style={styles.section}>RECENT BACKUP ACTIVITY</Text>
        <View style={styles.history}>
          {history.length ? history.map(item => (
            <View key={item.id} style={styles.historyRow}>
              <View style={{flex: 1}}><Text style={styles.historyTitle}>{item.operation.toUpperCase()} · {item.status}</Text><Text style={styles.historySub}>{item.file_name}</Text></View>
              <Text style={styles.historySub}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )) : <Text style={styles.copy}>No backup activity yet.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.lg, paddingBottom: 60},
  back: {color: colors.accent, fontWeight: '800', fontSize: 16, marginBottom: spacing.lg},
  eyebrow: {color: colors.accent, fontWeight: '900', letterSpacing: 1.4, fontSize: 12},
  title: {color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 6},
  subtitle: {color: colors.textMuted, lineHeight: 21, marginTop: spacing.sm, marginBottom: spacing.lg},
  card: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.lg, marginBottom: spacing.md},
  cardTitle: {color: colors.text, fontWeight: '900', fontSize: 17},
  copy: {color: colors.textMuted, lineHeight: 19, marginTop: spacing.sm},
  input: {minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, paddingHorizontal: spacing.md, marginTop: spacing.md},
  primary: {minHeight: 50, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md},
  primaryText: {color: colors.white, fontWeight: '900'},
  dangerButton: {minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md},
  dangerText: {color: colors.danger, fontWeight: '900'},
  disabled: {opacity: 0.4},
  message: {color: colors.success, lineHeight: 20, fontWeight: '700', marginVertical: spacing.md},
  section: {color: colors.textMuted, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginTop: spacing.lg, marginBottom: spacing.sm},
  history: {borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden'},
  historyRow: {minHeight: 64, padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  historyTitle: {color: colors.text, fontWeight: '800'},
  historySub: {color: colors.textMuted, fontSize: 12, marginTop: 3},
});
