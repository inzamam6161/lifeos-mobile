import React, {PropsWithChildren, useEffect, useState} from 'react';
import {ActivityIndicator, AppState, Pressable, StyleSheet, Text, View} from 'react-native';
import {initializeLocalData} from '../data/database/bootstrap';
import {initializeSecureDatabase} from '../security/databaseSecurity';
import {loadTaskSystem} from '../features/tasks/boardsSlice';
import {loadTasks} from '../features/tasks/tasksSlice';
import {loadReminders} from '../features/reminders/remindersSlice';
import {loadMoney} from '../features/money/moneySlice';
import {loadShopping} from '../features/shopping/shoppingSlice';
import {loadGym} from '../features/gym/gymSlice';
import {loadStudy} from '../features/study/studySlice';
import {loadProgress} from '../features/progress/progressSlice';
import {syncReminderNotifications} from '../services/notificationService';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {useAppDispatch} from './hooks';
import {performanceNow} from '../observability/performance';
import {recordPerformanceMetric} from '../observability/diagnosticsRepository';
import {reportCaughtError} from '../observability/crashReporter';

export function AppBootstrap({children}: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const [state, setState] = useState<'booting' | 'ready' | 'error'>('booting');
  const [error, setError] = useState('');

  const boot = async () => {
    setState('booting');
    setError('');
    const startedAt = performanceNow();
    try {
      await initializeSecureDatabase();
      await initializeLocalData();
      await Promise.all([
        dispatch(loadTasks()).unwrap(),
        dispatch(loadTaskSystem()).unwrap(),
        dispatch(loadReminders()).unwrap(),
        dispatch(loadMoney()).unwrap(),
        dispatch(loadShopping()).unwrap(),
        dispatch(loadGym()).unwrap(),
        dispatch(loadStudy()).unwrap(),
        dispatch(loadProgress()).unwrap(),
      ]);
      await syncReminderNotifications().catch(() => undefined);
      await recordPerformanceMetric('app_bootstrap', performanceNow() - startedAt, 'status=ready');
      setState('ready');
    } catch (reason) {
      await reportCaughtError(reason, 'AppBootstrap.boot').catch(() => undefined);
      await recordPerformanceMetric('app_bootstrap', performanceNow() - startedAt, 'status=error').catch(() => undefined);
      setError(reason instanceof Error ? reason.message : 'Unknown startup error');
      setState('error');
    }
  };

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active' || state !== 'ready') return;
      void dispatch(loadReminders()).unwrap().then(() => syncReminderNotifications()).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [dispatch, state]);

  if (state === 'ready') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.logo}><Text style={styles.logoText}>L</Text></View>
      <Text accessibilityRole="header" style={styles.title}>LifeOS</Text>
      {state === 'booting' ? (
        <>
          <ActivityIndicator accessibilityLabel="LifeOS is starting" color={colors.accent} size="large" />
          <Text style={styles.message}>Preparing your private local workspace…</Text>
        </>
      ) : (
        <>
          <Text style={styles.errorTitle}>Local database could not start.</Text>
          <Text style={styles.message}>{error}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Retry LifeOS startup" onPress={() => void boot()} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {color: colors.text, fontSize: 30, fontWeight: '900'},
  title: {color: colors.text, fontSize: 30, fontWeight: '900'},
  message: {color: colors.textMuted, textAlign: 'center', lineHeight: 20},
  errorTitle: {color: colors.danger, fontWeight: '800', fontSize: 16},
  retryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {color: colors.white, fontWeight: '800'},
});
