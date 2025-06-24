import { PortfolioTransaction, FixedTermDepositCreationTransaction } from '@/types';
import { PriceData } from '@/types/finance';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { getExchangeRate } from './currency';
dayjs.extend(isSameOrBefore);

interface ActiveFixedTermDeposit extends FixedTermDepositCreationTransaction {
  isMatured?: boolean;
}

export interface PortfolioValueHistory {
  date: string;
  valueARS: number;
  valueUSD: number;
}

export interface PortfolioValueOptions {
  days?: number; // If provided, calculate last N days. If not, calculate from first transaction to today
}

export function calculatePortfolioValueHistory(
  transactions: PortfolioTransaction[],
  priceHistory: Record<string, PriceData[]>,
  options: PortfolioValueOptions = {}
): PortfolioValueHistory[] {
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
  
  const positions: Record<string, { quantity: number; currency: 'ARS' | 'USD' }> = {};
  const activeDeposits: ActiveFixedTermDeposit[] = [];
  
  // Initialize positions up to the start date
  for (const tx of txs) {
    const txDate = dayjs(tx.date);
    if (txDate.isAfter(startDate.subtract(1, 'day'))) {
      break; 
    }
    if (tx.type === 'Buy' || tx.type === 'Sell') {
      const identifier = tx.assetType === 'Stock' ? tx.symbol : tx.assetType === 'Bond' ? tx.ticker : null;
      if (identifier) {
        const key = `${identifier}_${tx.currency}`;
        const currentQuantity = positions[key]?.quantity || 0;
        if (tx.type === 'Buy') {
          positions[key] = { quantity: currentQuantity + tx.quantity, currency: tx.currency };
        } else if (tx.type === 'Sell') {
          positions[key] = { quantity: currentQuantity - tx.quantity, currency: tx.currency };
        }
      }
    } else if (tx.type === 'Create' && tx.assetType === 'FixedTermDeposit') {
      activeDeposits.push(tx as ActiveFixedTermDeposit);
    }
  }

  const valueHistory: PortfolioValueHistory[] = [];
  let lastKnownValueARS = 0;
  let lastKnownValueUSD = 0;

  for (const dateStr of allDates) {
    const today = dayjs(dateStr);
    const dailyTxs = transactionsByDate.get(dateStr) || [];
    for (const tx of dailyTxs) {
      if (tx.type === 'Buy' || tx.type === 'Sell') {
        const identifier = tx.assetType === 'Stock' ? tx.symbol : tx.assetType === 'Bond' ? tx.ticker : null;
        if (identifier) {
          const key = `${identifier}_${tx.currency}`;
          const currentQuantity = positions[key]?.quantity || 0;
          if (tx.type === 'Buy') {
            positions[key] = { quantity: currentQuantity + tx.quantity, currency: tx.currency };
          } else if (tx.type === 'Sell') {
            positions[key] = { quantity: currentQuantity - tx.quantity, currency: tx.currency };
          }
        }
      } else if (tx.type === 'Create' && tx.assetType === 'FixedTermDeposit') {
        activeDeposits.push(tx as ActiveFixedTermDeposit);
      }
    }

    let dailyValueARS = 0;
    let dailyValueUSD = 0;

    // Stocks and Bonds
    for (const key in positions) {
      const { quantity, currency } = positions[key];
      if (quantity <= 1e-6) continue;
      
      const symbol = key.split('_')[0];
      const ph = priceHistory[symbol];
      if (!ph || ph.length === 0) continue;
      
      let price = 0;
      const priceEntry = ph.slice().reverse().find(p => dayjs(p.date).isSameOrBefore(dateStr));
      if(priceEntry) {
        price = priceEntry.close;
      }
      
      const valueInOwnCurrency = quantity * price;

      if (currency === 'ARS') {
        dailyValueARS += valueInOwnCurrency;
      } else {
        dailyValueUSD += valueInOwnCurrency;
      }
    }
    
    // Fixed-Term Deposits
    for (const deposit of activeDeposits) {
      const startDate = dayjs(deposit.date);
      const maturityDate = dayjs(deposit.maturityDate);

      if (today.isBefore(startDate)) continue;

      if (today.isAfter(maturityDate) && !deposit.isMatured) {
        deposit.isMatured = true;
      }

      if (deposit.isMatured) continue;

      let value = deposit.amount;
      if (today.isAfter(startDate)) {
        const daysActive = today.diff(startDate, 'day');
        const dailyRate = deposit.annualRate / 100 / 365;
        const interest = deposit.amount * dailyRate * daysActive;
        value += interest;
      }
      
      if (deposit.currency === 'ARS') {
        dailyValueARS += value;
      } else {
        dailyValueUSD += value;
      }
    }
    
    const exchangeRate = getExchangeRate('USD', 'ARS');
    const totalARS = dailyValueARS + dailyValueUSD * exchangeRate;
    const totalUSD = dailyValueUSD + dailyValueARS / exchangeRate;
    
    if (totalARS === 0 && (Object.keys(positions).length > 0 || activeDeposits.length > 0)) {
      valueHistory.push({ date: dateStr, valueARS: lastKnownValueARS, valueUSD: lastKnownValueUSD });
    } else {
      valueHistory.push({ date: dateStr, valueARS: totalARS, valueUSD: totalUSD });
      lastKnownValueARS = totalARS;
      lastKnownValueUSD = totalUSD;
    }
  }

  return valueHistory;
}

// Backward compatibility functions - NOTE: This will need to be updated where used
export function getDailyPortfolioValue(
  transactions: PortfolioTransaction[],
  priceHistory: Record<string, PriceData[]>
): { date: string; valueARS: number; valueUSD: number }[] {
  const history = calculatePortfolioValueHistory(transactions, priceHistory, {});
  // Now returns both ARS and USD values for each day.
  return history.map(h => ({ date: h.date, valueARS: h.valueARS, valueUSD: h.valueUSD }));
}

/**
 * Calculates the current value of the portfolio by currency (no conversion).
 * Sums the value of each position in its own currency plus the cash in that currency.
 * @param positions Portfolio positions
 * @param cash { ARS: number, USD: number }
 * @param priceHistory Price data for stocks/bonds
 * @returns { ARS: number, USD: number }
 */
export function calculateCurrentValueByCurrency(
  positions: any[],
  cash: { ARS: number; USD: number },
  priceHistory: Record<string, PriceData[]>
): { ARS: number; USD: number } {
  let valueARS = cash.ARS || 0;
  let valueUSD = cash.USD || 0;

  for (const pos of positions) {
    if (pos.type === 'Stock' || pos.type === 'Bond') {
      const symbol = pos.type === 'Stock' ? pos.symbol : pos.ticker;
      const prices = priceHistory[symbol];
      if (prices && prices.length > 0) {
        const currentPrice = prices[prices.length - 1].close;
        if (pos.currency === 'ARS') {
          valueARS += pos.quantity * currentPrice;
        } else if (pos.currency === 'USD') {
          valueUSD += pos.quantity * currentPrice;
        }
      }
    } else if (pos.type === 'FixedTermDeposit') {
      if (pos.currency === 'ARS') {
        valueARS += pos.amount;
      } else if (pos.currency === 'USD') {
        valueUSD += pos.amount;
      }
    }
  }
  return { ARS: valueARS, USD: valueUSD };
} 