import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {TaskCard} from '../components/TaskCard';
import {selectLabels, selectSubtasks, selectTaskLabels, taskSelectors} from '../features/tasks/selectors';
import {addTask, moveTask, reorderTask} from '../features/tasks/tasksSlice';
import {TaskPriority} from '../features/tasks/types';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskBoard'>;
type Filter = 'all' | TaskPriority;

export function TaskBoardScreen({route, navigation}: Props) {
  const {boardId} = route.params;
  const dispatch = useAppDispatch();
  const board = useAppSelector(state => state.boards.boards.find(item => item.id === boardId));
  const columns = useAppSelector(state => state.boards.columns.filter(item => item.boardId === boardId).sort((a, b) => a.position - b.position));
  const allTasks = useAppSelector(taskSelectors.selectAll);
  const labels = useAppSelector(selectLabels);
  const subtasks = useAppSelector(selectSubtasks);
  const taskLabels = useAppSelector(selectTaskLabels);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const tasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allTasks.filter(task => {
      if (task.boardId !== boardId) return false;
      if (filter !== 'all' && task.priority !== filter) return false;
      if (normalized && !`${task.title} ${task.notes ?? ''}`.toLowerCase().includes(normalized)) return false;
      return true;
    });
  }, [allTasks, boardId, filter, query]);

  const createCard = async () => {
    const title = newTitle.trim();
    if (!title || !board || !columns[0] || saving) return;
    setSaving(true);
    try {
      await dispatch(addTask({title, context: board.context, boardId, columnId: columns[0].id})).unwrap();
      setNewTitle('');
    } finally {
      setSaving(false);
    }
  };

  if (!board) return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Board not found.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{board.icon} {board.context.toUpperCase()}</Text>
          <Text style={styles.title}>{board.name}</Text>
        </View>
        {board.context === 'work' ? (
          <Pressable onPress={() => navigation.navigate('WorkMode', {})} style={styles.focus}><Text style={styles.focusText}>Focus</Text></Pressable>
        ) : null}
      </View>

      <View style={styles.tools}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search cards…" placeholderTextColor={colors.textMuted} style={styles.search} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['all', 'urgent', 'high', 'medium', 'low'] as Filter[]).map(item => (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.capture}>
          <TextInput value={newTitle} onChangeText={setNewTitle} onSubmitEditing={() => void createCard()} placeholder={`Add to ${columns[0]?.title ?? 'board'}…`} placeholderTextColor={colors.textMuted} style={styles.captureInput} />
          <Pressable disabled={!newTitle.trim() || saving} onPress={() => void createCard()} style={[styles.add, (!newTitle.trim() || saving) && styles.disabled]}><Text style={styles.addText}>＋</Text></Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardScroll}>
        {columns.map((column, columnIndex) => {
          const columnTasks = tasks.filter(task => task.columnId === column.id).sort((a, b) => a.sortOrder - b.sortOrder);
          return (
            <View key={column.id} style={styles.column}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnTitle}>{column.title}</Text>
                <Text style={styles.count}>{columnTasks.length}</Text>
              </View>
              <View style={styles.cards}>
                {columnTasks.map(task => {
                  const attachedLabels = labels.filter(label => (taskLabels[task.id] ?? []).includes(label.id));
                  const taskSubtasks = subtasks.filter(item => item.taskId === task.id);
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      labels={attachedLabels}
                      subtasks={taskSubtasks}
                      canMoveLeft={columnIndex > 0}
                      canMoveRight={columnIndex < columns.length - 1}
                      onOpen={() => navigation.navigate('TaskDetail', {taskId: task.id})}
                      onMoveLeft={() => columns[columnIndex - 1] && void dispatch(moveTask({id: task.id, columnId: columns[columnIndex - 1].id}))}
                      onMoveRight={() => columns[columnIndex + 1] && void dispatch(moveTask({id: task.id, columnId: columns[columnIndex + 1].id}))}
                      onMoveUp={() => void dispatch(reorderTask({id: task.id, direction: 'up'}))}
                      onMoveDown={() => void dispatch(reorderTask({id: task.id, direction: 'down'}))}
                    />
                  );
                })}
                {!columnTasks.length ? <Text style={styles.emptyColumn}>No cards</Text> : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {paddingHorizontal: spacing.md, paddingTop: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  back: {width: 42, height: 42, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  backText: {color: colors.text, fontSize: 30, marginTop: -3},
  headerText: {flex: 1},
  eyebrow: {color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1},
  title: {color: colors.text, fontSize: 24, fontWeight: '900'},
  focus: {backgroundColor: colors.work, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10},
  focusText: {color: colors.white, fontWeight: '900'},
  tools: {padding: spacing.md, gap: spacing.sm},
  search: {height: 46, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16},
  filters: {gap: 8},
  filter: {paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border},
  filterActive: {backgroundColor: colors.accentSoft, borderColor: colors.accent},
  filterText: {color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'capitalize'},
  filterTextActive: {color: colors.text},
  capture: {flexDirection: 'row', gap: spacing.xs},
  captureInput: {flex: 1, height: 46, borderRadius: 14, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16},
  add: {width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  addText: {color: colors.white, fontSize: 23, fontWeight: '900'},
  disabled: {opacity: 0.35},
  boardScroll: {paddingHorizontal: spacing.md, paddingBottom: 80, gap: spacing.sm, alignItems: 'flex-start'},
  column: {width: 300, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: spacing.sm, gap: spacing.sm},
  columnHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4},
  columnTitle: {color: colors.text, fontSize: 15, fontWeight: '800'},
  count: {color: colors.textMuted, backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', fontSize: 11},
  cards: {gap: spacing.sm},
  emptyColumn: {color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg},
  empty: {color: colors.text, padding: spacing.lg},
});
