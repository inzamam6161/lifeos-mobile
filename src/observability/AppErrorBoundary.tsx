import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {reportCaughtError} from './crashReporter';

type State = {hasError: boolean};

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = {hasError: false};

  static getDerivedStateFromError(): State {
    return {hasError: true};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    void reportCaughtError(error, `React component stack:\n${info.componentStack ?? ''}`);
  }

  private retry = () => {
    this.setState({hasError: false});
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View accessibilityRole="alert" style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          LifeOS hit an unexpected error
        </Text>
        <Text style={styles.message}>
          Your local data remains in the encrypted database. A sanitized diagnostic
          was recorded on this device.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try LifeOS again"
          onPress={this.retry}
          style={({pressed}) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
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
  title: {color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center'},
  message: {color: colors.textMuted, lineHeight: 21, textAlign: 'center'},
  button: {
    minHeight: 48,
    minWidth: 160,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {opacity: 0.75},
  buttonText: {color: colors.white, fontWeight: '900'},
});
