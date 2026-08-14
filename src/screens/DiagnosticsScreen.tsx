import React, {useCallback, useState} from 'react';
import {Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {clearDiagnostics, loadDiagnostics} from '../observability/diagnosticsRepository';
import {DiagnosticsSnapshot} from '../observability/types';
import {releaseInfo} from '../config/release';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';

export function DiagnosticsScreen() {
  const navigation = useNavigation();
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      setSnapshot(await loadDiagnostics(40));
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const clear = async () => {
    setBusy(true);
    try {
      await clearDiagnostics();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const rn = Platform.constants.reactNativeVersion;
  const rnVersion = `${rn.major}.${rn.minor}.${rn.patch}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" style={styles.title}>Diagnostics</Text>
            <Text style={styles.subtitle}>Local-only production health and release signals.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Release</Text>
          <Row label="Channel" value={releaseInfo.channel} />
          <Row label="React Native" value={rnVersion} />
          <Row label="Platform" value={`${Platform.OS} ${String(Platform.Version)}`} />
          <Row label="Crash upload" value={releaseInfo.diagnosticsUpload} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Encrypted database</Text>
          <Row label="Schema" value={`v${snapshot?.database.schemaVersion ?? '—'}`} />
          <Row label="Quick check" value={snapshot?.database.quickCheck ?? '—'} />
          <Row label="SQLCipher" value={snapshot?.database.cipherVersion ?? '—'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance</Text>
          {snapshot?.metrics.length ? snapshot.metrics.slice(0, 10).map(metric => (
            <View key={metric.id} style={styles.item}>
              <Text style={styles.itemTitle}>{metric.name}</Text>
              <Text style={styles.metric}>{metric.durationMs.toFixed(1)} ms</Text>
              {metric.detail ? <Text style={styles.detail}>{metric.detail}</Text> : null}
            </View>
          )) : <Text style={styles.empty}>No metrics recorded yet.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent sanitized errors</Text>
          {snapshot?.events.length ? snapshot.events.slice(0, 10).map(event => (
            <View key={event.id} style={styles.item}>
              <Text style={[styles.itemTitle, event.level === 'error' && styles.error]}>{event.category}</Text>
              <Text style={styles.detail}>{event.message}</Text>
              <Text style={styles.timestamp}>{new Date(event.createdAt).toLocaleString()}</Text>
            </View>
          )) : <Text style={styles.empty}>No diagnostic events recorded.</Text>}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh diagnostics"
          disabled={busy}
          onPress={() => void refresh()}
          style={({pressed}) => [styles.primary, (pressed || busy) && styles.pressed]}>
          <Text style={styles.primaryText}>{busy ? 'Refreshing…' : 'Refresh diagnostics'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear local diagnostics"
          disabled={busy}
          onPress={() => void clear()}
          style={({pressed}) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>Clear local diagnostics</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.lg, paddingBottom: 100, gap: spacing.md},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  headerText: {flex: 1},
  back: {width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border},
  backText: {color: colors.text, fontSize: 30, lineHeight: 32},
  title: {color: colors.text, fontSize: 28, fontWeight: '900'},
  subtitle: {color: colors.textMuted, marginTop: 3, lineHeight: 19},
  card: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md, gap: 10},
  cardTitle: {color: colors.text, fontSize: 16, fontWeight: '900'},
  row: {flexDirection: 'row', justifyContent: 'space-between', gap: 16},
  rowLabel: {color: colors.textMuted, flex: 1},
  rowValue: {color: colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right'},
  item: {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 10, gap: 3},
  itemTitle: {color: colors.text, fontWeight: '800'},
  metric: {color: colors.accent, fontWeight: '900'},
  detail: {color: colors.textMuted, fontSize: 12, lineHeight: 17},
  timestamp: {color: colors.textMuted, fontSize: 10},
  error: {color: colors.danger},
  empty: {color: colors.textMuted},
  primary: {minHeight: 50, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  primaryText: {color: colors.white, fontWeight: '900'},
  secondary: {minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  secondaryText: {color: colors.text, fontWeight: '800'},
  pressed: {opacity: 0.7},
});
