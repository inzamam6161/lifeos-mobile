import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {loadAssistantMessages, runAssistant} from '../services/assistantService';
import {useAppDispatch} from '../app/hooks';
import {loadTasks} from '../features/tasks/tasksSlice';
import {loadReminders} from '../features/reminders/remindersSlice';
import {loadMoney} from '../features/money/moneySlice';
import {loadProgress} from '../features/progress/progressSlice';
import {aiRepository} from '../data/repositories/aiRepository';
import type {AIMessage, AIProviderKind} from '../features/ai/types';
import type {RootStackParamList} from '../types/navigation';

const quickActions = [
  'Plan my day',
  'What did I accomplish recently?',
  'What do I know about JSI?',
  'What should I do next?',
];

export function AssistantScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const [value, setValue] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [lastProvider, setLastProvider] = useState<AIProviderKind>('deterministic');
  const scrollRef = useRef<ScrollView>(null);

  const refresh = useCallback(async () => {
    const [history, model] = await Promise.all([
      loadAssistantMessages(),
      aiRepository.getModelConfig(),
    ]);
    setMessages(history);
    setConfigured(Boolean(model.modelUri));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const send = async (text = value) => {
    const input = text.trim();
    if (!input || busy) return;
    setValue('');
    setBusy(true);
    try {
      const result = await runAssistant(input);
      setLastProvider(result.provider);
      await Promise.all([
        dispatch(loadTasks()),
        dispatch(loadReminders()),
        dispatch(loadMoney()),
        dispatch(loadProgress()),
      ]);
      await refresh();
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({animated: true}));
    } catch (error) {
      const conversation = await aiRepository.getOrCreateDefaultConversation();
      await aiRepository.appendMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Assistant failed.',
        provider: 'deterministic',
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>LifeOS Assistant</Text>
            <Text style={styles.subtitle}>
              {configured ? 'Local AI configured · private by default' : 'Offline command engine · add a local model anytime'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => navigation.navigate('Memory')} style={styles.modelButton}>
              <Text style={styles.modelButtonText}>MEM</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('AIModel')} style={styles.modelButton}>
              <Text style={styles.modelButtonText}>AI</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({animated: false})}>
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.orb}><Text style={styles.orbText}>◉</Text></View>
              <Text style={styles.emptyTitle}>One inbox for your life</Text>
              <Text style={styles.emptyText}>
                Try “Spent AED 38 at Lulu”, “Remind me tomorrow at 9 to call”, or “Plan my day”.
              </Text>
            </View>
          ) : messages.map(message => (
            <View
              key={message.id}
              style={[
                styles.bubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}>
              <Text style={styles.bubbleText}>{message.content}</Text>
              {message.role === 'assistant' ? (
                <Text style={styles.provider}>
                  {message.provider === 'llama' ? '◉ ON-DEVICE AI' : '◇ LOCAL RULES'}
                  {message.actionType !== 'none' ? ` · ${message.actionType.replace(/_/g, ' ')}` : ''}
                </Text>
              ) : null}
            </View>
          ))}
          {busy ? (
            <View style={[styles.bubble, styles.assistantBubble, styles.thinking]}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.thinkingText}>
                {configured ? 'Thinking on device…' : 'Processing locally…'}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.quickRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickContent}>
            {quickActions.map(action => (
              <Pressable key={action} disabled={busy} onPress={() => send(action)} style={styles.quick}>
                <Text numberOfLines={1} style={styles.quickText}>{action}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Ask or tell LifeOS anything..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={800}
            editable={!busy}
            onSubmitEditing={() => send()}
            blurOnSubmit
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy || !value.trim()}
            onPress={() => send()}
            style={[styles.send, (busy || !value.trim()) && styles.disabled]}>
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
        <Text style={styles.footer}>
          Last route: {lastProvider === 'llama' ? 'on-device LLM' : 'deterministic local engine'} · no cloud API
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  flex: {flex: 1},
  header: {paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {color: colors.text, fontSize: 25, fontWeight: '900'},
  subtitle: {color: colors.textMuted, marginTop: 3, fontSize: 12},
  headerActions: {flexDirection: 'row', gap: 8},
  modelButton: {minWidth: 44, height: 44, paddingHorizontal: 9, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center'},
  modelButtonText: {color: colors.accent, fontWeight: '900'},
  messages: {paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, flexGrow: 1},
  empty: {alignItems: 'center', marginTop: 60, paddingHorizontal: spacing.xl},
  orb: {width: 78, height: 78, borderRadius: 39, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center'},
  orbText: {fontSize: 40, color: colors.accent},
  emptyTitle: {color: colors.text, fontSize: 20, fontWeight: '900', marginTop: spacing.md},
  emptyText: {color: colors.textMuted, lineHeight: 20, textAlign: 'center', marginTop: 8},
  bubble: {maxWidth: '88%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11},
  userBubble: {alignSelf: 'flex-end', backgroundColor: colors.accent},
  assistantBubble: {alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border},
  bubbleText: {color: colors.text, lineHeight: 20},
  provider: {color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 8, letterSpacing: 0.4},
  thinking: {flexDirection: 'row', alignItems: 'center', gap: 10},
  thinkingText: {color: colors.textMuted},
  quickRow: {borderTopWidth: 1, borderTopColor: colors.border},
  quickContent: {paddingHorizontal: spacing.lg, paddingVertical: 9, gap: 8},
  quick: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 220},
  quickText: {color: colors.text, fontWeight: '700', fontSize: 12},
  inputRow: {flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: 8},
  input: {flex: 1, minHeight: 50, maxHeight: 110, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, fontSize: 16},
  send: {width: 50, height: 50, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  sendText: {color: colors.white, fontSize: 24, fontWeight: '900'},
  disabled: {opacity: 0.4},
  footer: {color: colors.textMuted, fontSize: 10, textAlign: 'center', paddingVertical: 8},
});
