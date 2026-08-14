import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors} from '../theme/colors';

export function ProgressBar({value}: {value: number}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, {width: `${clamped * 100}%`}]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.success,
  },
});
