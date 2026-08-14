import React, {useCallback, useMemo} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {ModeCard} from '../components/ModeCard';
import {ProgressBar} from '../components/ProgressBar';
import {SectionCard} from '../components/SectionCard';
import {OfflineTaskCapture} from '../features/tasks/OfflineTaskCapture';
import {selectTaskSummary, taskSelectors} from '../features/tasks/selectors';
import {reminderSelectors} from '../features/reminders/selectors';
import {selectMoneySummary} from '../features/money/selectors';
import {selectActiveWorkout, selectGymSummary} from '../features/gym/selectors';
import {selectActiveStudySession, selectStudySummary} from '../features/study/selectors';
import {selectTodayProgress} from '../features/progress/selectors';
import {loadProgress, toggleHabitToday} from '../features/progress/progressSlice';
import {completeReminder, snoozeReminder} from '../features/reminders/remindersSlice';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {RootStackParamList} from '../types/navigation';
import {endOfLocalDay, formatTime, formatTodayHeader, greetingFor, startOfLocalDay} from '../utils/dateTime';
import {formatMoney} from '../utils/money';

export function TodayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const taskSummary = useAppSelector(selectTaskSummary);
  const tasks = useAppSelector(taskSelectors.selectAll);
  const reminders = useAppSelector(reminderSelectors.selectAll);
  const moneySummary = useAppSelector(selectMoneySummary);
  const gymSummary = useAppSelector(selectGymSummary);
  const activeWorkout = useAppSelector(selectActiveWorkout);
  const studySummary = useAppSelector(selectStudySummary);
  const activeStudy = useAppSelector(selectActiveStudySession);
  const progress = useAppSelector(selectTodayProgress);
  useFocusEffect(useCallback(() => { void dispatch(loadProgress()); }, [dispatch]));
  const completion = taskSummary.total ? taskSummary.completed / taskSummary.total : 0;
  const completionPercent = Math.round(completion * 100);
  const now = Date.now();
  const dayStart = startOfLocalDay().getTime();
  const dayEnd = endOfLocalDay().getTime();

  const scheduledTasks = useMemo(() => tasks
    .filter(task => task.status !== 'done' && task.startAt)
    .filter(task => {
      const time = new Date(task.startAt as string).getTime();
      return time >= dayStart && time <= dayEnd;
    })
    .sort((a, b) => (a.startAt as string).localeCompare(b.startAt as string)), [tasks, dayStart, dayEnd]);

  const todayReminders = useMemo(() => reminders
    .filter(item => {
      const time = new Date(item.scheduledAt).getTime();
      return time >= dayStart && time <= dayEnd;
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)), [reminders, dayStart, dayEnd]);

  const overdueTasks = tasks.filter(task => task.status !== 'done' && task.dueAt && new Date(task.dueAt).getTime() < now);
  const overdueReminders = reminders.filter(item => new Date(item.scheduledAt).getTime() < now);

  const timeline = [
    ...scheduledTasks.map(task => ({id: task.id, kind: 'task' as const, time: task.startAt as string, title: task.title, meta: `${task.context} · ${task.estimateMinutes ?? '—'} min`})),
    ...todayReminders.map(item => ({id: item.id, kind: 'reminder' as const, time: item.scheduledAt, title: item.title, meta: `Reminder · ${item.context}`})),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const next = timeline.find(item => new Date(item.time).getTime() >= now) ?? timeline[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{formatTodayHeader()}</Text>
            <Text style={styles.title}>{greetingFor()} 👋</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Reminders')} style={styles.bell}><Text style={styles.bellText}>🔔</Text></Pressable>
        </View>

        {(overdueTasks.length + overdueReminders.length) > 0 ? (
          <Pressable onPress={() => navigation.navigate('Reminders')} style={styles.attention}>
            <Text style={styles.attentionTitle}>{overdueTasks.length + overdueReminders.length} item(s) need attention</Text>
            <Text style={styles.muted}>{overdueTasks.length} overdue tasks · {overdueReminders.length} overdue reminders</Text>
          </Pressable>
        ) : null}

        <SectionCard>
          <View style={styles.rowBetween}><Text style={styles.cardHeading}>Today's Plan</Text><Text style={styles.muted}>{completionPercent}%</Text></View>
          <ProgressBar value={completion} />
          <Text style={styles.muted}>{scheduledTasks.length} scheduled tasks · {todayReminders.length} reminders today</Text>
        </SectionCard>

        <View style={styles.statsGrid}>
          <View style={styles.stat}><Text style={styles.statLabel}>Tasks</Text><Text style={styles.statValue}>{taskSummary.completed}/{taskSummary.total}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Scheduled</Text><Text style={styles.statValue}>{scheduledTasks.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Reminders</Text><Text style={styles.statValue}>{todayReminders.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Overdue</Text><Text style={[styles.statValue, (overdueTasks.length + overdueReminders.length) > 0 && styles.danger]}>{overdueTasks.length + overdueReminders.length}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Smart Modes</Text>
        <View style={styles.modeRow}>
          {(['work', 'gym', 'shopping'] as const).map(mode => (
            <ModeCard key={mode} mode={mode} onPress={() => mode === 'work' ? navigation.navigate('WorkMode', {}) : mode === 'shopping' ? navigation.navigate('ShoppingMode') : navigation.navigate('Gym')} />
          ))}
        </View>

        <Pressable onPress={() => activeWorkout ? navigation.navigate('WorkoutSession') : navigation.navigate('Gym')}>
          <SectionCard title="Fitness">
            <View style={styles.rowBetween}>
              <View style={styles.gap4}><Text style={styles.primaryText}>{activeWorkout ? `${activeWorkout.title} in progress` : `${gymSummary.weekSessions} workout${gymSummary.weekSessions === 1 ? '' : 's'} this week`}</Text><Text style={styles.muted}>{activeWorkout ? 'Continue your active Gym Mode session' : `${Math.round(gymSummary.totalVolumeKg).toLocaleString()} kg tracked volume`}</Text></View>
              <Text style={[styles.pill, styles.gymPill]}>{activeWorkout ? 'ACTIVE' : 'GYM'}</Text>
            </View>
          </SectionCard>
        </Pressable>

        <Pressable onPress={() => activeStudy ? navigation.navigate('StudySession') : navigation.navigate('Study')}>
          <SectionCard title="Learning">
            <View style={styles.rowBetween}>
              <View style={styles.gap4}><Text style={styles.primaryText}>{activeStudy ? 'Study session in progress' : `${studySummary.weekMinutes} minutes studied this week`}</Text><Text style={styles.muted}>{activeStudy ? 'Continue your focused session' : `${studySummary.dueCards} flashcards due · ${studySummary.materials} materials`}</Text></View>
              <Text style={[styles.pill, styles.studyPill]}>{activeStudy ? 'ACTIVE' : 'STUDY'}</Text>
            </View>
          </SectionCard>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Money')}>
          <SectionCard title="Money today">
            <View style={styles.rowBetween}>
              <View style={styles.gap4}><Text style={styles.primaryText}>{formatMoney(moneySummary.expenseMinor)} spent this month</Text><Text style={styles.muted}>Safe to spend · {formatMoney(moneySummary.safeToSpendMinor)}</Text></View>
              <Text style={[styles.pill, styles.moneyPill]}>MONEY</Text>
            </View>
          </SectionCard>
        </Pressable>


        <SectionCard title="Daily Rhythm">
          <View style={styles.rowBetween}>
            <View style={styles.gap4}><Text style={styles.primaryText}>{progress.habits.filter(h => h.completedToday).length}/{progress.habits.length} habits complete</Text><Text style={styles.muted}>Life score · {progress.lifeScore.total}%</Text></View>
            <Pressable onPress={() => navigation.navigate('Habits')}><Text style={styles.actionText}>All habits →</Text></Pressable>
          </View>
          <View style={styles.habitList}>
            {progress.habits.slice(0, 4).map(habit => (
              <Pressable key={habit.id} onPress={() => void dispatch(toggleHabitToday(habit.id))} style={[styles.habitChip, habit.completedToday && styles.habitChipDone]}>
                <Text style={styles.habitEmoji}>{habit.icon}</Text><Text style={[styles.habitText, habit.completedToday && styles.habitTextDone]}>{habit.name}</Text><Text style={styles.habitCheck}>{habit.completedToday ? '✓' : '○'}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => navigation.navigate('LifeReview', {type: 'daily'})} style={styles.reviewButton}><Text style={styles.reviewButtonText}>✦ Daily Review</Text></Pressable>
        </SectionCard>

        <SectionCard title="Offline Quick Capture"><OfflineTaskCapture /></SectionCard>

        <SectionCard title="Next Up">
          {next ? (
            <View style={styles.rowBetween}>
              <View style={styles.gap4}><Text style={styles.primaryText}>{next.title}</Text><Text style={styles.muted}>{formatTime(next.time)} · {next.meta}</Text></View>
              <Text style={styles.pill}>{next.kind === 'reminder' ? 'REMIND' : 'TASK'}</Text>
            </View>
          ) : <Text style={styles.muted}>Nothing scheduled. Your day is clear.</Text>}
        </SectionCard>

        <SectionCard title="Today's Timeline">
          {timeline.length ? timeline.map((item, index) => (
            <View style={styles.timelineRow} key={`${item.kind}-${item.id}`}>
              <Text style={styles.time}>{formatTime(item.time)}</Text>
              <View style={styles.timelineLineWrap}><View style={[styles.dot, item.kind === 'reminder' && styles.reminderDot]} />{index < timeline.length - 1 ? <View style={styles.line} /> : null}</View>
              <View style={styles.timelineText}>
                <Text style={styles.primaryText}>{item.title}</Text><Text style={styles.muted}>{item.meta}</Text>
                {item.kind === 'reminder' ? <View style={styles.inlineActions}><Pressable onPress={() => void dispatch(completeReminder(item.id))}><Text style={styles.actionText}>Done</Text></Pressable><Pressable onPress={() => void dispatch(snoozeReminder({id: item.id, minutes: 15}))}><Text style={styles.actionText}>Snooze 15m</Text></Pressable></View> : null}
              </View>
            </View>
          )) : <Text style={styles.muted}>Schedule a task or reminder to build your timeline.</Text>}
        </SectionCard>

        <Pressable onPress={() => navigation.navigate('ReminderEditor', {})} style={styles.newReminder}><Text style={styles.newReminderText}>＋ Add reminder</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background}, content: {padding: spacing.md, paddingBottom: 120, gap: spacing.md},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, eyebrow: {color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2}, title: {color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 4},
  bell: {width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'}, bellText: {fontSize: 20},
  attention: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger, borderRadius: 18, padding: spacing.md, gap: 4}, attentionTitle: {color: colors.danger, fontWeight: '900'},
  cardHeading: {color: colors.text, fontSize: 17, fontWeight: '700'}, muted: {color: colors.textMuted, fontSize: 13}, rowBetween: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  statsGrid: {flexDirection: 'row', gap: spacing.xs}, stat: {flex: 1, minHeight: 76, backgroundColor: colors.surface, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: colors.border, justifyContent: 'space-between'}, statLabel: {color: colors.textMuted, fontSize: 10}, statValue: {color: colors.text, fontWeight: '800', fontSize: 16}, danger: {color: colors.danger},
  sectionTitle: {color: colors.text, fontSize: 18, fontWeight: '800'}, modeRow: {flexDirection: 'row', gap: spacing.xs}, gap4: {gap: 4, flex: 1}, primaryText: {color: colors.text, fontSize: 15, fontWeight: '600'}, pill: {color: colors.work, backgroundColor: colors.workSoft, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6, fontSize: 10, fontWeight: '900', overflow: 'hidden'},
  timelineRow: {flexDirection: 'row', minHeight: 60}, time: {width: 70, color: colors.textMuted, fontSize: 11, paddingTop: 2}, timelineLineWrap: {width: 24, alignItems: 'center'}, dot: {width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent, marginTop: 4}, reminderDot: {backgroundColor: colors.warning}, line: {width: 1, flex: 1, backgroundColor: colors.border, marginTop: 4}, timelineText: {flex: 1, gap: 4, paddingBottom: 14}, inlineActions: {flexDirection: 'row', gap: 16, marginTop: 3}, actionText: {color: colors.accent, fontSize: 11, fontWeight: '800'},
  moneyPill: {color: colors.shopping, backgroundColor: colors.shoppingSoft},
  gymPill: {color: colors.gym, backgroundColor: colors.gymSoft},
  studyPill: {color: colors.study, backgroundColor: colors.studySoft},
  habitList: {gap: 8, marginTop: 12}, habitChip: {minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10}, habitChipDone: {borderColor: colors.success, backgroundColor: colors.gymSoft}, habitEmoji: {fontSize: 16}, habitText: {flex: 1, color: colors.text, fontWeight: '700'}, habitTextDone: {color: colors.textMuted, textDecorationLine: 'line-through'}, habitCheck: {color: colors.success, fontWeight: '900', fontSize: 18}, reviewButton: {minHeight: 46, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 12}, reviewButtonText: {color: colors.accent, fontWeight: '900'},
  newReminder: {minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center'}, newReminderText: {color: colors.accent, fontWeight: '900'},
});
