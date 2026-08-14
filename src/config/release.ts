export const releaseInfo = {
  channel: __DEV__ ? 'development' : 'production',
  diagnosticsUpload: 'disabled-by-default',
  targetSchemaVersion: 11,
  securityBaseline: 'SQLCipher + Keychain/Keystore',
} as const;
