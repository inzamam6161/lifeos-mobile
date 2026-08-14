import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {aiRepository} from '../data/repositories/aiRepository';
import {
  importLocalEmbeddingGGUFModel,
  importLocalGGUFModel,
  isEmbeddingModelLoaded,
  isLocalModelLoaded,
  loadConfiguredEmbeddingModel,
  loadConfiguredLocalModel,
  releaseEmbeddingModel,
  releaseLocalModel,
} from '../services/aiModelService';
import type {AIEmbeddingModelConfig, AIModelConfig} from '../features/ai/types';

const emptyModel: AIModelConfig = {modelUri: null, modelName: null, importedAt: null};
const emptyEmbedding: AIEmbeddingModelConfig = {modelUri: null, modelName: null, importedAt: null};

export function AIModelScreen() {
  const navigation = useNavigation();
  const [config, setConfig] = useState<AIModelConfig>(emptyModel);
  const [embeddingConfig, setEmbeddingConfig] = useState<AIEmbeddingModelConfig>(emptyEmbedding);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('No local answer model loaded.');
  const [embeddingStatus, setEmbeddingStatus] = useState('No embedding model loaded.');

  const refresh = useCallback(async () => {
    const [next, embedding] = await Promise.all([
      aiRepository.getModelConfig(),
      aiRepository.getEmbeddingModelConfig(),
    ]);
    setConfig(next);
    setEmbeddingConfig(embedding);
    setStatus(isLocalModelLoaded() ? 'Answer model loaded in memory.' : next.modelUri ? 'Answer model stored offline and ready.' : 'No answer model configured.');
    setEmbeddingStatus(isEmbeddingModelLoaded() ? 'Embedding model loaded in memory.' : embedding.modelUri ? 'Embedding model stored offline and ready.' : 'No embedding model configured.');
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const run = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await operation(); } finally { setBusy(false); }
  };

  const importModel = () => run(async () => {
    try {
      const next = await importLocalGGUFModel();
      if (next) {
        setConfig(next);
        setStatus('Answer model copied into LifeOS. Tap Test / Load to initialize it.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Model import failed.');
    }
  });

  const loadModel = () => run(async () => {
    setStatus('Loading answer model into memory...');
    try {
      const next = await loadConfiguredLocalModel();
      setConfig(next);
      setStatus('Answer model loaded. Assistant and RAG synthesis can use on-device inference.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load model.');
    }
  });

  const unload = () => run(async () => {
    await releaseLocalModel();
    setStatus(config.modelUri ? 'Answer model unloaded. Offline copy remains.' : 'No answer model configured.');
  });

  const remove = () => run(async () => {
    await releaseLocalModel();
    await aiRepository.clearModelConfig();
    setConfig(emptyModel);
    setStatus('Answer model configuration removed.');
  });

  const importEmbedding = () => run(async () => {
    try {
      const next = await importLocalEmbeddingGGUFModel();
      if (next) {
        setEmbeddingConfig(next);
        setEmbeddingStatus('Embedding model copied into LifeOS. Build the semantic index from Personal Memory.');
      }
    } catch (error) {
      setEmbeddingStatus(error instanceof Error ? error.message : 'Embedding model import failed.');
    }
  });

  const loadEmbedding = () => run(async () => {
    setEmbeddingStatus('Loading embedding model into memory...');
    try {
      const next = await loadConfiguredEmbeddingModel();
      setEmbeddingConfig(next);
      setEmbeddingStatus('Embedding model loaded. Semantic retrieval is available.');
    } catch (error) {
      setEmbeddingStatus(error instanceof Error ? error.message : 'Could not load embedding model.');
    }
  });

  const unloadEmbedding = () => run(async () => {
    await releaseEmbeddingModel();
    setEmbeddingStatus(embeddingConfig.modelUri ? 'Embedding model unloaded. Offline copy remains.' : 'No embedding model configured.');
  });

  const removeEmbedding = () => run(async () => {
    await releaseEmbeddingModel();
    await aiRepository.clearEmbeddingModelConfig();
    setEmbeddingConfig(emptyEmbedding);
    setEmbeddingStatus('Embedding model configuration removed. Existing vectors stay local but will not be used until a compatible model is configured.');
  });

  const importedLabel = (importedAt: string | null, fallback: string) => importedAt
    ? `Imported ${new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(importedAt))}`
    : fallback;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.kicker}>PRIVATE AI</Text>
        <Text style={styles.title}>Local Models</Text>
        <Text style={styles.subtitle}>
          LifeOS separates the instruct model that reasons/answers from the embedding model that searches Personal Memory.
        </Text>

        <Text style={styles.sectionTitle}>1 · Answer / command model</Text>
        <View style={styles.card}>
          <Text style={styles.label}>INSTRUCT GGUF</Text>
          <Text style={styles.modelName}>{config.modelName ?? 'Not configured'}</Text>
          <Text style={styles.meta}>{importedLabel(config.importedAt, 'Use a small instruct model suitable for mobile.')}</Text>
        </View>
        <View style={styles.statusCard}>
          {busy ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.statusIcon}>◉</Text>}
          <Text style={styles.statusText}>{status}</Text>
        </View>
        <Pressable disabled={busy} onPress={importModel} style={[styles.primary, busy && styles.disabled]}>
          <Text style={styles.primaryText}>{config.modelUri ? 'Replace answer model' : 'Import answer GGUF'}</Text>
        </Pressable>
        <Pressable disabled={busy || !config.modelUri} onPress={loadModel} style={[styles.secondary, (!config.modelUri || busy) && styles.disabled]}>
          <Text style={styles.secondaryText}>Test / Load answer model</Text>
        </Pressable>
        <View style={styles.actionRow}>
          <Pressable disabled={busy} onPress={unload} style={[styles.rowButton, busy && styles.disabled]}><Text style={styles.rowButtonText}>Unload</Text></Pressable>
          <Pressable disabled={busy || !config.modelUri} onPress={remove} style={[styles.rowButton, (!config.modelUri || busy) && styles.disabled]}><Text style={styles.removeText}>Remove config</Text></Pressable>
        </View>

        <Text style={styles.sectionTitle}>2 · Personal Memory embedding model</Text>
        <View style={styles.card}>
          <Text style={styles.label}>EMBEDDING GGUF</Text>
          <Text style={styles.modelName}>{embeddingConfig.modelName ?? 'Not configured'}</Text>
          <Text style={styles.meta}>{importedLabel(embeddingConfig.importedAt, 'Use a dedicated embedding GGUF for semantic search.')}</Text>
        </View>
        <View style={styles.statusCard}>
          {busy ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.statusIcon}>⌁</Text>}
          <Text style={styles.statusText}>{embeddingStatus}</Text>
        </View>
        <Pressable disabled={busy} onPress={importEmbedding} style={[styles.primary, busy && styles.disabled]}>
          <Text style={styles.primaryText}>{embeddingConfig.modelUri ? 'Replace embedding model' : 'Import embedding GGUF'}</Text>
        </Pressable>
        <Pressable disabled={busy || !embeddingConfig.modelUri} onPress={loadEmbedding} style={[styles.secondary, (!embeddingConfig.modelUri || busy) && styles.disabled]}>
          <Text style={styles.secondaryText}>Test / Load embedding model</Text>
        </Pressable>
        <View style={styles.actionRow}>
          <Pressable disabled={busy} onPress={unloadEmbedding} style={[styles.rowButton, busy && styles.disabled]}><Text style={styles.rowButtonText}>Unload</Text></Pressable>
          <Pressable disabled={busy || !embeddingConfig.modelUri} onPress={removeEmbedding} style={[styles.rowButton, (!embeddingConfig.modelUri || busy) && styles.disabled]}><Text style={styles.removeText}>Remove config</Text></Pressable>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Why two models?</Text>
          <Text style={styles.noteText}>An instruct model is optimized to follow commands and write answers. An embedding model converts LifeOS records into vectors for semantic retrieval. Keeping them separate avoids relying on an instruct model for a job it may not support well.</Text>
          <Text style={styles.noteText}>No model is required for core LifeOS. Commands keep their deterministic fallback and Personal Memory keeps lexical retrieval.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.lg, paddingBottom: 60},
  back: {alignSelf: 'flex-start', paddingVertical: 8},
  backText: {color: colors.accent, fontWeight: '800'},
  kicker: {color: colors.accent, fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginTop: spacing.md},
  title: {color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 4},
  subtitle: {color: colors.textMuted, lineHeight: 21, marginTop: 8},
  sectionTitle: {color: colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.xl, marginBottom: 8},
  card: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.lg},
  label: {color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2},
  modelName: {color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 8},
  meta: {color: colors.textMuted, marginTop: 6, lineHeight: 19},
  statusCard: {flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 16, padding: spacing.md, marginTop: spacing.md},
  statusIcon: {color: colors.accent, fontSize: 24},
  statusText: {flex: 1, color: colors.text, lineHeight: 19},
  primary: {backgroundColor: colors.accent, borderRadius: 16, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md},
  primaryText: {color: colors.white, fontWeight: '900'},
  secondary: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm},
  secondaryText: {color: colors.text, fontWeight: '800'},
  actionRow: {flexDirection: 'row', gap: 8, marginTop: 8},
  rowButton: {flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border},
  rowButtonText: {color: colors.text, fontWeight: '800'},
  removeText: {color: '#ff6b6b', fontWeight: '800'},
  disabled: {opacity: 0.45},
  note: {marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg, gap: 8},
  noteTitle: {color: colors.text, fontWeight: '800'},
  noteText: {color: colors.textMuted, lineHeight: 20},
});
