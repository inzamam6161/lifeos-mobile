import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppSelector} from '../app/hooks';
import {taskSelectors} from '../features/tasks/selectors';
import {RootStackParamList} from '../types/navigation';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';

export function YouScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const taskCount = useAppSelector(taskSelectors.selectTotal);
  const items: Array<{label: string; route?: keyof RootStackParamList}> = [
    {label: 'Personal profile'},
    {label: 'Appearance'},
    {label: 'Privacy & security', route: 'Security'},
    {label: `Encrypted offline data · ${taskCount} tasks on device`},
    {label: 'AI models', route: 'AIModel'},
    {label: 'Backup & restore', route: 'Backup'},
    {label: 'Diagnostics & release health', route: 'Diagnostics'},
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.avatar}><Text style={styles.avatarText}>IH</Text></View>
        <Text accessibilityRole="header" style={styles.title}>You</Text>
        <Text style={styles.subtitle}>Your Personal OS settings and privacy controls.</Text>

        <View style={styles.offlineBadge}>
          <Text style={styles.offlineDot}>●</Text>
          <View style={styles.offlineTextWrap}>
            <Text style={styles.offlineTitle}>Encrypted local database</Text>
            <Text style={styles.offlineSubtitle}>SQLCipher + platform-protected database key.</Text>
          </View>
        </View>

        <View style={styles.list}>
          {items.map(item => (
            <Pressable
              key={item.label}
              accessibilityRole={item.route ? 'button' : 'text'}
              accessibilityLabel={item.label}
              disabled={!item.route}
              onPress={() => item.route && navigation.navigate(item.route as never)}
              style={({pressed}) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.rowText}>{item.label}</Text>
              <Text style={styles.arrow}>{item.route ? '›' : ''}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.lg},
  avatar: {width: 82, height: 82, borderRadius: 41, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl},
  avatarText: {color: colors.text, fontWeight: '900', fontSize: 24},
  title: {color: colors.text, fontSize: 30, fontWeight: '800', marginTop: spacing.md},
  subtitle: {color: colors.textMuted, marginTop: 4, lineHeight: 20},
  offlineBadge: {marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gymSoft, borderWidth: 1, borderColor: colors.gym, borderRadius: 16, padding: spacing.md, gap: spacing.sm},
  offlineDot: {color: colors.success, fontSize: 18},
  offlineTextWrap: {flex: 1},
  offlineTitle: {color: colors.text, fontWeight: '800'},
  offlineSubtitle: {color: colors.textMuted, fontSize: 12, marginTop: 3},
  list: {marginTop: spacing.xl, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border},
  row: {minHeight: 58, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
  pressed: {opacity: 0.72},
  rowText: {color: colors.text, fontWeight: '600', flex: 1},
  arrow: {color: colors.textMuted, fontSize: 24},
});
