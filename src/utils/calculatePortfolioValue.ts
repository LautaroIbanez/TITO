import { PortfolioTransaction } from '@/types';
import { PriceData } from '@/types/finance';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrBefore);

export interface PortfolioValueOptions {
  days?: number; // If provided, calculate last N days. If not, calculate from first transaction to today
}

export function calculatePortfolioValueHistory(
  transactions: PortfolioTransaction[],
  priceHistory: Record<string, PriceData[]>,
  options: PortfolioValueOptions = {}
): { date: string; value: number }[] {
  if (!transactions.length) return [];
  
  // Sort transactions by date
  const txs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstDate = dayjs(txs[0].date).startOf('day');
  const lastDate = dayjs().startOf('day');
  
  // Determine date range
  let startDate: dayjs.Dayjs;
  if (options.days) {
    // Calculate last N days
    startDate = lastDate.subtract(options.days - 1, 'day');
  } else {
    // Calculate from first transaction to today
    startDate = firstDate;
  }
  
  // Generate date array
  const allDates: string[] = [];
  let d = startDate;
  while (!d.isAfter(lastDate)) {
    allDates.push(d.format('YYYY-MM-DD'));
    d = d.add(1, 'day');
  }
  
  // For each day, build position map and compute value
  let prevPos: Record<string, number> = {};
  let prevValue = 0;
  const result: { date: string; value: number }[] = [];
  
  for (const date of allDates) {
    // Build position map up to this date
    const pos: Record<string, number> = { ...prevPos };
    for (const tx of txs) {
      if (dayjs(tx.date).isAfter(date)) break;
      if (tx.type === 'Buy' || tx.type === 'Sell') {
        // Use type guard to access correct property
        const identifier = tx.assetType === 'Stock' ? tx.symbol : tx.assetType === 'Bond' ? tx.ticker : null;
        if (identifier) {
          if (tx.type === 'Buy') pos[identifier] = (pos[identifier] || 0) + tx.quantity;
          if (tx.type === 'Sell') pos[identifier] = (pos[identifier] || 0) - tx.quantity;
        }
      }
    }
    
    // Remove zero or negative positions
    Object.keys(pos).forEach((s) => { if (pos[s] <= 0) delete pos[s]; });
    
    // Compute value
    let value = 0;
    for (const symbol in pos) {
      const ph = priceHistory[symbol];
      if (!ph) continue;
      
      // Find price for this date (or previous available)
      let price = 0;
      for (let i = ph.length - 1; i >= 0; i--) {
        if (dayjs(ph[i].date).isSameOrBefore(date)) {
          price = ph[i].close;
          break;
        }
      }
      value += pos[symbol] * price;
    }
    
    // If no price data, use previous value
    if (value === 0 && prevValue > 0) value = prevValue;
    
    result.push({ date, value });
    prevPos = pos;
    prevValue = value;
  }
  
  return result;
}

// Backward compatibility functions
export function getDailyPortfolioValue(
  transactions: PortfolioTransaction[],
  priceHistory: Record<string, PriceData[]>
): { date: string; value: number }[] {
  return calculatePortfolioValueHistory(transactions, priceHistory, {});
} 