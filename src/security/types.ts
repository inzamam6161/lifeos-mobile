export type SecuritySettings = {
  appLockEnabled: boolean;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  autoLockSeconds: number;
};

export type DatabaseSecurityStatus = {
  encrypted: boolean;
  migratedFromPlaintext: boolean;
  path: string;
};
