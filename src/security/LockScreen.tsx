import React, {useEffect, useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {useSecurity} from './SecurityProvider';

export function SecurityGate({children}: React.PropsWithChildren) {
  const security = useSecurity();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (security.ready && security.locked && security.settings.biometricEnabled) {
      void unlockBiometric();
    }
  }, [security.ready, security.locked]);

  const unlockBiometric = async () => {
    setBusy(true);
    setError('');
    const ok = await security.unlockWithDeviceSecurity();
    if (!ok && !security.settings.pinEnabled) setError('Authentication was not completed.');
    setBusy(false);
  };

  const unlockPin = async () => {
    if (pin.length !== 6) return;
    setBusy(true);
    const ok = await security.unlockWithPin(pin);
    if (!ok) {
      setPin('');
      setError('Incorrect LifeOS PIN.');
    }
    setBusy(false);
  };

  if (!security.ready) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }
  if (!security.locked) return <>{children}</>;

  return (
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <View style={styles.lock}><Text style={styles.lockText}>L</Text></View>
        <Text accessibilityRole="header" style={styles.title}>LifeOS is locked</Text>
        <Text style={styles.subtitle}>Your local Personal OS is protected on this device.</Text>

        {security.settings.biometricEnabled ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Unlock LifeOS with device security" style={styles.primary} onPress={() => void unlockBiometric()} disabled={busy}>
            <Text style={styles.primaryText}>{busy ? 'Authenticating…' : `Unlock with ${security.biometryType ?? 'device security'}`}</Text>
          </Pressable>
        ) : null}

        {security.settings.pinEnabled ? (
          <View style={styles.pinWrap}>
            <Text style={styles.label}>LifeOS PIN</Text>
            <TextInput
              accessibilityLabel="Six digit LifeOS PIN"
              value={pin}
              onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              onSubmitEditing={() => void unlockPin()}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Unlock LifeOS with PIN" style={[styles.secondary, pin.length !== 6 && styles.disabled]} onPress={() => void unlockPin()} disabled={pin.length !== 6 || busy}>
              <Text style={styles.secondaryText}>Unlock with PIN</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background, justifyContent: 'center'},
  center: {flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center'},
  content: {padding: spacing.xl, alignItems: 'center'},
  lock: {width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft},
  lockText: {fontSize: 30, color: colors.text, fontWeight: '900'},
  title: {fontSize: 28, fontWeight: '900', color: colors.text, marginTop: spacing.lg},
  subtitle: {color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20},
  primary: {marginTop: spacing.xl, width: '100%', minHeight: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  primaryText: {color: colors.white, fontWeight: '900'},
  pinWrap: {width: '100%', marginTop: spacing.xl},
  label: {color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm},
  input: {minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 16, color: colors.text, backgroundColor: colors.surface, fontSize: 22, textAlign: 'center', letterSpacing: 10},
  secondary: {minHeight: 50, marginTop: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  secondaryText: {color: colors.accent, fontWeight: '800'},
  disabled: {opacity: 0.45},
  error: {marginTop: spacing.md, color: colors.danger, textAlign: 'center'},
});
