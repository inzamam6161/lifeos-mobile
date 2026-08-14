import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {recordFocusSession} from '../features/tasks/boardsSlice';
import {loadProgress} from '../features/progress/progressSlice';
import {selectWorkTasks} from '../features/tasks/selectors';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkMode'>;
const SESSION_SECONDS = 25 * 60;

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.max(0, seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function WorkModeScreen({route, navigation}: Props) {
  const dispatch = useAppDispatch();
  const workTasks = useAppSelector(selectWorkTasks);
  const preferredTaskId = route.params?.taskId;
  const initialTaskId = preferredTaskId && workTasks.some(task => task.id === preferredTaskId) ? preferredTaskId : workTasks[0]?.id ?? null;
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId);
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [running, setRunning] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const startedAtRef = useRef<string | null>(null);

  const selectedTask = useMemo(() => workTasks.find(task => task.id === selectedTaskId) ?? null, [selectedTaskId, workTasks]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setRemaining(value => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const startPause = () => {
    if (!running && !startedAtRef.current) startedAtRef.current = new Date().toISOString();
    setRunning(value => !value);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(SESSION_SECONDS);
    startedAtRef.current = null;
    setSavedMessage('');
  };

  const finish = async () => {
    const elapsed = SESSION_SECONDS - remaining;
    if (elapsed <= 0) {
      setSavedMessage('Start the timer before finishing a session.');
      return;
    }
    const endedAt = new Date().toISOString();
    const startedAt = startedAtRef.current ?? new Date(Date.now() - elapsed * 1000).toISOString();
    await dispatch(recordFocusSession({taskId: selectedTaskId, startedAt, endedAt, durationSeconds: elapsed})).unwrap();
    await dispatch(loadProgress()).unwrap();
    setSavedMessage(`Saved ${Math.max(1, Math.round(elapsed / 60))} min focus session offline.`);
    resetTimerAfterSave();
  };

  const resetTimerAfterSave = () => {
    setRunning(false);
    setRemaining(SESSION_SECONDS);
    startedAtRef.current = null;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>💼 WORK MODE</Text><Text style={styles.title}>Deep focus</Text></View>
          <Pressable onPress={() => navigation.goBack()} style={styles.exit}><Text style={styles.exitText}>Exit</Text></Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>CURRENT FOCUS</Text>
          <Text style={styles.taskTitle}>{selectedTask?.title ?? 'Choose a work task'}</Text>
          <Text style={styles.timer}>{formatTime(remaining)}</Text>
          <View style={styles.timerActions}>
            <Pressable onPress={startPause} style={styles.primary}><Text style={styles.primaryText}>{running ? 'Pause' : remaining < SESSION_SECONDS ? 'Resume' : 'Start'}</Text></Pressable>
            <Pressable onPress={reset} style={styles.secondary}><Text style={styles.secondaryText}>Reset</Text></Pressable>
          </View>
          <Pressable onPress={() => void finish()} style={styles.finish}><Text style={styles.finishText}>Finish & save session</Text></Pressable>
          {savedMessage ? <Text style={styles.saved}>{savedMessage}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work queue</Text>
          {workTasks.map(task => (
            <Pressable key={task.id} onPress={() => { setSelectedTaskId(task.id); reset(); }} style={[styles.taskRow, selectedTaskId === task.id && styles.taskRowActive]}>
              <View style={styles.taskDot} />
              <View style={styles.taskInfo}><Text style={styles.queueTitle}>{task.title}</Text><Text style={styles.meta}>{task.priority} · {task.estimateMinutes ? `${task.estimateMinutes} min` : 'no estimate'}</Text></View>
              <Text style={styles.chevron}>{selectedTaskId === task.id ? '●' : '○'}</Text>
            </Pressable>
          ))}
          {!workTasks.length ? <Text style={styles.empty}>Your open Work board is clear.</Text> : null}
        </View>

        <View style={styles.tip}><Text style={styles.tipTitle}>Focus Mode rule</Text><Text style={styles.tipText}>One task, one timer, fewer decisions. Completed focus sessions are written to SQLite for later analytics.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: 80, gap: spacing.lg},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  eyebrow: {color: colors.work, fontSize: 10, fontWeight: '900', letterSpacing: 1.1},
  title: {color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 3},
  exit: {borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10},
  exitText: {color: colors.text, fontWeight: '800'},
  hero: {backgroundColor: colors.workSoft, borderWidth: 1, borderColor: colors.work, borderRadius: 28, padding: spacing.xl, alignItems: 'center', gap: spacing.sm},
  heroLabel: {color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2},
  taskTitle: {color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center', minHeight: 48},
  timer: {color: colors.text, fontSize: 58, fontWeight: '300', letterSpacing: -2, fontVariant: ['tabular-nums']},
  timerActions: {flexDirection: 'row', gap: spacing.sm, width: '100%'},
  primary: {flex: 1, minHeight: 50, borderRadius: 15, backgroundColor: colors.work, alignItems: 'center', justifyContent: 'center'},
  primaryText: {color: colors.white, fontWeight: '900'},
  secondary: {flex: 1, minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center'},
  secondaryText: {color: colors.text, fontWeight: '800'},
  finish: {minHeight: 44, justifyContent: 'center'},
  finishText: {color: colors.work, fontWeight: '800'},
  saved: {color: colors.success, textAlign: 'center', fontSize: 12},
  section: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden'},
  sectionTitle: {color: colors.text, fontSize: 16, fontWeight: '800', padding: spacing.md},
  taskRow: {minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
  taskRowActive: {backgroundColor: colors.workSoft},
  taskDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.work},
  taskInfo: {flex: 1, gap: 4},
  queueTitle: {color: colors.text, fontWeight: '700'},
  meta: {color: colors.textMuted, fontSize: 11},
  chevron: {color: colors.work},
  empty: {color: colors.textMuted, padding: spacing.md},
  tip: {backgroundColor: colors.surface, borderRadius: 18, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 6},
  tipTitle: {color: colors.text, fontWeight: '800'},
  tipText: {color: colors.textMuted, lineHeight: 19},
});
