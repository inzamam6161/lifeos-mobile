import {formatWeight, parseKgToGrams} from '../src/utils/weight';

describe('weight utilities', () => {
  it('stores kilograms as integer grams', () => {
    expect(parseKgToGrams('55')).toBe(55000);
    expect(parseKgToGrams('72.5')).toBe(72500);
    expect(parseKgToGrams('72,25')).toBe(72250);
  });

  it('rejects invalid weights', () => {
    expect(parseKgToGrams('-1')).toBeNull();
    expect(parseKgToGrams('1001')).toBeNull();
    expect(parseKgToGrams('abc')).toBeNull();
  });

  it('formats grams for the gym UI', () => {
    expect(formatWeight(55000)).toBe('55 kg');
    expect(formatWeight(72500)).toBe('72.5 kg');
  });
});
