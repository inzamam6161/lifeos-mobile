export type SchedulePreset = 'in1h' | 'today18' | 'tomorrow9' | 'tomorrow18';

export function startOfLocalDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfLocalDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function isSameLocalDay(iso: string | null | undefined, date = new Date()) {
  if (!iso) return false;
  const value = new Date(iso);
  return value >= startOfLocalDay(date) && value <= endOfLocalDay(date);
}

export function isOverdue(iso: string | null | undefined, now = new Date()) {
  return Boolean(iso && new Date(iso).getTime() < now.getTime());
}

export function schedulePreset(preset: SchedulePreset, now = new Date()) {
  const value = new Date(now);
  if (preset === 'in1h') {
    value.setHours(value.getHours() + 1, 0, 0, 0);
  } else if (preset === 'today18') {
    value.setHours(18, 0, 0, 0);
    if (value.getTime() <= now.getTime()) value.setDate(value.getDate() + 1);
  } else if (preset === 'tomorrow9') {
    value.setDate(value.getDate() + 1);
    value.setHours(9, 0, 0, 0);
  } else {
    value.setDate(value.getDate() + 1);
    value.setHours(18, 0, 0, 0);
  }
  return value.toISOString();
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'}).format(new Date(iso));
}

export function formatShortDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatTodayHeader(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {weekday: 'long', month: 'short', day: 'numeric'})
    .format(date)
    .toUpperCase();
}

export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
