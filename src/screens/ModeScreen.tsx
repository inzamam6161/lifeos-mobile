import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {modeConfigs} from '../data/demo';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Mode'>;

const modeColors = {
  work: {accent: colors.work, soft: colors.workSoft},
  gym: {accent: colors.gym, soft: colors.gymSoft},
  shopping: {accent: colors.shopping, soft: colors.shoppingSoft},
};

export function ModeScreen({route, navigation}: Props) {
  const {mode} = route.params;
  const config = modeConfigs[mode];
  const palette = modeColors[mode];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headingWrap}>
            <Text style={styles.emoji}>{config.emoji}</Text>
            <View>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>{config.subtitle}</Text>
            </View>
          </View>
          <Pressable onPress={() => navigation.goBack()} style={styles.exit}>
            <Text style={styles.exitText}>Exit</Text>
          </Pressable>
        </View>

        <View style={[styles.hero, {backgroundColor: palette.soft, borderColor: palette.accent}]}>
          <Text style={styles.heroLabel}>{config.primaryLabel}</Text>
          <Text style={styles.heroValue}>{config.primaryValue}</Text>
        </View>

        <View style={styles.list}>
          {config.rows.map((row, index) => (
            <View style={styles.row} key={`${row.title}-${index}`}>
              <View style={[styles.index, {backgroundColor: palette.soft}]}>
                <Text style={[styles.indexText, {color: palette.accent}]}>{index + 1}</Text>
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowMeta}>{row.meta}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          ))}
        </View>

        <Pressable style={[styles.primaryButton, {backgroundColor: palette.accent}]}>
          <Text style={styles.primaryButtonText}>
            {mode === 'gym' ? 'Start / Continue Workout' : mode === 'shopping' ? 'Add Shopping Item' : 'Start Focus Session'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: 60, gap: spacing.lg},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  headingWrap: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  emoji: {fontSize: 28},
  title: {color: colors.text, fontSize: 24, fontWeight: '800'},
  subtitle: {color: colors.textMuted, marginTop: 2},
  exit: {paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border},
  exitText: {color: colors.text, fontWeight: '700'},
  hero: {minHeight: 190, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  heroLabel: {color: colors.textMuted, fontSize: 13, fontWeight: '700'},
  heroValue: {color: colors.text, fontSize: 38, fontWeight: '900', marginTop: 8},
  list: {backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden'},
  row: {minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border},
  index: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  indexText: {fontWeight: '900'},
  rowTextWrap: {flex: 1, marginLeft: spacing.sm},
  rowTitle: {color: colors.text, fontWeight: '700'},
  rowMeta: {color: colors.textMuted, fontSize: 12, marginTop: 4},
  chevron: {color: colors.textMuted, fontSize: 26},
  primaryButton: {minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  primaryButtonText: {color: colors.white, fontWeight: '800', fontSize: 15},
});
