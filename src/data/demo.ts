import {ModeType} from '../types/navigation';

export const todayTimeline = [
  {time: '09:00', title: 'Deep work', meta: 'React Native architecture'},
  {time: '11:00', title: 'Team stand-up', meta: '30 min'},
  {time: '13:00', title: 'Study', meta: 'Data Structures'},
  {time: '18:00', title: 'Gym', meta: 'Push Day · 45 min'},
  {time: '20:00', title: 'Shopping', meta: 'Groceries'},
  {time: '22:00', title: 'Daily review', meta: '15 min'},
];

export type ModeConfig = {
  title: string;
  emoji: string;
  subtitle: string;
  colorKey: 'work' | 'gym' | 'shopping';
  primaryLabel: string;
  primaryValue: string;
  rows: {title: string; meta: string}[];
};

export const modeConfigs: Record<ModeType, ModeConfig> = {
  work: {
    title: 'Work Mode',
    emoji: '💼',
    subtitle: 'Focus, tasks and meetings',
    colorKey: 'work',
    primaryLabel: 'Deep Work',
    primaryValue: '01:23:41',
    rows: [
      {title: 'Build authentication flow', meta: 'Current task'},
      {title: 'Review pull request', meta: 'Next'},
      {title: 'Project meeting', meta: '11:00 AM'},
      {title: 'Update documentation', meta: 'Today'},
    ],
  },
  gym: {
    title: 'Gym Mode',
    emoji: '🏋️',
    subtitle: 'Push Day · 45 min',
    colorKey: 'gym',
    primaryLabel: 'Bench Press',
    primaryValue: '55 kg × 11',
    rows: [
      {title: 'Bench Press', meta: '4 sets × 8–12'},
      {title: 'Incline Dumbbell Press', meta: '3 sets × 10'},
      {title: 'Shoulder Press', meta: '3 sets × 10'},
      {title: 'Tricep Pushdown', meta: '3 sets × 12'},
    ],
  },
  shopping: {
    title: 'Shopping Mode',
    emoji: '🛒',
    subtitle: 'Groceries · AED 74 / 120',
    colorKey: 'shopping',
    primaryLabel: 'Remaining Budget',
    primaryValue: 'AED 46',
    rows: [
      {title: 'Chicken breast', meta: 'AED 25'},
      {title: 'Eggs', meta: 'AED 12 · bought'},
      {title: 'Banana', meta: 'AED 8 · bought'},
      {title: 'Milk', meta: 'AED 7'},
    ],
  },
};
