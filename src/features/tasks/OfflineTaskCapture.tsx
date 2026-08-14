import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../app/hooks';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {taskSelectors} from './selectors';
import {addTask, toggleTask} from './tasksSlice';

const contextEmoji = {
  personal: '◉',
  work: '💼',
  study: '📚',
  gym: '🏋️',
  shopping: '🛒',
};

export function OfflineTaskCapture() {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(taskSelectors.selectAll);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const visibleTasks = useMemo(() => tasks.slice(0, 5), [tasks]);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await dispatch(addTask({title: trimmed})).unwrap();
      setTitle('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.captureRow}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={() => void submit()}
          placeholder="Add something to LifeOS…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          returnKeyType="done"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add task offline"
          disabled={!title.trim() || saving}
          onPress={() => void submit()}
          style={({pressed}) => [
            styles.addButton,
            (!title.trim() || saving) && styles.addButtonDisabled,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.addText}>＋</Text>
        </Pressable>
      </View>

      <Text style={styles.localLabel}>DEVICE DATABASE · {tasks.length} TASKS</Text>

      {visibleTasks.map(task => {
        const completed = task.status === 'done';
        return (
          <Pressable
            key={task.id}
            accessibilityRole="checkbox"
            accessibilityState={{checked: completed}}
            onPress={() =>
              void dispatch(toggleTask({id: task.id, completed: !completed}))
            }
            style={({pressed}) => [styles.taskRow, pressed && styles.pressed]}>
            <View style={[styles.check, completed && styles.checkDone]}>
              <Text style={styles.checkText}>{completed ? '✓' : ''}</Text>
            </View>
            <Text style={[styles.taskTitle, completed && styles.taskDone]} numberOfLines={2}>
              {task.title}
            </Text>
            <Text style={styles.context}>{contextEmoji[task.context]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: spacing.sm},
  captureRow: {flexDirection: 'row', gap: spacing.xs},
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {opacity: 0.4},
  addText: {color: colors.white, fontSize: 24, fontWeight: '700'},
  localLabel: {color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1},
  taskRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {backgroundColor: colors.success, borderColor: colors.success},
  checkText: {color: colors.background, fontWeight: '900'},
  taskTitle: {flex: 1, color: colors.text, fontWeight: '600', lineHeight: 20},
  taskDone: {color: colors.textMuted, textDecorationLine: 'line-through'},
  context: {fontSize: 16},
  pressed: {opacity: 0.75},
});
