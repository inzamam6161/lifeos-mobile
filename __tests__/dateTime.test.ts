import {greetingFor, isOverdue, localDateKey, schedulePreset} from '../src/utils/dateTime';

describe('date and scheduling utilities', () => {
  it('detects overdue timestamps deterministically', () => {
    const now = new Date('2026-08-13T10:00:00.000Z');
    expect(isOverdue('2026-08-13T09:59:59.000Z', now)).toBe(true);
    expect(isOverdue('2026-08-13T10:00:01.000Z', now)).toBe(false);
  });

  it('creates a one-hour preset without seconds/milliseconds noise', () => {
    const now = new Date(2026, 7, 13, 10, 17, 42, 500);
    const result = new Date(schedulePreset('in1h', now));
    expect(result.getHours()).toBe(11);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('builds local date keys and greetings', () => {
    expect(localDateKey(new Date(2026, 7, 13, 8, 0, 0))).toBe('2026-08-13');
    expect(greetingFor(new Date(2026, 7, 13, 8, 0, 0))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 7, 13, 19, 0, 0))).toBe('Good evening');
  });
});
