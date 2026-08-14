import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {addSubtask, toggleSubtask, toggleTaskLabel} from '../features/tasks/boardsSlice';
import {selectLabels, selectSubtasks, selectTaskLabels, taskSelectors} from '../features/tasks/selectors';
import {deleteTask, updateTask} from '../features/tasks/tasksSlice';
import {TaskPriority} from '../features/tasks/types';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {RootStackParamList} from '../types/navigation';
import {formatShortDateTime, schedulePreset} from '../utils/dateTime';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;

export function TaskDetailScreen({route, navigation}: Props) {
  const {taskId} = route.params;
  const dispatch = useAppDispatch();
  const task = useAppSelector(state => taskSelectors.selectById(state, taskId));
  const labels = useAppSelector(selectLabels);
  const allSubtasks = useAppSelector(selectSubtasks);
  const taskLabels = useAppSelector(selectTaskLabels);
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [estimate, setEstimate] = useState(task?.estimateMinutes ? String(task.estimateMinutes) : '');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const subtasks = useMemo(() => allSubtasks.filter(item => item.taskId === taskId).sort((a, b) => a.position - b.position), [allSubtasks, taskId]);
  const attachedLabelIds = taskLabels[taskId] ?? [];

  if (!task) {
    return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Task no longer exists.</Text></SafeAreaView>;
  }

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const parsedEstimate = estimate.trim() ? Number(estimate) : null;
      await dispatch(updateTask({
        id: task.id,
        title,
        notes: notes.trim() || null,
        estimateMinutes: parsedEstimate != null && Number.isFinite(parsedEstimate) ? Math.max(1, Math.round(parsedEstimate)) : null,
      })).unwrap();
    } finally {
      setSaving(false);
    }
  };

  const setPriority = (priority: TaskPriority) => {
    void dispatch(updateTask({id: task.id, priority}));
  };

  const addChild = async () => {
    const value = subtaskTitle.trim();
    if (!value) return;
    await dispatch(addSubtask({taskId: task.id, title: value})).unwrap();
    setSubtaskTitle('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerText}><Text style={styles.eyebrow}>TASK DETAILS</Text><Text style={styles.headerTitle}>Card</Text></View>
          {task.context === 'work' ? <Pressable onPress={() => navigation.navigate('WorkMode', {taskId})} style={styles.focus}><Text style={styles.focusText}>Focus</Text></Pressable> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.labelTitle}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor={colors.textMuted} />
          <Text style={styles.labelTitle}>Notes</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input, styles.notes]} placeholder="Add context, links or acceptance criteria…" placeholderTextColor={colors.textMuted} />
          <Text style={styles.labelTitle}>Estimate (minutes)</Text>
          <TextInput value={estimate} onChangeText={setEstimate} keyboardType="number-pad" style={styles.input} placeholder="25" placeholderTextColor={colors.textMuted} />
          <Pressable disabled={!title.trim() || saving} onPress={() => void save()} style={[styles.save, (!title.trim() || saving) && styles.disabled]}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text></Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <Text style={styles.meta}>{task.startAt ? formatShortDateTime(task.startAt) : 'Not scheduled'}</Text>
          </View>
          <View style={styles.chips}>
            <Pressable onPress={() => void dispatch(updateTask({id: task.id, startAt: schedulePreset('in1h')}))} style={styles.chip}><Text style={styles.chipText}>+1 hour</Text></Pressable>
            <Pressable onPress={() => void dispatch(updateTask({id: task.id, startAt: schedulePreset('tomorrow9')}))} style={styles.chip}><Text style={styles.chipText}>Tomorrow 9</Text></Pressable>
            <Pressable onPress={() => void dispatch(updateTask({id: task.id, startAt: null}))} style={styles.chip}><Text style={styles.chipText}>Clear</Text></Pressable>
          </View>
          <Pressable onPress={() => navigation.navigate('ReminderEditor', {taskId: task.id, title: task.title, context: task.context})} style={styles.reminderButton}>
            <Text style={styles.reminderButtonText}>🔔 Add reminder for this task</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority</Text>
          <View style={styles.chips}>
            {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(priority => (
              <Pressable key={priority} onPress={() => setPriority(priority)} style={[styles.chip, task.priority === priority && styles.chipActive]}>
                <Text style={[styles.chipText, task.priority === priority && styles.chipTextActive]}>{priority}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Labels</Text>
          <View style={styles.chips}>
            {labels.map(label => {
              const attached = attachedLabelIds.includes(label.id);
              return (
                <Pressable key={label.id} onPress={() => void dispatch(toggleTaskLabel({taskId, labelId: label.id, attached}))} style={[styles.chip, attached && styles.chipActive]}>
                  <Text style={[styles.chipText, attached && styles.chipTextActive]}>{label.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.rowBetween}><Text style={styles.sectionTitle}>Subtasks</Text><Text style={styles.meta}>{subtasks.filter(item => item.completed).length}/{subtasks.length}</Text></View>
          <View style={styles.subtaskCapture}>
            <TextInput value={subtaskTitle} onChangeText={setSubtaskTitle} onSubmitEditing={() => void addChild()} style={styles.subtaskInput} placeholder="Add subtask…" placeholderTextColor={colors.textMuted} />
            <Pressable onPress={() => void addChild()} disabled={!subtaskTitle.trim()} style={[styles.subtaskAdd, !subtaskTitle.trim() && styles.disabled]}><Text style={styles.subtaskAddText}>＋</Text></Pressable>
          </View>
          {subtasks.map(item => (
            <Pressable key={item.id} onPress={() => void dispatch(toggleSubtask({id: item.id, completed: !item.completed}))} style={styles.subtaskRow}>
              <View style={[styles.check, item.completed && styles.checkDone]}><Text style={styles.checkText}>{item.completed ? '✓' : ''}</Text></View>
              <Text style={[styles.subtaskText, item.completed && styles.subtaskDone]}>{item.title}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={async () => { await dispatch(deleteTask(task.id)).unwrap(); navigation.goBack(); }} style={styles.delete}><Text style={styles.deleteText}>Delete task</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: 80, gap: spacing.md},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  back: {width: 42, height: 42, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  backText: {color: colors.text, fontSize: 30, marginTop: -3},
  headerText: {flex: 1},
  eyebrow: {color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1},
  headerTitle: {color: colors.text, fontSize: 24, fontWeight: '900'},
  focus: {backgroundColor: colors.work, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10},
  focusText: {color: colors.white, fontWeight: '900'},
  section: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: spacing.md, gap: spacing.sm},
  sectionTitle: {color: colors.text, fontSize: 16, fontWeight: '800'},
  labelTitle: {color: colors.textMuted, fontSize: 11, fontWeight: '800', marginTop: 2},
  input: {minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, color: colors.text, paddingHorizontal: spacing.sm, fontSize: 16},
  notes: {minHeight: 110, paddingTop: spacing.sm, textAlignVertical: 'top'},
  save: {minHeight: 48, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  saveText: {color: colors.white, fontWeight: '900'},
  disabled: {opacity: 0.35},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: colors.surfaceElevated},
  chipActive: {borderColor: colors.accent, backgroundColor: colors.accentSoft},
  chipText: {color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'capitalize'},
  chipTextActive: {color: colors.text},
  rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  meta: {color: colors.textMuted, fontSize: 12},
  subtaskCapture: {flexDirection: 'row', gap: 8},
  subtaskInput: {flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.sm, fontSize: 16},
  subtaskAdd: {width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  subtaskAddText: {color: colors.white, fontSize: 22, fontWeight: '900'},
  subtaskRow: {minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
  check: {width: 23, height: 23, borderRadius: 7, borderWidth: 1, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center'},
  checkDone: {backgroundColor: colors.success, borderColor: colors.success},
  checkText: {color: colors.background, fontWeight: '900'},
  subtaskText: {flex: 1, color: colors.text, fontWeight: '600'},
  subtaskDone: {color: colors.textMuted, textDecorationLine: 'line-through'},
  reminderButton: {minHeight: 46, borderRadius: 13, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  reminderButtonText: {color: colors.text, fontWeight: '800'},
  delete: {minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center'},
  deleteText: {color: colors.danger, fontWeight: '800'},
  empty: {color: colors.text, padding: spacing.lg},
});
