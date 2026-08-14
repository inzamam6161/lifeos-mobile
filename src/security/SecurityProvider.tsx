import React, {PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {AppState} from 'react-native';
import {
  authenticateWithDeviceSecurity,
  createBiometricLockSecret,
  createSecureRandomHex,
  loadSecuritySettings,
  removeBiometricLockSecret,
  removePin,
  savePin,
  saveSecuritySettings,
  supportedBiometryType,
  verifyPin,
} from './secureStore';
import {SecuritySettings} from './types';

const defaults: SecuritySettings = {
  appLockEnabled: false,
  biometricEnabled: false,
  pinEnabled: false,
  autoLockSeconds: 30,
};

type SecurityContextValue = {
  settings: SecuritySettings;
  locked: boolean;
  ready: boolean;
  biometryType: string | null;
  updateSettings: (patch: Partial<SecuritySettings>) => Promise<void>;
  enableBiometricLock: () => Promise<void>;
  disableBiometricLock: () => Promise<void>;
  setLifeOSPin: (pin: string) => Promise<void>;
  clearLifeOSPin: () => Promise<void>;
  unlockWithDeviceSecurity: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  lockNow: () => void;
};

const SecurityContext = createContext<SecurityContextValue | null>(null);

export function SecurityProvider({children}: PropsWithChildren) {
  const [settings, setSettings] = useState(defaults);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [biometryType, setBiometryType] = useState<string | null>(null);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    void Promise.all([loadSecuritySettings(), supportedBiometryType()])
      .then(([stored, biometry]) => {
        setSettings(stored);
        setBiometryType(biometry);
        setLocked(stored.appLockEnabled);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        backgroundAt.current = Date.now();
        return;
      }
      if (state === 'active' && settings.appLockEnabled && backgroundAt.current) {
        const elapsed = (Date.now() - backgroundAt.current) / 1000;
        if (elapsed >= settings.autoLockSeconds) setLocked(true);
        backgroundAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [settings.appLockEnabled, settings.autoLockSeconds]);

  const persist = useCallback(async (next: SecuritySettings) => {
    setSettings(next);
    await saveSecuritySettings(next);
  }, []);

  const updateSettings = useCallback(async (patch: Partial<SecuritySettings>) => {
    const next = {...settings, ...patch};
    await persist(next);
    if (!next.appLockEnabled) setLocked(false);
  }, [persist, settings]);

  const enableBiometricLock = useCallback(async () => {
    const secret = await createSecureRandomHex(32);
    await createBiometricLockSecret(secret);
    await persist({...settings, appLockEnabled: true, biometricEnabled: true});
  }, [persist, settings]);

  const disableBiometricLock = useCallback(async () => {
    await removeBiometricLockSecret();
    const next = {...settings, biometricEnabled: false, appLockEnabled: settings.pinEnabled};
    await persist(next);
    if (!next.appLockEnabled) setLocked(false);
  }, [persist, settings]);

  const setLifeOSPin = useCallback(async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) throw new Error('LifeOS PIN must contain exactly 6 digits.');
    await savePin(pin);
    await persist({...settings, pinEnabled: true, appLockEnabled: true});
  }, [persist, settings]);

  const clearLifeOSPin = useCallback(async () => {
    await removePin();
    const next = {...settings, pinEnabled: false, appLockEnabled: settings.biometricEnabled};
    await persist(next);
    if (!next.appLockEnabled) setLocked(false);
  }, [persist, settings]);

  const unlockWithDeviceSecurity = useCallback(async () => {
    if (!settings.biometricEnabled) return false;
    try {
      const ok = await authenticateWithDeviceSecurity();
      if (ok) setLocked(false);
      return ok;
    } catch {
      return false;
    }
  }, [settings.biometricEnabled]);

  const unlockWithPin = useCallback(async (pin: string) => {
    if (!settings.pinEnabled) return false;
    const ok = await verifyPin(pin);
    if (ok) setLocked(false);
    return ok;
  }, [settings.pinEnabled]);

  const value = useMemo<SecurityContextValue>(() => ({
    settings,
    locked,
    ready,
    biometryType,
    updateSettings,
    enableBiometricLock,
    disableBiometricLock,
    setLifeOSPin,
    clearLifeOSPin,
    unlockWithDeviceSecurity,
    unlockWithPin,
    lockNow: () => setLocked(true),
  }), [settings, locked, ready, biometryType, updateSettings, enableBiometricLock, disableBiometricLock, setLifeOSPin, clearLifeOSPin, unlockWithDeviceSecurity, unlockWithPin]);

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const value = useContext(SecurityContext);
  if (!value) throw new Error('useSecurity must be used inside SecurityProvider.');
  return value;
}
