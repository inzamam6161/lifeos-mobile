import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {ModeType} from '../types/navigation';

const modeStyle = {
  work: {backgroundColor: colors.workSoft, borderColor: colors.work},
  gym: {backgroundColor: colors.gymSoft, borderColor: colors.gym},
  shopping: {backgroundColor: colors.shoppingSoft, borderColor: colors.shopping},
};

const icon = {work: '💼', gym: '🏋️', shopping: '🛒'};
const label = {work: 'Work', gym: 'Gym', shopping: 'Shopping'};

export function ModeCard({
  mode,
  onPress,
}: {
  mode: ModeType;
  onPress: () => void;
}) {
  const style = modeStyle[mode];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label[mode]} Mode`}
      accessibilityHint={`Opens the ${label[mode].toLowerCase()} focus space`}
      onPress={onPress}
      style={({pressed}) => [
        styles.container,
        style,
        pressed && styles.pressed,
      ]}>
      <Text style={styles.icon}>{icon[mode]}</Text>
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label[mode]} Mode</Text>
        <Text style={styles.caption}>Open focus space</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 74,
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  pressed: {opacity: 0.72},
  icon: {fontSize: 22},
  textWrap: {gap: 2},
  label: {color: colors.text, fontWeight: '700', fontSize: 14},
  caption: {color: colors.textMuted, fontSize: 11},
  arrow: {
    position: 'absolute',
    right: 10,
    top: 26,
    color: colors.textMuted,
    fontSize: 22,
  },
});
