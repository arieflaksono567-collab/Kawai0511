import { normalizePhoneNumber } from '../src/common/utils/phone.util';

describe('PhoneNormalizationUnitTests', () => {
  test('should normalize standard local format 081234567890 to +6281234567890', () => {
    expect(normalizePhoneNumber('081234567890')).toBe('+6281234567890');
  });

  test('should normalize format without leading zero 81234567890 to +6281234567890', () => {
    expect(normalizePhoneNumber('81234567890')).toBe('+6281234567890');
  });

  test('should normalize format with 62 prefix 6281234567890 to +6281234567890', () => {
    expect(normalizePhoneNumber('6281234567890')).toBe('+6281234567890');
  });

  test('should normalize format with +62 prefix +6281234567890 to +6281234567890', () => {
    expect(normalizePhoneNumber('+6281234567890')).toBe('+6281234567890');
  });

  test('should strip whitespace, dashes, and parentheses: (0812) 3456-7890', () => {
    expect(normalizePhoneNumber('(0812) 3456-7890')).toBe('+6281234567890');
  });

  test('should throw error on invalid non-Indonesian or landline format', () => {
    expect(() => normalizePhoneNumber('0215551234')).toThrow();
    expect(() => normalizePhoneNumber('12345')).toThrow();
    expect(() => normalizePhoneNumber('')).toThrow();
    expect(() => normalizePhoneNumber('abcde')).toThrow();
  });
});
