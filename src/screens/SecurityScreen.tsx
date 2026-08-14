import React, {useEffect, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {database} from '../data/database/client';
import {useSecurity} from '../security/SecurityProvider';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {RootStackParamList} from '../types/navigation';

const lockOptions = [0, 15, 30, 60, 300];

export function SecurityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const security = useSecurity();
  const [pin, setPin] = useState('');
  const [cipherVersion, setCipherVersion] = useState('checking…');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void database.execute('PRAGMA cipher_version;').then(result => {
      const row = result.rows[0] as Record<string, unknown> | undefined;
      setCipherVersion(row ? String(Object.values(row)[0] ?? 'SQLCipher') : 'SQLCipher');
    }).catch(() => setCipherVersion('Unavailable — check SQLCipher build config'));
  }, []);

  const clearConversations = () => {
    Alert.alert('Clear assistant history?', 'This removes local AI conversations and action logs. LifeOS domain data is not deleted.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Clear', style: 'destructive', onPress: () => void database.transaction(async tx => {
        await tx.execute('DELETE FROM ai_action_log;');
        await tx.execute('DELETE FROM ai_messages;');
        await tx.execute('DELETE FROM ai_conversations;');
      }).then(() => setMessage('Assistant history cleared.'))},
    ]);
  };

  const clearEmbeddings = () => {
    Alert.alert('Clear semantic embeddings?', 'Memory documents remain. Semantic vectors will be rebuilt only when you choose to index them again.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Clear', style: 'destructive', onPress: () => void database.execute(
        "UPDATE memory_documents SET embedding_json = NULL, embedding_dim = NULL, embedding_model = NULL, embedding_state = 'pending', updated_at = ?;",
        [new Date().toISOString()],
      ).then(() => setMessage('Semantic embeddings cleared. Lexical memory still works.'))},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹ You</Text></Pressable>
        <Text style={styles.eyebrow}>PRIVACY & SECURITY</Text>
        <Text style={styles.title}>Protect your Personal OS</Text>
        <Text style={styles.subtitle}>Local-first security controls for LifeOS data, app access, AI memory and backups.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔐 Database encryption</Text>
          <Text style={styles.bigStatus}>Encrypted at rest</Text>
          <Text style={styles.copy}>SQLCipher · {cipherVersion}</Text>
          <Text style={styles.copy}>The random database key is stored in platform secure storage, not inside SQLite.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>App lock</Text>
          <View style={styles.row}><Text style={styles.rowText}>Status</Text><Text style={styles.value}>{security.settings.appLockEnabled ? 'Enabled' : 'Off'}</Text></View>
          <View style={styles.row}><Text style={styles.rowText}>Device security</Text><Text style={styles.value}>{security.settings.biometricEnabled ? (security.biometryType ?? 'Enabled') : 'Off'}</Text></View>
          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={() => void (security.settings.biometricEnabled ? security.disableBiometricLock() : security.enableBiometricLock()).catch(error => setMessage(error instanceof Error ? error.message : 'Could not update device security.'))}>
              <Text style={styles.primaryText}>{security.settings.biometricEnabled ? 'Disable device unlock' : 'Enable device unlock'}</Text>
            </Pressable>
            {security.settings.appLockEnabled ? (
              <Pressable style={styles.secondary} onPress={security.lockNow}><Text style={styles.secondaryText}>Lock LifeOS now</Text></Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>LifeOS PIN fallback</Text>
          <Text style={styles.copy}>Optional six-digit fallback. The PIN is stored only in platform secure storage.</Text>
          <TextInput
            value={pin}
            onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="6-digit PIN"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <View style={styles.actions}>
            <Pressable disabled={pin.length !== 6} style={[styles.primary, pin.length !== 6 && styles.disabled]} onPress={() => void security.setLifeOSPin(pin).then(() => {setPin(''); setMessage('LifeOS PIN enabled.');}).catch(error => setMessage(error instanceof Error ? error.message : 'Could not save PIN.'))}>
              <Text style={styles.primaryText}>{security.settings.pinEnabled ? 'Change PIN' : 'Enable PIN'}</Text>
            </Pressable>
            {security.settings.pinEnabled ? <Pressable style={styles.secondary} onPress={() => void security.clearLifeOSPin()}><Text style={styles.secondaryText}>Remove PIN</Text></Pressable> : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Auto-lock</Text>
          <View style={styles.chips}>
            {lockOptions.map(seconds => (
              <Pressable key={seconds} style={[styles.chip, security.settings.autoLockSeconds === seconds && styles.chipActive]} onPress={() => void security.updateSettings({autoLockSeconds: seconds})}>
                <Text style={[styles.chipText, security.settings.autoLockSeconds === seconds && styles.chipTextActive]}>{seconds === 0 ? 'Immediately' : seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💾 Backup & restore</Text>
          <Text style={styles.copy}>Create a portable SQLCipher-encrypted backup protected by a separate passphrase.</Text>
          <Pressable style={styles.primary} onPress={() => navigation.navigate('Backup')}><Text style={styles.primaryText}>Open encrypted backups</Text></Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🤖 AI privacy</Text>
          <Text style={styles.copy}>AI conversations and semantic vectors remain local. You can clear either without deleting your underlying LifeOS data.</Text>
          <Pressable style={styles.secondary} onPress={clearConversations}><Text style={styles.secondaryText}>Clear assistant conversations</Text></Pressable>
          <Pressable style={styles.secondary} onPress={clearEmbeddings}><Text style={styles.secondaryText}>Clear semantic embeddings</Text></Pressable>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Text style={styles.footnote}>No mobile security design is absolute. Milestone 11 protects common at-rest and casual-access threats; rooted/jailbroken devices and compromised runtimes require a stronger threat model.</Text>
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
  cardTitle: {color: colors.text, fontWeight: '900', fontSize: 17, marginBottom: spacing.sm},
  bigStatus: {color: colors.success, fontSize: 22, fontWeight: '900'},
  copy: {color: colors.textMuted, lineHeight: 19, marginTop: 5},
  row: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: spacing.md},
  rowText: {color: colors.textMuted},
  value: {color: colors.text, fontWeight: '800', textAlign: 'right'},
  actions: {gap: spacing.sm, marginTop: spacing.md},
  primary: {minHeight: 48, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md},
  primaryText: {color: colors.white, fontWeight: '900'},
  secondary: {minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.md},
  secondaryText: {color: colors.text, fontWeight: '800'},
  input: {marginTop: spacing.md, minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.background, color: colors.text, paddingHorizontal: spacing.md, fontSize: 18, letterSpacing: 4},
  disabled: {opacity: 0.4},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm},
  chip: {paddingHorizontal: 13, minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  chipActive: {backgroundColor: colors.accentSoft, borderColor: colors.accent},
  chipText: {color: colors.textMuted, fontWeight: '700'},
  chipTextActive: {color: colors.text},
  message: {color: colors.success, fontWeight: '700', marginVertical: spacing.md},
  footnote: {color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm},
});
