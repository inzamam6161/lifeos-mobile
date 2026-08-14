import {sanitizeDiagnosticText, sanitizeError} from '../src/observability/sanitize';

describe('diagnostic sanitization', () => {
  it('redacts local paths, bearer tokens and email addresses', () => {
    const input = 'Bearer secret-token user@example.com /Users/alice/project/private.ts';
    const result = sanitizeDiagnosticText(input);
    expect(result).toContain('Bearer [REDACTED]');
    expect(result).toContain('[EMAIL]');
    expect(result).toContain('[LOCAL_PATH]');
    expect(result).not.toContain('secret-token');
    expect(result).not.toContain('user@example.com');
  });

  it('sanitizes Error payloads before persistence', () => {
    const error = new Error('Failed at /data/user/0/com.lifeos/private.db');
    const result = sanitizeError(error);
    expect(result.message).toContain('[LOCAL_PATH]');
  });
});
