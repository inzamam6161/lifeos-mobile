import React, {useCallback, useEffect, useState} from 'react';
import {Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../app/hooks';
import {
  cancelReminder,
  completeReminder,
  loadReminders,
  resyncReminderNotifications,
  snoozeReminder,
} from '../features/reminders/remindersSlice';
import {reminderSelectors} from '../features/reminders/selectors';
import {
  getNotificationAccess,
  openExactAlarmSettings,
  requestNotificationAccess,
  type NotificationAccess,
} from '../services/notificationService';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import type {RootStackParamList} from '../types/navigation';
import {formatShortDateTime} from '../utils/dateTime';
import type {Reminder} from '../features/reminders/types';

function ReminderRow({item}: {item: Reminder}) {
  const dispatch = useAppDispatch();
  const overdue = new Date(item.scheduledAt).getTime() < Date.now();
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={[styles.meta, overdue && styles.overdue]}>
            {overdue ? 'OVERDUE · ' : ''}{formatShortDateTime(item.scheduledAt)}
          </Text>
        </View>
        {item.repeat !== 'none' ? <Text style={styles.repeat}>{item.repeat}</Text> : null}
      </View>
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
      <View style={styles.actions}>
        <Pressable onPress={() => void dispatch(completeReminder(item.id))} style={styles.primaryAction}>
          <Text style={styles.primaryActionText}>Done</Text>
        </Pressable>
        <Pressable onPress={() => void dispatch(snoozeReminder({id: item.id, minutes: 15}))} style={styles.action}>
          <Text style={styles.actionText}>+15m</Text>
        </Pressable>
        <Pressable onPress={() => void dispatch(snoozeReminder({id: item.id, minutes: 60}))} style={styles.action}>
          <Text style={styles.actionText}>+1h</Text>
        </Pressable>
        <Pressable onPress={() => void dispatch(cancelReminder(item.id))} style={styles.action}>
          <Text style={styles.dangerText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ReminderListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const reminders = useAppSelector(reminderSelectors.selectAll);
  const [access, setAccess] = useState<NotificationAccess | null>(null);

  const refreshAccess = useCallback(async () => {
    setAccess(await getNotificationAccess().catch(() => ({notifications: false, exactAlarms: Platform.OS !== 'android'})));
  }, []);

  useFocusEffect(useCallback(() => {
    void dispatch(loadReminders());
    void refreshAccess();
  }, [dispatch, refreshAccess]));

  useEffect(() => {
    if (access?.notifications && access.exactAlarms) void dispatch(resyncReminderNotifications());
  }, [access?.notifications, access?.exactAlarms, dispatch]);

  const overdue = reminders.filter(item => new Date(item.scheduledAt).getTime() < Date.now());
  const upcoming = reminders.filter(item => new Date(item.scheduledAt).getTime() >= Date.now());

  const enable = async () => {
    const next = await requestNotificationAccess();
    setAccess(next);
    if (next.notifications && next.exactAlarms) await dispatch(resyncReminderNotifications());
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>LIFEOS SCHEDULING</Text>
            <Text style={styles.title}>Reminders</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('ReminderEditor', {})} style={styles.add}>
            <Text style={styles.addText}>＋</Text>
          </Pressable>
        </View>

        {access && (!access.notifications || !access.exactAlarms) ? (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>Enable reliable local reminders</Text>
            <Text style={styles.notes}>
              LifeOS stores reminders offline. System notification access lets them alert you when the app is closed.
            </Text>
            {!access.notifications ? (
              <Pressable onPress={() => void enable()} style={styles.enable}><Text style={styles.enableText}>Enable notifications</Text></Pressable>
            ) : null}
            {Platform.OS === 'android' && access.notifications && !access.exactAlarms ? (
              <Pressable onPress={() => void openExactAlarmSettings()} style={styles.enable}><Text style={styles.enableText}>Allow exact alarms</Text></Pressable>
            ) : null}
          </View>
        ) : access ? (
          <View style={styles.readyCard}><Text style={styles.readyText}>✓ Local notifications ready</Text></View>
        ) : null}

        {overdue.length ? <Text style={styles.sectionTitle}>Needs attention</Text> : null}
        {overdue.map(item => <ReminderRow key={item.id} item={item} />)}

        <Text style={styles.sectionTitle}>Upcoming</Text>
        {upcoming.length ? upcoming.map(item => <ReminderRow key={item.id} item={item} />) : (
          <View style={styles.empty}><Text style={styles.emptyTitle}>No upcoming reminders</Text><Text style={styles.notes}>Add one and it will be stored locally first.</Text></View>
        )}
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
  title: {color: colors.text, fontSize: 28, fontWeight: '900'},
  add: {width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  addText: {color: colors.white, fontSize: 24, fontWeight: '900'},
  permissionCard: {backgroundColor: colors.accentSoft, borderRadius: 20, padding: spacing.md, borderWidth: 1, borderColor: colors.accent, gap: spacing.sm},
  permissionTitle: {color: colors.text, fontSize: 16, fontWeight: '900'},
  enable: {minHeight: 46, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center'},
  enableText: {color: colors.white, fontWeight: '900'},
  readyCard: {backgroundColor: colors.surface, borderRadius: 16, padding: spacing.sm, borderWidth: 1, borderColor: colors.success},
  readyText: {color: colors.success, fontWeight: '800'},
  sectionTitle: {color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 4},
  row: {backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm},
  rowTop: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
  rowText: {flex: 1, gap: 3},
  rowTitle: {color: colors.text, fontSize: 16, fontWeight: '800'},
  meta: {color: colors.textMuted, fontSize: 11, fontWeight: '700'},
  overdue: {color: colors.danger},
  repeat: {color: colors.study, backgroundColor: colors.studySoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, overflow: 'hidden', fontSize: 10, fontWeight: '800', textTransform: 'uppercase'},
  notes: {color: colors.textMuted, fontSize: 13, lineHeight: 19},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  primaryAction: {minHeight: 38, paddingHorizontal: 14, borderRadius: 11, backgroundColor: colors.success, justifyContent: 'center'},
  primaryActionText: {color: colors.background, fontWeight: '900'},
  action: {minHeight: 38, paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, justifyContent: 'center'},
  actionText: {color: colors.text, fontWeight: '800', fontSize: 12},
  dangerText: {color: colors.danger, fontWeight: '800', fontSize: 12},
  empty: {backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 5},
  emptyTitle: {color: colors.text, fontWeight: '800'},
});
