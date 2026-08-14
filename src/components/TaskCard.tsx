import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Label, Subtask, Task} from '../features/tasks/types';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';

const priorityTone = {
  low: colors.textMuted,
  medium: colors.accent,
  high: colors.warning,
  urgent: colors.danger,
};

export function TaskCard({
  task,
  labels,
  subtasks,
  canMoveLeft,
  canMoveRight,
  onOpen,
  onMoveLeft,
  onMoveRight,
  onMoveUp,
  onMoveDown,
}: {
  task: Task;
  labels: Label[];
  subtasks: Subtask[];
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onOpen: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const doneSubtasks = subtasks.filter(item => item.completed).length;
  return (
    <View style={styles.card}>
      <Pressable onPress={onOpen} style={({pressed}) => pressed && styles.pressed}>
        <View style={styles.topRow}>
          <View style={[styles.priorityDot, {backgroundColor: priorityTone[task.priority]}]} />
          <Text style={styles.priority}>{task.priority.toUpperCase()}</Text>
          {task.estimateMinutes ? <Text style={styles.meta}>{task.estimateMinutes}m</Text> : null}
        </View>
        <Text style={styles.title}>{task.title}</Text>
        {labels.length ? (
          <View style={styles.labelRow}>
            {labels.slice(0, 3).map(label => (
              <Text key={label.id} style={styles.label}>{label.name}</Text>
            ))}
          </View>
        ) : null}
        <View style={styles.footer}>
          <Text style={styles.meta}>{task.dueAt ? `Due ${task.dueAt.slice(0, 10)}` : 'No due date'}</Text>
          {subtasks.length ? <Text style={styles.meta}>☑ {doneSubtasks}/{subtasks.length}</Text> : null}
        </View>
      </Pressable>
      <View style={styles.controls}>
        <Pressable disabled={!canMoveLeft} onPress={onMoveLeft} style={[styles.control, !canMoveLeft && styles.disabled]}><Text style={styles.controlText}>←</Text></Pressable>
        <Pressable onPress={onMoveUp} style={styles.control}><Text style={styles.controlText}>↑</Text></Pressable>
        <Pressable onPress={onMoveDown} style={styles.control}><Text style={styles.controlText}>↓</Text></Pressable>
        <Pressable disabled={!canMoveRight} onPress={onMoveRight} style={[styles.control, !canMoveRight && styles.disabled]}><Text style={styles.controlText}>→</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.sm, gap: spacing.sm},
  pressed: {opacity: 0.75},
  topRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  priorityDot: {width: 7, height: 7, borderRadius: 4},
  priority: {color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, flex: 1},
  title: {color: colors.text, fontWeight: '700', fontSize: 15, lineHeight: 20},
  meta: {color: colors.textMuted, fontSize: 11},
  footer: {flexDirection: 'row', justifyContent: 'space-between', gap: 8},
  labelRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  label: {color: colors.text, backgroundColor: colors.accentSoft, fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden'},
  controls: {flexDirection: 'row', gap: 6, paddingTop: 2},
  control: {flex: 1, minHeight: 34, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  controlText: {color: colors.text, fontWeight: '900'},
  disabled: {opacity: 0.25},
});
