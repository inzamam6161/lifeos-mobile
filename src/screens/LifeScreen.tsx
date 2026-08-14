import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {RootStackParamList} from '../types/navigation';

const modules = [
  ['🗂️', 'Tasks & Projects', 'Boards, cards and priorities', 'TaskBoards'],
  ['🔔', 'Reminders', 'Schedules, recurrence and local alerts', 'Reminders'],
  ['💰', 'Money', 'Expenses, budgets and bills', 'Money'],
  ['🏋️', 'Fitness', 'Workouts and progress', 'Gym'],
  ['📚', 'Learning', 'Study materials and sessions', 'Study'],
  ['🎯', 'Goals', 'Milestones and progress', 'Goals'],
  ['🔁', 'Habits', 'Routines and streaks', 'Habits'],
  ['🛒', 'Shopping', 'Lists, grocery and budget', 'ShoppingMode'],
  ['📄', 'Documents', 'Private life vault', null],
] as const;

export function LifeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Life</Text>
        <Text style={styles.subtitle}>Everything you manage in one place.</Text>
        <View style={styles.grid}>
          {modules.map(([emoji, title, description, routeName]) => (
            <Pressable
              disabled={!routeName}
              onPress={() => {
                if (routeName === 'TaskBoards') navigation.navigate('TaskBoards');
                if (routeName === 'Reminders') navigation.navigate('Reminders');
                if (routeName === 'Money') navigation.navigate('Money');
                if (routeName === 'ShoppingMode') navigation.navigate('ShoppingMode');
                if (routeName === 'Gym') navigation.navigate('Gym');
                if (routeName === 'Study') navigation.navigate('Study');
                if (routeName === 'Goals') navigation.navigate('Goals');
                if (routeName === 'Habits') navigation.navigate('Habits');
              }}
              style={({pressed}) => [styles.card, !routeName && styles.comingSoon, pressed && styles.pressed]}
              key={title}>
              <View style={styles.cardTop}>
                <Text style={styles.emoji}>{emoji}</Text>
                <Text style={[styles.badge, routeName && styles.badgeLive]}>{routeName ? 'LIVE' : 'SOON'}</Text>
              </View>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: 120},
  title: {color: colors.text, fontSize: 30, fontWeight: '800'},
  subtitle: {color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  card: {width: '48%', minHeight: 160, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: spacing.md, gap: 8},
  comingSoon: {opacity: 0.62},
  pressed: {opacity: 0.75},
  cardTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  emoji: {fontSize: 26},
  badge: {color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1},
  badgeLive: {color: colors.success},
  cardTitle: {color: colors.text, fontWeight: '800', fontSize: 16},
  description: {color: colors.textMuted, fontSize: 12, lineHeight: 18},
});
