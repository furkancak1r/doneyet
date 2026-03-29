import { describe, expect, it } from 'vitest';
import { daysInMonth, getNextStartDateTime, isLeapYear } from '../utils/date';

describe('date helpers', () => {
  it('detects leap years', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
  });

  it('calculates the last day of a normal February', () => {
    const result = getNextStartDateTime(
      'monthly_on_last_day',
      new Date('2025-02-10T00:00:00.000Z'),
      null,
      null,
      '09:30',
      true,
      new Date('2025-02-10T00:00:00.000Z')
    );

    expect(result.getDate()).toBe(28);
  });

  it('calculates the last day of a leap-year February', () => {
    const result = getNextStartDateTime(
      'monthly_on_last_day',
      new Date('2024-02-10T00:00:00.000Z'),
      null,
      null,
      '09:30',
      true,
      new Date('2024-02-10T00:00:00.000Z')
    );

    expect(result.getDate()).toBe(29);
  });

  it('clamps monthly day 31 to the last valid day', () => {
    const result = getNextStartDateTime(
      'monthly_on_day',
      new Date('2025-04-01T00:00:00.000Z'),
      null,
      31,
      '08:00',
      false,
      new Date('2025-04-01T00:00:00.000Z')
    );

    expect(result.getDate()).toBe(30);
  });

  it('reports month length correctly', () => {
    expect(daysInMonth(2025, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2025, 3)).toBe(30);
    expect(daysInMonth(2025, 6)).toBe(31);
  });
});
