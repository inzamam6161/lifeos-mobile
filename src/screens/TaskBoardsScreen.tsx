import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppSelector} from '../app/hooks';
import {taskSelectors} from '../features/tasks/selectors';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskBoards'>;

export function TaskBoardsScreen({navigation}: Props) {
  const boards = useAppSelector(state => state.boards.boards);
  const tasks = useAppSelector(taskSelectors.selectAll);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TASKS & PROJECTS</Text>
            <Text style={styles.title}>Your boards</Text>
            <Text style={styles.subtitle}>Offline workspace for everything that needs action.</Text>
          </View>
          <Pressable onPress={() => navigation.goBack()} style={styles.close}><Text style={styles.closeText}>Done</Text></Pressable>
        </View>

        {boards.map(board => {
          const boardTasks = tasks.filter(task => task.boardId === board.id);
          const completed = boardTasks.filter(task => task.status === 'done').length;
          return (
            <Pressable key={board.id} onPress={() => navigation.navigate('TaskBoard', {boardId: board.id})} style={({pressed}) => [styles.board, pressed && styles.pressed]}>
              <View style={styles.icon}><Text style={styles.iconText}>{board.icon}</Text></View>
              <View style={styles.boardInfo}>
                <Text style={styles.boardTitle}>{board.name}</Text>
                <Text style={styles.boardMeta}>{boardTasks.length} cards · {completed} completed</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, {width: `${boardTasks.length ? Math.round((completed / boardTasks.length) * 100) : 0}%`}]} />
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        })}

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Milestone 3 board engine</Text>
          <Text style={styles.noteText}>Cards, columns, priority, subtasks, labels, search and focus sessions all persist in SQLite.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: 80, gap: spacing.md},
  header: {flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.sm},
  eyebrow: {color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2},
  title: {color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 4},
  subtitle: {color: colors.textMuted, lineHeight: 19, marginTop: 6, maxWidth: 280},
  close: {borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9},
  closeText: {color: colors.text, fontWeight: '800'},
  board: {flexDirection: 'row', alignItems: 'center', minHeight: 108, padding: spacing.md, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.md},
  pressed: {opacity: 0.75},
  icon: {width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center'},
  iconText: {fontSize: 24},
  boardInfo: {flex: 1, gap: 5},
  boardTitle: {color: colors.text, fontSize: 18, fontWeight: '800'},
  boardMeta: {color: colors.textMuted, fontSize: 12},
  progressTrack: {height: 4, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden', marginTop: 4},
  progressFill: {height: '100%', backgroundColor: colors.accent},
  chevron: {color: colors.textMuted, fontSize: 30},
  note: {backgroundColor: colors.accentSoft, borderRadius: 18, padding: spacing.md, gap: 6, marginTop: spacing.sm},
  noteTitle: {color: colors.text, fontWeight: '800'},
  noteText: {color: colors.textMuted, lineHeight: 19},
});
