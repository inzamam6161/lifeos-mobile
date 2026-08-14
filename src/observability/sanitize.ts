const MAX_DIAGNOSTIC_TEXT = 2000;

function truncate(value: string) {
  return value.length > MAX_DIAGNOSTIC_TEXT
    ? `${value.slice(0, MAX_DIAGNOSTIC_TEXT)}…`
    : value;
}

export function sanitizeDiagnosticText(input: string | null | undefined) {
  if (!input) return '';
  return truncate(
    input
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
      .replace(/([?&](?:token|key|secret|password|passphrase|auth)=)[^&#\s]+/gi, '$1[REDACTED]')
      .replace(/(?:file:\/\/)?\/Users\/[^/\s]+\/[^\s)]+/g, '[LOCAL_PATH]')
      .replace(/\/data\/user\/\d+\/[^\s)]+/g, '[LOCAL_PATH]')
      .replace(/[A-Z]:\\Users\\[^\\\s]+\\[^\s)]+/gi, '[LOCAL_PATH]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]'),
  );
}

export function sanitizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: sanitizeDiagnosticText(error.name || 'Error'),
      message: sanitizeDiagnosticText(error.message),
      stack: sanitizeDiagnosticText(error.stack ?? ''),
    };
  }
  return {
    name: 'UnknownError',
    message: sanitizeDiagnosticText(String(error)),
    stack: '',
  };
}
