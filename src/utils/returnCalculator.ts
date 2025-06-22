import dayjs from 'dayjs';
import { PriceData } from '@/types/finance';

export function calculatePortfolioReturn(
  prices: Record<string, PriceData[]>,
  period: '6m' | '1y' | '3y' = '1y'
): number {
  const now = dayjs();
  const periodMap = { '6m': 6, '1y': 12, '3y': 36 };
  const months = periodMap[period];
  let returns: number[] = [];

  for (const symbol in prices) {
    const arr = prices[symbol];
    if (!arr || arr.length < 2) continue;
    const latest = arr[arr.length - 1];
    // Find price closest to N months ago
    const targetDate = now.subtract(months, 'month');
    let past = arr[0];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (dayjs(arr[i].date).isBefore(targetDate)) {
        past = arr[i];
        break;
      }
    }
    if (past && past.close > 0) {
      const ret = (latest.close - past.close) / past.close * 100;
      returns.push(ret);
    }
  }
  if (!returns.length) return 0;
  return returns.reduce((a, b) => a + b, 0) / returns.length;
}

export const DEFAULT_BENCHMARKS = {
  'S&P 500': 10,
  'Gold': 6,
  'US 10-Year Treasury': 4.3,
  'NASDAQ': 12,
  'Dow Jones': 8,
  'Russell 2000': 9,
  'VIX': -5,
  'Bitcoin': 15,
  'Ethereum': 18,
  'US Dollar Index': 2
};

export function compareWithBenchmarks(
  portfolioReturn: number,
  benchmarks: Record<string, number> = DEFAULT_BENCHMARKS
) {
  return {
    portfolioReturn,
    ...benchmarks,
  };
}

export type ComparisonResult = ReturnType<typeof compareWithBenchmarks>; 