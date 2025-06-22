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
  if (!transactions || transactions.length === 0) return [];

  const txs = [...transactions].sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  
  const transactionsByDate = new Map<string, PortfolioTransaction[]>();
  for(const tx of txs) {
    const dateStr = dayjs(tx.date).format('YYYY-MM-DD');
    if (!transactionsByDate.has(dateStr)) {
      transactionsByDate.set(dateStr, []);
    }
    transactionsByDate.get(dateStr)!.push(tx);
  }

  const firstDate = dayjs(txs[0].date).startOf('day');
  const lastDate = dayjs().startOf('day');
  
  let startDate: dayjs.Dayjs;
  if (options.days && options.days > 0) {
    startDate = lastDate.subtract(options.days - 1, 'day');
  } else {
    startDate = firstDate;
  }
  
  const allDates: string[] = [];
  let currentDate = startDate;
  while (currentDate.isSameOrBefore(lastDate)) {
    allDates.push(currentDate.format('YYYY-MM-DD'));
    currentDate = currentDate.add(1, 'day');
  }
  
  const positions: Record<string, number> = {};
  
  // Initialize positions up to the start date
  for (const tx of txs) {
    const txDate = dayjs(tx.date);
    if (txDate.isAfter(startDate.subtract(1, 'day'))) {
      break; 
    }
    if (tx.type === 'Buy' || tx.type === 'Sell') {
      const identifier = tx.assetType === 'Stock' ? tx.symbol : tx.assetType === 'Bond' ? tx.ticker : null;
      if (identifier) {
        if (tx.type === 'Buy') {
          positions[identifier] = (positions[identifier] || 0) + tx.quantity;
        } else if (tx.type === 'Sell') {
          positions[identifier] = (positions[identifier] || 0) - tx.quantity;
        }
      }
    }
  }

  const valueHistory: { date: string; value: number }[] = [];
  let lastKnownValue = 0;

  for (const dateStr of allDates) {
    const dailyTxs = transactionsByDate.get(dateStr) || [];
    for (const tx of dailyTxs) {
      if (tx.type === 'Buy' || tx.type === 'Sell') {
        const identifier = tx.assetType === 'Stock' ? tx.symbol : tx.assetType === 'Bond' ? tx.ticker : null;
        if (identifier) {
          if (tx.type === 'Buy') {
            positions[identifier] = (positions[identifier] || 0) + tx.quantity;
          } else if (tx.type === 'Sell') {
            positions[identifier] = (positions[identifier] || 0) - tx.quantity;
          }
        }
      }
    }

    let dailyValue = 0;
    for (const symbol in positions) {
      if (positions[symbol] <= 0) continue;
      
      const ph = priceHistory[symbol];
      if (!ph || ph.length === 0) continue;
      
      let price = 0;
      const priceEntry = ph.slice().reverse().find(p => dayjs(p.date).isSameOrBefore(dateStr));
      if(priceEntry) {
        price = priceEntry.close;
      }
      
      dailyValue += positions[symbol] * price;
    }
    
    if (dailyValue === 0 && Object.keys(positions).length > 0) {
      dailyValue = lastKnownValue;
    }
    
    valueHistory.push({ date: dateStr, value: dailyValue });
    lastKnownValue = dailyValue;
  }

  return valueHistory;
}

// Backward compatibility functions
export function getDailyPortfolioValue(
  transactions: PortfolioTransaction[],
  priceHistory: Record<string, PriceData[]>
): { date: string; value: number }[] {
  return calculatePortfolioValueHistory(transactions, priceHistory, {});
} 