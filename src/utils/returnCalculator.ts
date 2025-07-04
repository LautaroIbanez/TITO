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

export function compareWithBenchmarksDual(
  portfolioReturnARS: number,
  portfolioReturnUSD: number,
  benchmarks: Record<string, number> = DEFAULT_BENCHMARKS
) {
  // Redondear a 1 decimal antes de retornar
  const roundedARS = typeof portfolioReturnARS === 'number' ? Number(portfolioReturnARS.toFixed(1)) : portfolioReturnARS;
  const roundedUSD = typeof portfolioReturnUSD === 'number' ? Number(portfolioReturnUSD.toFixed(1)) : portfolioReturnUSD;
  return {
    portfolioReturnARS: roundedARS,
    portfolioReturnUSD: roundedUSD,
    ...benchmarks,
  };
}

export type ComparisonResult = ReturnType<typeof compareWithBenchmarks>;

/**
 * Calculate annualized return using the proper formula:
 * Annualized Return = (Final Value / Initial Value)^(1/A) - 1
 * Where A is the number of years between initial and final dates
 * @param initialValue The initial portfolio value
 * @param finalValue The final portfolio value
 * @param initialDate The initial date (ISO string)
 * @param finalDate The final date (ISO string)
 * @returns Annualized return as a percentage (e.g., 12.5 for 12.5%)
 */
export function calculateAnnualizedReturn(
  initialValue: number,
  finalValue: number,
  initialDate: string,
  finalDate: string
): number {
  if (initialValue <= 0 || finalValue <= 0) return 0;
  
  const startDate = dayjs(initialDate);
  const endDate = dayjs(finalDate);
  const years = endDate.diff(startDate, 'day') / 365.25;
  
  if (years <= 0) return 0;
  
  const annualizedReturn = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
  
  // Round to 2 decimal places
  return Math.round(annualizedReturn * 100) / 100;
}

/**
 * Calculate the Internal Rate of Return (IRR) for a series of cash flows.
 * @param cashFlows Array of objects: { date: string (ISO), amount: number }
 *   - Negative amounts = investments (outflows), positive = withdrawals (inflows)
 *   - The last cash flow should be the current portfolio value (as a positive inflow)
 * @param guess Initial guess for IRR (default 0.1 = 10%)
 * @returns IRR as a decimal (e.g., 0.12 for 12% annualized)
 */
export function calculateIRR(
  cashFlows: { date: string; amount: number }[],
  guess = 0.1
): number {
  if (cashFlows.length < 2) return 0;
  
  // Sort cash flows by date
  const sortedCashFlows = [...cashFlows].sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  
  // Convert dates to years since first cash flow
  const day0 = dayjs(sortedCashFlows[0].date);
  const times = sortedCashFlows.map(cf => dayjs(cf.date).diff(day0, 'day') / 365.25);
  const amounts = sortedCashFlows.map(cf => cf.amount);

  // Newton-Raphson method
  let rate = guess;
  for (let iter = 0; iter < 100; iter++) {
    let f = 0;
    let df = 0;
    for (let i = 0; i < amounts.length; i++) {
      const t = times[i];
      const a = amounts[i];
      f += a / Math.pow(1 + rate, t);
      df += -a * t / Math.pow(1 + rate, t + 1);
    }
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 1e-7) {
      // Round to 2 decimal places and convert to percentage
      return Math.round(newRate * 10000) / 100;
    }
    rate = newRate;
  }
  
  // Round to 2 decimal places and convert to percentage
  return Math.round(rate * 10000) / 100;
}

/**
 * Calculate Time-Weighted Return (TWR) for a series of daily values and cash flows.
 * @param values Array of { date: string, value: number } (daily portfolio value, excluding cash)
 * @param cashFlows Array of { date: string, amount: number } (deposits/withdrawals, negative for deposit)
 * @returns TWR as a decimal (e.g., 0.12 for 12%)
 */
export function calculateTWR(
  values: { date: string; value: number }[],
  cashFlows: { date: string; amount: number }[]
): number {
  if (values.length < 2) return 0;
  // Sort by date
  const sortedValues = [...values].sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  const sortedFlows = [...cashFlows].sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  let twr = 1;
  let prevValue = sortedValues[0].value;
  let flowIdx = 0;
  for (let i = 1; i < sortedValues.length; i++) {
    const currDate = sortedValues[i].date;
    let flows = 0;
    while (flowIdx < sortedFlows.length && dayjs(sortedFlows[flowIdx].date).isSameOrBefore(currDate)) {
      flows += sortedFlows[flowIdx].amount;
      flowIdx++;
    }
    const periodReturn = (sortedValues[i].value - flows - prevValue) / prevValue;
    twr *= 1 + periodReturn;
    prevValue = sortedValues[i].value;
  }
  return twr - 1;
} 