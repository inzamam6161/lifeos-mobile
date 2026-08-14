import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {memoryRepository} from '../data/repositories/memoryRepository';
import {aiRepository} from '../data/repositories/aiRepository';
import {
  buildSemanticMemoryIndex,
  refreshPersonalMemory,
  searchPersonalMemory,
} from '../services/memoryService';
import type {MemorySearchResult, MemoryStatus} from '../features/memory/types';

const emptyStatus: MemoryStatus = {total: 0, ready: 0, pending: 0, failed: 0, lastRefreshedAt: null};

export function MemoryScreen() {
  const navigation = useNavigation();
  const [status, setStatus] = useState<MemoryStatus>(emptyStatus);
  const [hasEmbeddingModel, setHasEmbeddingModel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Personal Memory has not been refreshed yet.');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemorySearchResult[]>([]);

  const refreshStatus = useCallback(async () => {
    const [next, model] = await Promise.all([
      memoryRepository.getStatus(),
      aiRepository.getEmbeddingModelConfig(),
    ]);
    setStatus(next);
    setHasEmbeddingModel(Boolean(model.modelUri));
  }, []);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const result = await refreshPersonalMemory();
        setMessage(`Memory synced: ${result.total} records · ${result.changed} changed · ${result.removed} removed.`);
        await refreshStatus();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not refresh Personal Memory.');
      } finally {
        setBusy(false);
      }
    })();
  }, [refreshStatus]);

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await refreshPersonalMemory();
      setMessage(`Memory synced: ${result.total} records · ${result.changed} changed · ${result.removed} removed.`);
      await refreshStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Memory refresh failed.');
    } finally {
      setBusy(false);
    }
  };

  const buildIndex = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('Building semantic index on device...');
    try {
      const result = await buildSemanticMemoryIndex();
      setMessage(`Semantic index: ${result.completed}/${result.attempted} embedded${result.failed ? ` · ${result.failed} failed` : ''}.`);
      await refreshStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Semantic indexing failed.');
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    const value = query.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const next = await searchPersonalMemory(value, 10);
      setResults(next);
      setMessage(next.length ? `Found ${next.length} local result${next.length === 1 ? '' : 's'} using ${next[0].mode} retrieval.` : 'No matching local memory found.');
      await refreshStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Memory search failed.');
    } finally {
      setBusy(false);
    }
  };

  const formatLast = () => status.lastRefreshedAt
    ? new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(status.lastRefreshedAt))
    : 'Never';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.kicker}>LOCAL RAG</Text>
        <Text style={styles.title}>Personal Memory</Text>
        <Text style={styles.subtitle}>
          A private index built from your LifeOS data. Records stay in SQLite; optional embeddings are generated on device.
        </Text>

        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.metricValue}>{status.total}</Text><Text style={styles.metricLabel}>MEMORIES</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{status.ready}</Text><Text style={styles.metricLabel}>SEMANTIC</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{status.pending}</Text><Text style={styles.metricLabel}>PENDING</Text></View>
        </View>

        <View style={styles.statusCard}>
          {busy ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.statusIcon}>◎</Text>}
          <View style={styles.statusBody}>
            <Text style={styles.statusText}>{message}</Text>
            <Text style={styles.statusMeta}>Last refresh · {formatLast()}</Text>
          </View>
        </View>

        <Pressable disabled={busy} onPress={refresh} style={[styles.secondary, busy && styles.disabled]}>
          <Text style={styles.secondaryText}>Refresh LifeOS Memory</Text>
        </Pressable>
        <Pressable disabled={busy || !hasEmbeddingModel} onPress={buildIndex} style={[styles.primary, (busy || !hasEmbeddingModel) && styles.disabled]}>
          <Text style={styles.primaryText}>Build / Update Semantic Index</Text>
        </Pressable>
        {!hasEmbeddingModel ? (
          <Text style={styles.hint}>Import a dedicated embedding GGUF from AI Models to enable semantic indexing. Lexical memory search already works.</Text>
        ) : null}

        <Text style={styles.sectionTitle}>Search your LifeOS</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="What do I know about JSI?"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            editable={!busy}
            returnKeyType="search"
            onSubmitEditing={search}
          />
          <Pressable disabled={busy || !query.trim()} onPress={search} style={[styles.searchButton, (busy || !query.trim()) && styles.disabled]}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          {['React Native architecture', 'recent workouts', 'spending groceries', 'LifeOS goals'].map(item => (
            <Pressable key={item} onPress={() => setQuery(item)} style={styles.quick}>
              <Text style={styles.quickText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {results.map((result, index) => (
          <View key={result.document.id} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultNumber}>S{index + 1}</Text>
              <Text style={styles.resultType}>{result.document.sourceType.replace(/_/g, ' ').toUpperCase()}</Text>
              <Text style={styles.score}>{Math.round(result.score * 100)}%</Text>
            </View>
            <Text style={styles.resultTitle}>{result.document.title}</Text>
            <Text style={styles.resultText} numberOfLines={5}>{result.document.contentText}</Text>
            <Text style={styles.resultMeta}>{result.mode === 'semantic' ? 'Semantic vector match' : 'Local lexical match'}</Text>
          </View>
        ))}

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Privacy boundary</Text>
          <Text style={styles.noteText}>Personal Memory indexes only records already stored inside LifeOS. The search path does not require a cloud API. A local instruct model can synthesize retrieved evidence, but the evidence is still selected from this local index.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.lg, paddingBottom: 70},
  back: {alignSelf: 'flex-start', paddingVertical: 8},
  backText: {color: colors.accent, fontWeight: '800'},
  kicker: {color: colors.accent, fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginTop: spacing.md},
  title: {color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 4},
  subtitle: {color: colors.textMuted, lineHeight: 21, marginTop: 8},
  metrics: {flexDirection: 'row', gap: 8, marginTop: spacing.xl},
  metric: {flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 14, alignItems: 'center'},
  metricValue: {color: colors.text, fontSize: 22, fontWeight: '900'},
  metricLabel: {color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 4},
  statusCard: {flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 16, padding: spacing.md, marginTop: spacing.md},
  statusIcon: {color: colors.accent, fontSize: 24},
  statusBody: {flex: 1},
  statusText: {color: colors.text, lineHeight: 19},
  statusMeta: {color: colors.textMuted, marginTop: 4, fontSize: 11},
  primary: {backgroundColor: colors.accent, borderRadius: 16, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm},
  primaryText: {color: colors.white, fontWeight: '900'},
  secondary: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md},
  secondaryText: {color: colors.text, fontWeight: '800'},
  disabled: {opacity: 0.45},
  hint: {color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8},
  sectionTitle: {color: colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.xl, marginBottom: 10},
  searchRow: {flexDirection: 'row', gap: 8},
  input: {flex: 1, minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14, fontSize: 16},
  searchButton: {minWidth: 82, minHeight: 50, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12},
  searchButtonText: {color: colors.white, fontWeight: '900'},
  quickRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10},
  quick: {borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999},
  quickText: {color: colors.textMuted, fontSize: 11, fontWeight: '700'},
  resultCard: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md, marginTop: spacing.sm},
  resultHeader: {flexDirection: 'row', alignItems: 'center', gap: 8},
  resultNumber: {color: colors.accent, fontWeight: '900', fontSize: 11},
  resultType: {color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, flex: 1},
  score: {color: colors.textMuted, fontSize: 10, fontWeight: '800'},
  resultTitle: {color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 8},
  resultText: {color: colors.textMuted, lineHeight: 19, marginTop: 6},
  resultMeta: {color: colors.accent, fontSize: 10, fontWeight: '800', marginTop: 9},
  note: {marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg},
  noteTitle: {color: colors.text, fontWeight: '900'},
  noteText: {color: colors.textMuted, lineHeight: 20, marginTop: 8},
});
