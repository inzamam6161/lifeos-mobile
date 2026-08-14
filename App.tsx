import React from 'react';
import {StatusBar} from 'react-native';
import {Provider} from 'react-redux';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppBootstrap} from './src/app/AppBootstrap';
import {store} from './src/app/store';
import {AppNavigator} from './src/navigation/AppNavigator';
import {colors} from './src/theme/colors';
import {SecurityProvider} from './src/security/SecurityProvider';
import {SecurityGate} from './src/security/LockScreen';
import {AppErrorBoundary} from './src/observability/AppErrorBoundary';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function App() {
  return (
    <Provider store={store}>
      <AppErrorBoundary>
        <SafeAreaProvider>
          <AppBootstrap>
            <SecurityProvider>
              <SecurityGate>
                <NavigationContainer theme={navigationTheme}>
                  <StatusBar barStyle="light-content" backgroundColor={colors.background} />
                  <AppNavigator />
                </NavigationContainer>
              </SecurityGate>
            </SecurityProvider>
          </AppBootstrap>
        </SafeAreaProvider>
      </AppErrorBoundary>
    </Provider>
  );
}
