import {
  sanitizeNumericValue,
  formatNumericValue,
  formatPercentage,
  formatVolume,
  logMissingMetrics
} from '../bondUtils';

// Mock console.warn
const mockConsoleWarn = jest.fn();
beforeAll(() => {
  console.warn = mockConsoleWarn;
});

afterEach(() => {
  mockConsoleWarn.mockClear();
});

describe('bondUtils', () => {
  describe('sanitizeNumericValue', () => {
    it('should return null for null values', () => {
      expect(sanitizeNumericValue(null)).toBe(null);
    });

    it('should return null for undefined values', () => {
      expect(sanitizeNumericValue(undefined)).toBe(null);
    });

    it('should return null for NaN values', () => {
      expect(sanitizeNumericValue(NaN)).toBe(null);
    });

    it('should return the value for valid numbers', () => {
      expect(sanitizeNumericValue(123.45)).toBe(123.45);
      expect(sanitizeNumericValue(0)).toBe(0);
      expect(sanitizeNumericValue(-10)).toBe(-10);
    });
  });

  describe('formatNumericValue', () => {
    it('should return "-" for null/undefined/NaN values', () => {
      expect(formatNumericValue(null)).toBe('-');
      expect(formatNumericValue(undefined)).toBe('-');
      expect(formatNumericValue(NaN)).toBe('-');
    });

    it('should format valid numbers with default 2 decimals', () => {
      expect(formatNumericValue(123.456)).toBe('123.46');
      expect(formatNumericValue(0)).toBe('0.00');
      expect(formatNumericValue(-10.5)).toBe('-10.50');
    });

    it('should format with custom decimal places', () => {
      expect(formatNumericValue(123.456, 1)).toBe('123.5');
      expect(formatNumericValue(123.456, 3)).toBe('123.456');
      expect(formatNumericValue(123.456, 0)).toBe('123');
    });
  });

  describe('formatPercentage', () => {
    it('should return "-" for null/undefined/NaN values', () => {
      expect(formatPercentage(null)).toBe('-');
      expect(formatPercentage(undefined)).toBe('-');
      expect(formatPercentage(NaN)).toBe('-');
    });

    it('should format valid numbers as percentages with default 2 decimals', () => {
      expect(formatPercentage(15.5)).toBe('15.50%');
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(-5.25)).toBe('-5.25%');
    });

    it('should format with custom decimal places', () => {
      expect(formatPercentage(15.567, 1)).toBe('15.6%');
      expect(formatPercentage(15.567, 3)).toBe('15.567%');
    });
  });

  describe('formatVolume', () => {
    it('should return "-" for null/undefined/NaN values', () => {
      expect(formatVolume(null)).toBe('-');
      expect(formatVolume(undefined)).toBe('-');
      expect(formatVolume(NaN)).toBe('-');
    });

    it('should format valid numbers as volume in millions', () => {
      expect(formatVolume(123.456)).toBe('123.46M');
      expect(formatVolume(0)).toBe('0.00M');
      expect(formatVolume(1000)).toBe('1000.00M');
    });
  });

  describe('logMissingMetrics', () => {
    it('should not log warning when all key metrics are present', () => {
      const bond = {
        ticker: 'AL30',
        price: 100,
        tir: 15.5,
        tna: 10.2,
        duration: 5.5
      };

      logMissingMetrics(bond);

      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('should log warning when key metrics are missing', () => {
      const bond = {
        ticker: 'AL30',
        price: null,
        tir: undefined,
        tna: NaN,
        duration: 5.5
      };

      logMissingMetrics(bond);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Missing key metrics for bond AL30:',
        ['price', 'tir', 'tna']
      );
    });

    it('should log warning when all key metrics are missing', () => {
      const bond = {
        ticker: 'AL30',
        price: null,
        tir: undefined,
        tna: NaN,
        duration: null
      };

      logMissingMetrics(bond);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Missing key metrics for bond AL30:',
        ['price', 'tir', 'tna', 'duration']
      );
    });
  });
}); 