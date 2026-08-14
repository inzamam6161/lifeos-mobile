import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AssistantScreen} from '../screens/AssistantScreen';
import {InsightsScreen} from '../screens/InsightsScreen';
import {LifeScreen} from '../screens/LifeScreen';
import {ModeScreen} from '../screens/ModeScreen';
import {TaskBoardScreen} from '../screens/TaskBoardScreen';
import {TaskBoardsScreen} from '../screens/TaskBoardsScreen';
import {TaskDetailScreen} from '../screens/TaskDetailScreen';
import {TodayScreen} from '../screens/TodayScreen';
import {WorkModeScreen} from '../screens/WorkModeScreen';
import {YouScreen} from '../screens/YouScreen';
import {ReminderListScreen} from '../screens/ReminderListScreen';
import {ReminderEditorScreen} from '../screens/ReminderEditorScreen';
import {MoneyScreen} from '../screens/MoneyScreen';
import {TransactionEditorScreen} from '../screens/TransactionEditorScreen';
import {BudgetScreen} from '../screens/BudgetScreen';
import {RecurringPaymentsScreen} from '../screens/RecurringPaymentsScreen';
import {ShoppingModeScreen} from '../screens/ShoppingModeScreen';
import {GymScreen} from '../screens/GymScreen';
import {WorkoutSessionScreen} from '../screens/WorkoutSessionScreen';
import {ExerciseLibraryScreen} from '../screens/ExerciseLibraryScreen';
import {ExerciseDetailScreen} from '../screens/ExerciseDetailScreen';
import {WorkoutHistoryScreen} from '../screens/WorkoutHistoryScreen';
import {StudyScreen} from '../screens/StudyScreen';
import {StudySubjectScreen} from '../screens/StudySubjectScreen';
import {StudyMaterialScreen} from '../screens/StudyMaterialScreen';
import {StudyNoteEditorScreen} from '../screens/StudyNoteEditorScreen';
import {FlashcardsScreen} from '../screens/FlashcardsScreen';
import {StudySessionScreen} from '../screens/StudySessionScreen';
import {GoalsScreen} from '../screens/GoalsScreen';
import {GoalDetailScreen} from '../screens/GoalDetailScreen';
import {HabitsScreen} from '../screens/HabitsScreen';
import {RoutinesScreen} from '../screens/RoutinesScreen';
import {RoutineRunScreen} from '../screens/RoutineRunScreen';
import {LifeReviewScreen} from '../screens/LifeReviewScreen';
import {AIModelScreen} from '../screens/AIModelScreen';
import {MemoryScreen} from '../screens/MemoryScreen';
import {SecurityScreen} from '../screens/SecurityScreen';
import {BackupScreen} from '../screens/BackupScreen';
import {DiagnosticsScreen} from '../screens/DiagnosticsScreen';

import {colors} from '../theme/colors';
import {MainTabParamList, RootStackParamList} from '../types/navigation';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, string> = {
  Today: '⌂',
  Life: '▦',
  Assistant: '◉',
  Insights: '⌁',
  You: '◎',
};

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {fontSize: 11, fontWeight: '700'},
        tabBarIcon: ({color}) => (
          <Text style={{color, fontSize: route.name === 'Assistant' ? 24 : 20}}>
            {tabIcons[route.name]}
          </Text>
        ),
      })}>
      <Tabs.Screen name="Today" component={TodayScreen} />
      <Tabs.Screen name="Life" component={LifeScreen} />
      <Tabs.Screen name="Assistant" component={AssistantScreen} />
      <Tabs.Screen name="Insights" component={InsightsScreen} />
      <Tabs.Screen name="You" component={YouScreen} />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{headerShown: false, animation: 'fade'}}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="Mode" component={ModeScreen} />
      <RootStack.Screen name="TaskBoards" component={TaskBoardsScreen} />
      <RootStack.Screen name="TaskBoard" component={TaskBoardScreen} />
      <RootStack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <RootStack.Screen name="WorkMode" component={WorkModeScreen} />
      <RootStack.Screen name="Reminders" component={ReminderListScreen} />
      <RootStack.Screen name="ReminderEditor" component={ReminderEditorScreen} />
      <RootStack.Screen name="Money" component={MoneyScreen} />
      <RootStack.Screen name="TransactionEditor" component={TransactionEditorScreen} />
      <RootStack.Screen name="Budgets" component={BudgetScreen} />
      <RootStack.Screen name="RecurringPayments" component={RecurringPaymentsScreen} />
      <RootStack.Screen name="ShoppingMode" component={ShoppingModeScreen} />
      <RootStack.Screen name="Gym" component={GymScreen} />
      <RootStack.Screen name="WorkoutSession" component={WorkoutSessionScreen} />
      <RootStack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
      <RootStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <RootStack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
      <RootStack.Screen name="Study" component={StudyScreen} />
      <RootStack.Screen name="StudySubject" component={StudySubjectScreen} />
      <RootStack.Screen name="StudyMaterial" component={StudyMaterialScreen} />
      <RootStack.Screen name="StudyNoteEditor" component={StudyNoteEditorScreen} />
      <RootStack.Screen name="Flashcards" component={FlashcardsScreen} />
      <RootStack.Screen name="StudySession" component={StudySessionScreen} />
      <RootStack.Screen name="Goals" component={GoalsScreen} />
      <RootStack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <RootStack.Screen name="Habits" component={HabitsScreen} />
      <RootStack.Screen name="Routines" component={RoutinesScreen} />
      <RootStack.Screen name="RoutineRun" component={RoutineRunScreen} />
      <RootStack.Screen name="LifeReview" component={LifeReviewScreen} />
      <RootStack.Screen name="AIModel" component={AIModelScreen} />
      <RootStack.Screen name="Memory" component={MemoryScreen} />
      <RootStack.Screen name="Security" component={SecurityScreen} />
      <RootStack.Screen name="Backup" component={BackupScreen} />
      <RootStack.Screen name="Diagnostics" component={DiagnosticsScreen} />
    </RootStack.Navigator>
  );
}
