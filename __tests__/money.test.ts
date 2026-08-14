import {formatMoney, parseMoneyToMinor} from '../src/utils/money';

describe('money utilities', () => {
  it('parses AED-style decimal input into integer minor units', () => {
    expect(parseMoneyToMinor('38.50')).toBe(3850);
    expect(parseMoneyToMinor('1,250.7')).toBe(125070);
    expect(parseMoneyToMinor('0.05')).toBe(5);
  });

  it('rejects invalid or over-precise money input', () => {
    expect(parseMoneyToMinor('-3')).toBeNull();
    expect(parseMoneyToMinor('12.345')).toBeNull();
    expect(parseMoneyToMinor('AED 20')).toBeNull();
  });

  it('formats integer minor units without floating point currency math', () => {
    expect(formatMoney(3850)).toBe('AED 38.50');
    expect(formatMoney(-505, 'AED')).toBe('-AED 5.05');
  });
});
