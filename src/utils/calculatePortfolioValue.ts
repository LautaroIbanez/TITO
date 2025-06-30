import { PortfolioTransaction, FixedTermDepositCreationTransaction, CaucionCreationTransaction } from '@/types';
import { PriceData } from '@/types/finance';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { getExchangeRate } from './currency';
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

interface ActiveFixedTermDeposit extends FixedTermDepositCreationTransaction {
  isMatured?: boolean;
}

interface ActiveCaucion extends CaucionCreationTransaction {
  isMatured?: boolean;
}

export interface PortfolioValueHistory {
  date: string;
  valueARS: number;
  valueUSD: number;
  valueARSRaw: number;
  valueUSDRaw: number;
  cashARS: number;
  cashUSD: number;
}

export interface PortfolioValueOptions {
  days?: number; // If provided, calculate last N days. If not, calculate from first transaction to today
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export async function calculatePortfolioValueHistory(
  transactions: PortfolioTransaction[],
  priceHistory: Record<string, PriceData[]>,
  options: PortfolioValueOptions = {}
): Promise<PortfolioValueHistory[]> {
  if (!transactions || transactions.length === 0) return [];

  const txs = [...transactions].sort((a, b) => dayjs(a.date).startOf('day').diff(dayjs(b.date).startOf('day')));
  
  const transactionsByDate = new Map<string, PortfolioTransaction[]>();
  for(const tx of txs) {
    const dateStr = dayjs(tx.date).startOf('day').format('YYYY-MM-DD');
    if (!transactionsByDate.has(dateStr)) {
      transactionsByDate.set(dateStr, []);
    }
    transactionsByDate.get(dateStr)!.push(tx);
  }

  // --- Date range logic ---
  let startDate: dayjs.Dayjs;
  let lastDate: dayjs.Dayjs;
  if (options.startDate && options.endDate) {
    startDate = dayjs(options.startDate).startOf('day');
    lastDate = dayjs(options.endDate).startOf('day');
  } else {
    const firstDate = dayjs(txs[0].date).startOf('day');
    lastDate = dayjs().startOf('day');
    if (options.days && options.days > 0) {
      startDate = lastDate.subtract(options.days - 1, 'day').startOf('day');
    } else {
      startDate = firstDate;
    }
  }
  // --- End date range logic ---

  const allDates: string[] = [];
  let currentDate = startDate;
  while (currentDate.isSameOrBefore(lastDate)) {
    allDates.push(currentDate.format('YYYY-MM-DD'));
    currentDate = currentDate.add(1, 'day').startOf('day');
  }
  
  const positions: Record<string, { quantity: number; currency: 'ARS' | 'USD' }> = {};
  const activeDeposits: ActiveFixedTermDeposit[] = [];
  const maturedDeposits: ActiveFixedTermDeposit[] = [];
  const activeCauciones: ActiveCaucion[] = [];
  const maturedCauciones: ActiveCaucion[] = [];
  
  // Initialize cash balances and positions up to the start date
  let cashARS = 0;
  let cashUSD = 0;
  
  for (const tx of txs) {
    const txDate = dayjs(tx.date).startOf('day');
    if (txDate.isSameOrBefore(startDate)) {
      if (tx.type === 'Buy' || tx.type === 'Sell') {
        let identifier: string | null = null;
        if (tx.assetType === 'Stock' && 'symbol' in tx) {
          identifier = tx.symbol;
        } else if (tx.assetType === 'Bond' && 'ticker' in tx) {
          identifier = tx.ticker;
        } else if (tx.assetType === 'Crypto' && 'symbol' in tx) {
          identifier = tx.symbol;
        }
        
        if (identifier) {
          const key = `${identifier}_${tx.currency}`;
          const currentQuantity = positions[key]?.quantity || 0;
          if (tx.type === 'Buy') {
            positions[key] = { quantity: currentQuantity + tx.quantity, currency: tx.currency };
            // Reduce cash by the purchase amount (including fees)
            const totalCost = tx.quantity * tx.price;
            const commission = tx.commissionPct ? totalCost * (tx.commissionPct / 100) : 0;
            const purchaseFee = tx.purchaseFeePct ? totalCost * (tx.purchaseFeePct / 100) : 0;
            const totalAmount = totalCost + commission + purchaseFee;
            
            if (tx.currency === 'ARS') {
              cashARS -= totalAmount;
            } else {
              cashUSD -= totalAmount;
            }
          } else if (tx.type === 'Sell') {
            positions[key] = { quantity: currentQuantity - tx.quantity, currency: tx.currency };
            // Add cash from the sale (minus fees)
            const totalProceeds = tx.quantity * tx.price;
            const commission = tx.commissionPct ? totalProceeds * (tx.commissionPct / 100) : 0;
            const totalAmount = totalProceeds - commission;
            
            if (tx.currency === 'ARS') {
              cashARS += totalAmount;
            } else {
              cashUSD += totalAmount;
            }
          }
        }
      } else if (tx.type === 'Create' && tx.assetType === 'FixedTermDeposit') {
        activeDeposits.push(tx as ActiveFixedTermDeposit);
        // Reduce cash by the deposit amount
        if (tx.currency === 'ARS') {
          cashARS -= tx.amount;
        } else {
          cashUSD -= tx.amount;
        }
      } else if (tx.type === 'Create' && tx.assetType === 'Caucion') {
        activeCauciones.push(tx as ActiveCaucion);
        // Reduce cash by the caucion amount
        if (tx.currency === 'ARS') {
          cashARS -= tx.amount;
        } else {
          cashUSD -= tx.amount;
        }
      } else if (tx.type === 'Deposit') {
        // Add cash from deposit
        if (tx.currency === 'ARS') {
          cashARS += tx.amount;
        } else {
          cashUSD += tx.amount;
        }
      } else if (tx.type === 'Withdrawal') {
        // Remove matured deposits that match the withdrawal amount and currency
        const withdrawalAmount = tx.amount;
        const withdrawalCurrency = tx.currency;
        let withdrawalHandled = false;
        
        // Find and remove matching matured deposits
        for (let i = maturedDeposits.length - 1; i >= 0; i--) {
          const deposit = maturedDeposits[i];
          if (deposit.currency === withdrawalCurrency) {
            // Calculate the final value of the deposit (principal + full interest)
            const startDate = dayjs(deposit.date).startOf('day');
            const maturityDate = dayjs(deposit.maturityDate).startOf('day');
            const days = maturityDate.diff(startDate, 'day');
            const dailyRate = deposit.annualRate / 100 / 365;
            const fullInterest = deposit.amount * dailyRate * days;
            const finalValue = deposit.amount + fullInterest;
            
            if (Math.abs(finalValue - withdrawalAmount) < 1) { // Allow small rounding differences
              maturedDeposits.splice(i, 1);
              withdrawalHandled = true;
              break; // Remove only one deposit per withdrawal
            }
          }
        }
        
        // Find and remove matching matured cauciones
        for (let i = maturedCauciones.length - 1; i >= 0; i--) {
          const caucion = maturedCauciones[i];
          if (caucion.currency === withdrawalCurrency) {
            // Calculate the final value of the caucion (principal + full interest)
            const startDate = dayjs(caucion.date).startOf('day');
            const maturityDate = dayjs(caucion.maturityDate).startOf('day');
            const days = maturityDate.diff(startDate, 'day');
            const dailyRate = caucion.annualRate / 100 / 365;
            const fullInterest = caucion.amount * dailyRate * days;
            const finalValue = caucion.amount + fullInterest;
            
            if (Math.abs(finalValue - withdrawalAmount) < 1) { // Allow small rounding differences
              maturedCauciones.splice(i, 1);
              withdrawalHandled = true;
              break; // Remove only one caucion per withdrawal
            }
          }
        }
        
        // Only remove cash if the withdrawal wasn't handled by a matured asset
        if (!withdrawalHandled) {
          if (tx.currency === 'ARS') {
            cashARS -= tx.amount;
          } else {
            cashUSD -= tx.amount;
          }
        }
      }
    }
  }

  const valueHistory: PortfolioValueHistory[] = [];
  let lastKnownValueARS = 0;
  let lastKnownValueUSD = 0;

  for (const dateStr of allDates) {
    const today = dayjs(dateStr).startOf('day');
    const dailyTxs = transactionsByDate.get(dateStr) || [];
    for (const tx of dailyTxs) {
      if (tx.type === 'Buy' || tx.type === 'Sell') {
        let identifier: string | null = null;
        if (tx.assetType === 'Stock' && 'symbol' in tx) {
          identifier = tx.symbol;
        } else if (tx.assetType === 'Bond' && 'ticker' in tx) {
          identifier = tx.ticker;
        } else if (tx.assetType === 'Crypto' && 'symbol' in tx) {
          identifier = tx.symbol;
        }
        
        if (identifier) {
          const key = `${identifier}_${tx.currency}`;
          const currentQuantity = positions[key]?.quantity || 0;
          if (tx.type === 'Buy') {
            positions[key] = { quantity: currentQuantity + tx.quantity, currency: tx.currency };
            // Reduce cash by the purchase amount (including fees)
            const totalCost = tx.quantity * tx.price;
            const commission = tx.commissionPct ? totalCost * (tx.commissionPct / 100) : 0;
            const purchaseFee = tx.purchaseFeePct ? totalCost * (tx.purchaseFeePct / 100) : 0;
            const totalAmount = totalCost + commission + purchaseFee;
            
            if (tx.currency === 'ARS') {
              cashARS -= totalAmount;
            } else {
              cashUSD -= totalAmount;
            }
          } else if (tx.type === 'Sell') {
            positions[key] = { quantity: currentQuantity - tx.quantity, currency: tx.currency };
            // Add cash from the sale (minus fees)
            const totalProceeds = tx.quantity * tx.price;
            const commission = tx.commissionPct ? totalProceeds * (tx.commissionPct / 100) : 0;
            const totalAmount = totalProceeds - commission;
            
            if (tx.currency === 'ARS') {
              cashARS += totalAmount;
            } else {
              cashUSD += totalAmount;
            }
          }
        }
      } else if (tx.type === 'Create' && tx.assetType === 'FixedTermDeposit') {
        activeDeposits.push(tx as ActiveFixedTermDeposit);
        // Reduce cash by the deposit amount
        if (tx.currency === 'ARS') {
          cashARS -= tx.amount;
        } else {
          cashUSD -= tx.amount;
        }
      } else if (tx.type === 'Create' && tx.assetType === 'Caucion') {
        activeCauciones.push(tx as ActiveCaucion);
        // Reduce cash by the caucion amount
        if (tx.currency === 'ARS') {
          cashARS -= tx.amount;
        } else {
          cashUSD -= tx.amount;
        }
      } else if (tx.type === 'Deposit') {
        // Add cash from deposit
        if (tx.currency === 'ARS') {
          cashARS += tx.amount;
        } else {
          cashUSD += tx.amount;
        }
      } else if (tx.type === 'Withdrawal') {
        // Remove matured deposits that match the withdrawal amount and currency
        const withdrawalAmount = tx.amount;
        const withdrawalCurrency = tx.currency;
        let withdrawalHandled = false;
        
        // Find and remove matching matured deposits
        for (let i = maturedDeposits.length - 1; i >= 0; i--) {
          const deposit = maturedDeposits[i];
          if (deposit.currency === withdrawalCurrency) {
            // Calculate the final value of the deposit (principal + full interest)
            const startDate = dayjs(deposit.date).startOf('day');
            const maturityDate = dayjs(deposit.maturityDate).startOf('day');
            const days = maturityDate.diff(startDate, 'day');
            const dailyRate = deposit.annualRate / 100 / 365;
            const fullInterest = deposit.amount * dailyRate * days;
            const finalValue = deposit.amount + fullInterest;
            
            if (Math.abs(finalValue - withdrawalAmount) < 1) { // Allow small rounding differences
              maturedDeposits.splice(i, 1);
              withdrawalHandled = true;
              break; // Remove only one deposit per withdrawal
            }
          }
        }
        
        // Find and remove matching matured cauciones
        for (let i = maturedCauciones.length - 1; i >= 0; i--) {
          const caucion = maturedCauciones[i];
          if (caucion.currency === withdrawalCurrency) {
            // Calculate the final value of the caucion (principal + full interest)
            const startDate = dayjs(caucion.date).startOf('day');
            const maturityDate = dayjs(caucion.maturityDate).startOf('day');
            const days = maturityDate.diff(startDate, 'day');
            const dailyRate = caucion.annualRate / 100 / 365;
            const fullInterest = caucion.amount * dailyRate * days;
            const finalValue = caucion.amount + fullInterest;
            
            if (Math.abs(finalValue - withdrawalAmount) < 1) { // Allow small rounding differences
              maturedCauciones.splice(i, 1);
              withdrawalHandled = true;
              break; // Remove only one caucion per withdrawal
            }
          }
        }
        
        // Only remove cash if the withdrawal wasn't handled by a matured asset
        if (!withdrawalHandled) {
          if (tx.currency === 'ARS') {
            cashARS -= tx.amount;
          } else {
            cashUSD -= tx.amount;
          }
        }
      }
    }

    let dailyValueARS = cashARS; // Start with cash balance
    let dailyValueUSD = cashUSD; // Start with cash balance

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
      const startDate = dayjs(deposit.date).startOf('day');
      const maturityDate = dayjs(deposit.maturityDate).startOf('day');

      if (today.isBefore(startDate)) continue;

      if (today.isAfter(maturityDate) && !deposit.isMatured) {
        deposit.isMatured = true;
        // Move to matured deposits array
        maturedDeposits.push(deposit);
        // Remove from active deposits
        const index = activeDeposits.indexOf(deposit);
        if (index > -1) {
          activeDeposits.splice(index, 1);
        }
      }

      if (deposit.isMatured) continue;

      let value = deposit.amount;
      if (today.isSameOrAfter(startDate)) {
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
    
    // Cauciones
    for (const caucion of activeCauciones) {
      const startDate = dayjs(caucion.date).startOf('day');
      const maturityDate = dayjs(caucion.maturityDate).startOf('day');

      if (today.isBefore(startDate)) continue;

      if (today.isAfter(maturityDate) && !caucion.isMatured) {
        caucion.isMatured = true;
        // Move to matured cauciones array
        maturedCauciones.push(caucion);
        // Remove from active cauciones
        const index = activeCauciones.indexOf(caucion);
        if (index > -1) {
          activeCauciones.splice(index, 1);
        }
      }

      if (caucion.isMatured) continue;

      let value = caucion.amount;
      if (today.isSameOrAfter(startDate)) {
        const daysActive = today.diff(startDate, 'day');
        const dailyRate = caucion.annualRate / 100 / 365;
        const interest = caucion.amount * dailyRate * daysActive;
        value += interest;
      }
      
      if (caucion.currency === 'ARS') {
        dailyValueARS += value;
      } else {
        dailyValueUSD += value;
      }
    }
    
    // Matured Deposits (keep their final value until withdrawn)
    for (const deposit of maturedDeposits) {
      const startDate = dayjs(deposit.date).startOf('day');
      const maturityDate = dayjs(deposit.maturityDate).startOf('day');
      const days = maturityDate.diff(startDate, 'day');
      const dailyRate = deposit.annualRate / 100 / 365;
      const fullInterest = deposit.amount * dailyRate * days;
      const finalValue = deposit.amount + fullInterest;
      
      if (deposit.currency === 'ARS') {
        dailyValueARS += finalValue;
      } else {
        dailyValueUSD += finalValue;
      }
    }
    
    // Matured Cauciones (keep their final value until withdrawn)
    for (const caucion of maturedCauciones) {
      const startDate = dayjs(caucion.date).startOf('day');
      const maturityDate = dayjs(caucion.maturityDate).startOf('day');
      const days = maturityDate.diff(startDate, 'day');
      const dailyRate = caucion.annualRate / 100 / 365;
      const fullInterest = caucion.amount * dailyRate * days;
      const finalValue = caucion.amount + fullInterest;
      
      if (caucion.currency === 'ARS') {
        dailyValueARS += finalValue;
      } else {
        dailyValueUSD += finalValue;
      }
    }
    
    // Store raw values before conversion
    const valueARSRaw = dailyValueARS;
    const valueUSDRaw = dailyValueUSD;
    
    const exchangeRate = await getExchangeRate('USD', 'ARS');
    const totalARS = dailyValueARS + dailyValueUSD * exchangeRate;
    const totalUSD = dailyValueUSD + dailyValueARS / exchangeRate;
    
    // Only use last known value if we have no positions/deposits but still have a value
    // This prevents the value from dropping to 0 when we have active positions
    if (totalARS === 0 && lastKnownValueARS > 0 && 
        Object.keys(positions).length === 0 && 
        activeDeposits.length === 0 && 
        maturedDeposits.length === 0 &&
        activeCauciones.length === 0 &&
        maturedCauciones.length === 0) {
      valueHistory.push({ 
        date: dateStr, 
        valueARS: lastKnownValueARS, 
        valueUSD: lastKnownValueUSD,
        valueARSRaw: lastKnownValueARS,
        valueUSDRaw: lastKnownValueUSD,
        cashARS: cashARS,
        cashUSD: cashUSD
      });
    } else {
      valueHistory.push({ 
        date: dateStr, 
        valueARS: totalARS, 
        valueUSD: totalUSD,
        valueARSRaw: valueARSRaw,
        valueUSDRaw: valueUSDRaw,
        cashARS: cashARS,
        cashUSD: cashUSD
      });
      lastKnownValueARS = totalARS;
      lastKnownValueUSD = totalUSD;
    }
  }

  return valueHistory;
}

// Backward compatibility functions - NOTE: This will need to be updated where used
export async function getDailyPortfolioValue(
  transactions: PortfolioTransaction[],
  priceHistory: Record<string, PriceData[]>
): Promise<{ date: string; valueARS: number; valueUSD: number }[]> {
  const history = await calculatePortfolioValueHistory(transactions, priceHistory, {});
  // Return only the converted values for backward compatibility
  return history.map(h => ({ date: h.date, valueARS: h.valueARS, valueUSD: h.valueUSD }));
}

/**
 * Calculates the current value of the portfolio by currency (no conversion).
 * Sums the value of each position in its own currency plus the cash in that currency.
 * @param positions Portfolio positions
 * @param cash { ARS: number, USD: number }
 * @param priceHistory Price data for stocks/bonds/crypto
 * @returns { ARS: number, USD: number }
 */
export function calculateCurrentValueByCurrency(
  positions: any[],
  cash: { ARS: number; USD: number },
  priceHistory: Record<string, PriceData[]>
): { ARS: number; USD: number } {
  let valueARS = cash.ARS || 0;
  let valueUSD = cash.USD || 0;

  const today = new Date();

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
    } else if (pos.type === 'Crypto') {
      const prices = priceHistory[pos.symbol];
      if (prices && prices.length > 0) {
        const currentPrice = prices[prices.length - 1].close;
        // Crypto is always valued in USD
        valueUSD += pos.quantity * currentPrice;
      }
    } else if (pos.type === 'FixedTermDeposit') {
      const startDate = new Date(pos.startDate);
      const maturityDate = new Date(pos.maturityDate);
      let value = pos.amount;
      let interest = 0;
      if (today >= maturityDate) {
        // Full interest
        const days = Math.round((maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyRate = pos.annualRate / 100 / 365;
        interest = pos.amount * dailyRate * days;
      } else if (today > startDate) {
        // Accrued interest up to today
        const days = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyRate = pos.annualRate / 100 / 365;
        interest = pos.amount * dailyRate * days;
      }
      value += interest;
      if (pos.currency === 'ARS') {
        valueARS += value;
      } else if (pos.currency === 'USD') {
        valueUSD += value;
      }
    } else if (pos.type === 'Caucion') {
      const startDate = new Date(pos.startDate);
      const maturityDate = new Date(pos.maturityDate);
      let value = pos.amount;
      let interest = 0;
      if (today >= maturityDate) {
        // Full interest
        const days = Math.round((maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyRate = pos.annualRate / 100 / 365;
        interest = pos.amount * dailyRate * days;
      } else if (today > startDate) {
        // Accrued interest up to today
        const days = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyRate = pos.annualRate / 100 / 365;
        interest = pos.amount * dailyRate * days;
      }
      value += interest;
      if (pos.currency === 'ARS') {
        valueARS += value;
      } else if (pos.currency === 'USD') {
        valueUSD += value;
      }
    }
  }
  return { ARS: valueARS, USD: valueUSD };
} 