import * as Keychain from 'react-native-keychain';
import QuickCrypto from 'react-native-quick-crypto';
import {SecuritySettings} from './types';

const DATABASE_KEY_SERVICE = 'lifeos.database-key.v1';
const SECURITY_SETTINGS_SERVICE = 'lifeos.security-settings.v1';
const APP_LOCK_SERVICE = 'lifeos.app-lock.v1';
const PIN_SERVICE = 'lifeos.pin.v1';

const defaultSettings: SecuritySettings = {
  appLockEnabled: false,
  biometricEnabled: false,
  pinEnabled: false,
  autoLockSeconds: 30,
};

function randomHex(bytes: number) {
  return QuickCrypto.randomBytes(bytes).toString('hex');
}

export async function getDatabaseKey(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({service: DATABASE_KEY_SERVICE});
  return credentials ? credentials.password : null;
}

export async function saveDatabaseKey(key: string) {
  await Keychain.setGenericPassword('lifeos', key, {
    service: DATABASE_KEY_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadSecuritySettings(): Promise<SecuritySettings> {
  const credentials = await Keychain.getGenericPassword({service: SECURITY_SETTINGS_SERVICE});
  if (!credentials) return defaultSettings;
  try {
    return {...defaultSettings, ...JSON.parse(credentials.password)};
  } catch {
    return defaultSettings;
  }
}

export async function saveSecuritySettings(settings: SecuritySettings) {
  await Keychain.setGenericPassword('lifeos', JSON.stringify(settings), {
    service: SECURITY_SETTINGS_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function supportedBiometryType() {
  return Keychain.getSupportedBiometryType();
}

export async function createBiometricLockSecret(secret: string) {
  await Keychain.setGenericPassword('lifeos-lock', secret, {
    service: APP_LOCK_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  });
}

export async function removeBiometricLockSecret() {
  await Keychain.resetGenericPassword({service: APP_LOCK_SERVICE});
}

export async function authenticateWithDeviceSecurity() {
  const credentials = await Keychain.getGenericPassword({
    service: APP_LOCK_SERVICE,
    authenticationPrompt: {
      title: 'Unlock LifeOS',
      subtitle: 'Your personal data is protected',
      description: 'Authenticate to continue',
      cancel: 'Use PIN',
    },
  });
  return Boolean(credentials);
}

export async function savePin(pin: string) {
  await Keychain.setGenericPassword('lifeos-pin', pin, {
    service: PIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function verifyPin(pin: string) {
  const credentials = await Keychain.getGenericPassword({service: PIN_SERVICE});
  return Boolean(credentials && credentials.password === pin);
}

export async function removePin() {
  await Keychain.resetGenericPassword({service: PIN_SERVICE});
}

export async function createSecureRandomHex(bytes: number): Promise<string> {
  return randomHex(bytes);
}
