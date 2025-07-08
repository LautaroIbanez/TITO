import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { PortfolioTransaction } from '@/types';
import { PriceData } from '@/types/finance';
import { calculatePortfolioValueHistory } from './calculatePortfolioValue';
import { calculateDailyInvestedCapital } from './investedCapital';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

export interface PortfolioSummaryEntry {
  date: string;
  totalARS: number;
  totalUSD: number;
  investedARS: number;
  investedUSD: number;
  cashARS: number;
  cashUSD: number;
}

export interface PortfolioSummaryOptions {
  days?: number; // If provided, calculate last N days. If not, calculate from first transaction to today
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  initialCash?: { ARS: number; USD: number }; // Initial cash balances
}

/**
 * Calculates the historical summary of portfolio including total value, invested capital, and cash
 */
export async function calculatePortfolioSummaryHistory(
  transactions: PortfolioTransaction[],
  priceHistory: Record<string, PriceData[]>,
  options: PortfolioSummaryOptions = {}
): Promise<PortfolioSummaryEntry[]> {
  if (!transactions || transactions.length === 0) return [];

  // Determine date range
  let startDate: string;
  let endDate: string;
  
  if (options.startDate && options.endDate) {
    startDate = options.startDate;
    endDate = options.endDate;
  } else {
    const sortedTxs = [...transactions].sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    const firstDate = dayjs(sortedTxs[0].date).format('YYYY-MM-DD');
    const lastDate = dayjs().format('YYYY-MM-DD');
    
    if (options.days && options.days > 0) {
      startDate = dayjs().subtract(options.days - 1, 'day').format('YYYY-MM-DD');
    } else {
      startDate = firstDate;
    }
    endDate = lastDate;
  }

  // Get portfolio value history
  const valueHistory = await calculatePortfolioValueHistory(
    transactions,
    priceHistory,
    { 
      days: options.days,
      startDate: options.startDate,
      endDate: options.endDate
    }
  );

  // Get invested capital history
  const investedHistory = calculateDailyInvestedCapital(
    transactions,
    startDate,
    endDate
  );

  // Create a map of dates to invested capital for easy lookup
  const investedByDate = new Map<string, { ARS: number; USD: number }>();
  investedHistory.forEach(entry => {
    investedByDate.set(entry.date, { ARS: entry.investedARS, USD: entry.investedUSD });
  });

  // Combine the data into summary entries
  const summaryHistory: PortfolioSummaryEntry[] = valueHistory.map(entry => {
    const invested = investedByDate.get(entry.date) || { ARS: 0, USD: 0 };

    return {
      date: entry.date,
      totalARS: entry.valueARS,
      totalUSD: entry.valueUSD,
      investedARS: invested.ARS,
      investedUSD: invested.USD,
      cashARS: entry.cashARS,
      cashUSD: entry.cashUSD,
    };
  });

  return summaryHistory;
} 