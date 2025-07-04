import { calculatePortfolioReturn, compareWithBenchmarks, calculateAnnualizedReturn } from '../returnCalculator';
import dayjs from 'dayjs';

describe('calculatePortfolioReturn', () => {
  const now = dayjs();
  const oneYearAgo = now.subtract(1, 'year').format('YYYY-MM-DD');
  const sixMonthsAgo = now.subtract(6, 'month').format('YYYY-MM-DD');
  const threeYearsAgo = now.subtract(3, 'year').format('YYYY-MM-DD');

  it('returns positive return for increasing prices', () => {
    const prices = {
      AAPL: [
        { date: oneYearAgo, open: 100, high: 110, low: 90, close: 100, volume: 1000 },
        { date: now.format('YYYY-MM-DD'), open: 150, high: 160, low: 140, close: 150, volume: 1000 },
      ],
    };
    const result = calculatePortfolioReturn(prices, '1y');
    expect(result).toBeCloseTo(50);
  });

  it('returns negative return for decreasing prices', () => {
    const prices = {
      AAPL: [
        { date: oneYearAgo, open: 200, high: 210, low: 190, close: 200, volume: 1000 },
        { date: now.format('YYYY-MM-DD'), open: 100, high: 110, low: 90, close: 100, volume: 1000 },
      ],
    };
    const result = calculatePortfolioReturn(prices, '1y');
    expect(result).toBeCloseTo(-50);
  });

  it('returns 0 for no price change', () => {
    const prices = {
      AAPL: [
        { date: oneYearAgo, open: 100, high: 110, low: 90, close: 100, volume: 1000 },
        { date: now.format('YYYY-MM-DD'), open: 100, high: 110, low: 90, close: 100, volume: 1000 },
      ],
    };
    const result = calculatePortfolioReturn(prices, '1y');
    expect(result).toBe(0);
  });

  it('returns 0 if not enough data', () => {
    const prices = {
      AAPL: [
        { date: now.format('YYYY-MM-DD'), open: 100, high: 110, low: 90, close: 100, volume: 1000 },
      ],
    };
    const result = calculatePortfolioReturn(prices, '1y');
    expect(result).toBe(0);
  });

  it('averages returns across multiple symbols', () => {
    const prices = {
      AAPL: [
        { date: oneYearAgo, open: 100, high: 110, low: 90, close: 100, volume: 1000 },
        { date: now.format('YYYY-MM-DD'), open: 200, high: 210, low: 190, close: 200, volume: 1000 },
      ],
      MSFT: [
        { date: oneYearAgo, open: 50, high: 60, low: 40, close: 50, volume: 1000 },
        { date: now.format('YYYY-MM-DD'), open: 100, high: 110, low: 90, close: 100, volume: 1000 },
      ],
    };
    const result = calculatePortfolioReturn(prices, '1y');
    expect(result).toBeCloseTo(100);
  });

  it('handles different periods', () => {
    const prices = {
      AAPL: [
        { date: threeYearsAgo, open: 100, high: 110, low: 90, close: 100, volume: 1000 },
        { date: sixMonthsAgo, open: 120, high: 130, low: 110, close: 120, volume: 1000 },
        { date: now.format('YYYY-MM-DD'), open: 150, high: 160, low: 140, close: 150, volume: 1000 },
      ],
    };
    expect(calculatePortfolioReturn(prices, '3y')).toBeCloseTo(50);
    expect(calculatePortfolioReturn(prices, '6m')).toBeCloseTo(25);
  });
});

describe('calculateAnnualizedReturn', () => {
  it('calculates correct annualized return for 1 year period', () => {
    const result = calculateAnnualizedReturn(1000, 1200, '2023-01-01', '2024-01-01');
    expect(result).toBeCloseTo(20, 1); // 20% annualized return
  });

  it('calculates correct annualized return for 2 year period', () => {
    const result = calculateAnnualizedReturn(1000, 1440, '2022-01-01', '2024-01-01');
    expect(result).toBeCloseTo(20, 1); // 20% annualized return over 2 years
  });

  it('calculates correct annualized return for 6 month period', () => {
    const result = calculateAnnualizedReturn(1000, 1100, '2023-07-01', '2024-01-01');
    expect(result).toBeCloseTo(21, 0); // Approximately 21% annualized
  });

  it('handles negative returns correctly', () => {
    const result = calculateAnnualizedReturn(1000, 800, '2023-01-01', '2024-01-01');
    expect(result).toBeCloseTo(-20, 1); // -20% annualized return
  });

  it('returns 0 for zero or negative initial values', () => {
    expect(calculateAnnualizedReturn(0, 1200, '2023-01-01', '2024-01-01')).toBe(0);
    expect(calculateAnnualizedReturn(-1000, 1200, '2023-01-01', '2024-01-01')).toBe(0);
  });

  it('returns 0 for zero or negative final values', () => {
    expect(calculateAnnualizedReturn(1000, 0, '2023-01-01', '2024-01-01')).toBe(0);
    expect(calculateAnnualizedReturn(1000, -1200, '2023-01-01', '2024-01-01')).toBe(0);
  });

  it('returns 0 for invalid date ranges', () => {
    expect(calculateAnnualizedReturn(1000, 1200, '2024-01-01', '2023-01-01')).toBe(0);
    expect(calculateAnnualizedReturn(1000, 1200, '2024-01-01', '2024-01-01')).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const result = calculateAnnualizedReturn(1000, 1234.567, '2023-01-01', '2024-01-01');
    expect(result).toBeCloseTo(23.47, 1); // Rounded to 2 decimal places
  });
});

describe('compareWithBenchmarks', () => {
  it('returns correct structure', () => {
    const result = compareWithBenchmarks(10, { fixedDeposit: 5, realEstate: 7, usTreasury: 3, sp500: 10, gold: 6 });
    expect(result).toEqual({
      portfolioReturn: 10,
      fixedDeposit: 5,
      realEstate: 7,
      usTreasury: 3,
      sp500: 10,
      gold: 6,
    });
  });
}); 