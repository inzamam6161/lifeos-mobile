export function parseMoneyToMinor(input: string) {
  const normalized = input.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const minor = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  return Number.isSafeInteger(minor) ? minor : null;
}

export function formatMoney(minor: number, currency = 'AED') {
  const sign = minor < 0 ? '-' : '';
  const absolute = Math.abs(Math.round(minor));
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  return `${sign}${currency} ${whole.toLocaleString('en-US')}.${String(fraction).padStart(2, '0')}`;
}

export function monthKeyFor(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function startOfMonthIso(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0).toISOString();
}

export function endOfMonthIso(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
}
