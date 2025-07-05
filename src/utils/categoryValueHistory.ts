import { PortfolioTransaction, FixedTermDepositCreationTransaction, CaucionCreationTransaction } from '@/types';
import { PriceData } from '@/types/finance';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { getExchangeRate } from './currency';
import { STOCK_CATEGORIES, AR_SOVEREIGN_BONDS } from './assetCategories';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

interface ActiveFixedTermDeposit extends FixedTermDepositCreationTransaction {
  isMatured?: boolean;
}

interface ActiveCaucion extends CaucionCreationTransaction {
  isMatured?: boolean;
}

export interface CategoryValueEntry {
  date: string;
  categories: {
    [category: string]: number;
  };
  totalValue: number;
}

export interface CategoryValueOptions {
  days?: number; // If provided, calculate last N days. If not, calculate from first transaction to today
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  currency?: 'ARS' | 'USD'; // Target currency for conversion
}

// Define asset categories
const ASSET_CATEGORIES = {
  // Stock categories
  etfs: STOCK_CATEGORIES.etfs,
  tech: STOCK_CATEGORIES.tech,
  semiconductors: STOCK_CATEGORIES.semiconductors,
  communication: STOCK_CATEGORIES.communication,
  industrials: STOCK_CATEGORIES.industrials,
  defensive: STOCK_CATEGORIES.defensive,
  materials: STOCK_CATEGORIES.materials,
  healthcare: STOCK_CATEGORIES.healthcare,
  financials: STOCK_CATEGORIES.financials,
  cyclical: STOCK_CATEGORIES.cyclical,
  merval: STOCK_CATEGORIES.merval,
  // Other asset types
  bonds: AR_SOVEREIGN_BONDS,
  crypto: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BNBUSDT', 'DOGEUSDT', 'MATICUSDT', 'SOLUSDT'],
  deposits: ['FixedTermDeposit'],
  cauciones: ['Caucion'],
  cash: ['Cash']
};

/**
 * Determines the category of an asset based on its symbol/ticker
 */
function getAssetCategory(symbol: string, assetType: string): string {
  // Check stock categories
  for (const [category, symbols] of Object.entries(ASSET_CATEGORIES)) {
    if (symbols.includes(symbol)) {
      return category;
    }
  }
  
  // Handle asset types
  if (assetType === 'FixedTermDeposit') return 'deposits';
  if (assetType === 'Caucion') return 'cauciones';
  if (assetType === 'Crypto') return 'crypto';
  if (assetType === 'Bond') return 'bonds';
  if (assetType === 'RealEstate') return 'realEstate';
  
  // Default category for unknown stocks
  if (assetType === 'Stock') return 'other_stocks';
  
  return 'other';
}

/**
 * Calculates the historical value of portfolio by category
 */
export async function calculateCategoryValueHistory(
  transactions: PortfolioTransaction[],
  priceHistory: Record<string, PriceData[]>,
  currency: 'ARS' | 'USD' = 'ARS',
  options: CategoryValueOptions = {}
): Promise<CategoryValueEntry[]> {
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
  
  // Track which transactions have been processed in initialization
  const processedTransactions = new Set<string>();
  
  for (const tx of txs) {
    const txDate = dayjs(tx.date).startOf('day');
    if (txDate.isSameOrBefore(startDate)) {
      processedTransactions.add(tx.id);
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
      } else if (tx.type === 'Acreditación Plazo Fijo' || tx.type === 'Acreditación Caución' || tx.type === 'Pago de Cupón Bono' || tx.type === 'Amortización Bono') {
        // Cash inflows from matured fixed income instruments or bond payments
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

  const valueHistory: CategoryValueEntry[] = [];
  let lastKnownTotalValue = 0;

  for (const dateStr of allDates) {
    const today = dayjs(dateStr).startOf('day');
    const dailyTxs = transactionsByDate.get(dateStr) || [];
    
    for (const tx of dailyTxs) {
      // Skip transactions that were already processed in initialization
      if (processedTransactions.has(tx.id)) {
        continue;
      }
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
      } else if (tx.type === 'Acreditación Plazo Fijo' || tx.type === 'Acreditación Caución' || tx.type === 'Pago de Cupón Bono' || tx.type === 'Amortización Bono') {
        // Cash inflows from matured fixed income instruments or bond payments
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

    // Initialize category values
    const categoryValues: { [category: string]: number } = {};
    
    // Add cash to appropriate category
    if (currency === 'ARS') {
      categoryValues.cash = cashARS;
    } else {
      categoryValues.cash = cashUSD;
    }

    // Calculate values for each position by category
    for (const key in positions) {
      const { quantity, currency: posCurrency } = positions[key];
      if (quantity <= 1e-6) continue;
      
      const symbol = key.split('_')[0];
      const ph = priceHistory[symbol];
      if (!ph || ph.length === 0) continue;
      
      // Find the most recent non-zero price up to this date
      const validPrices = ph.filter(p => p.close > 0 && dayjs(p.date).isSameOrBefore(dateStr));
      if (validPrices.length === 0) continue; // Skip if all prices are zero
      
      const price = validPrices[validPrices.length - 1].close; // Most recent non-zero price
      const valueInOwnCurrency = quantity * price;
      
      // Determine asset type and category
      let assetType = 'Stock'; // Default
      if (AR_SOVEREIGN_BONDS.includes(symbol)) {
        assetType = 'Bond';
      } else if (ASSET_CATEGORIES.crypto.includes(symbol)) {
        assetType = 'Crypto';
      }
      
      const category = getAssetCategory(symbol, assetType);
      
      // Convert to target currency if needed
      let valueInTargetCurrency = valueInOwnCurrency;
      if (posCurrency !== currency) {
        const exchangeRate = await getExchangeRate(posCurrency, currency);
        valueInTargetCurrency = valueInOwnCurrency * exchangeRate;
      }
      
      categoryValues[category] = (categoryValues[category] || 0) + valueInTargetCurrency;
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
      
      // Convert to target currency if needed
      let valueInTargetCurrency = value;
      if (deposit.currency !== currency) {
        const exchangeRate = await getExchangeRate(deposit.currency, currency);
        valueInTargetCurrency = value * exchangeRate;
      }
      
      categoryValues.deposits = (categoryValues.deposits || 0) + valueInTargetCurrency;
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
      
      // Convert to target currency if needed
      let valueInTargetCurrency = value;
      if (caucion.currency !== currency) {
        const exchangeRate = await getExchangeRate(caucion.currency, currency);
        valueInTargetCurrency = value * exchangeRate;
      }
      
      categoryValues.cauciones = (categoryValues.cauciones || 0) + valueInTargetCurrency;
    }
    
    // Matured Deposits (keep their final value until withdrawn)
    for (const deposit of maturedDeposits) {
      const startDate = dayjs(deposit.date).startOf('day');
      const maturityDate = dayjs(deposit.maturityDate).startOf('day');
      const days = maturityDate.diff(startDate, 'day');
      const dailyRate = deposit.annualRate / 100 / 365;
      const fullInterest = deposit.amount * dailyRate * days;
      const finalValue = deposit.amount + fullInterest;
      
      // Convert to target currency if needed
      let valueInTargetCurrency = finalValue;
      if (deposit.currency !== currency) {
        const exchangeRate = await getExchangeRate(deposit.currency, currency);
        valueInTargetCurrency = finalValue * exchangeRate;
      }
      
      categoryValues.deposits = (categoryValues.deposits || 0) + valueInTargetCurrency;
    }
    
    // Matured Cauciones (keep their final value until withdrawn)
    for (const caucion of maturedCauciones) {
      const startDate = dayjs(caucion.date).startOf('day');
      const maturityDate = dayjs(caucion.maturityDate).startOf('day');
      const days = maturityDate.diff(startDate, 'day');
      const dailyRate = caucion.annualRate / 100 / 365;
      const fullInterest = caucion.amount * dailyRate * days;
      const finalValue = caucion.amount + fullInterest;
      
      // Convert to target currency if needed
      let valueInTargetCurrency = finalValue;
      if (caucion.currency !== currency) {
        const exchangeRate = await getExchangeRate(caucion.currency, currency);
        valueInTargetCurrency = finalValue * exchangeRate;
      }
      
      categoryValues.cauciones = (categoryValues.cauciones || 0) + valueInTargetCurrency;
    }
    
    // Real Estate positions (from current positions, not transactions)
    // Note: This would need to be passed as a parameter or calculated differently
    // For now, we'll add a placeholder for real estate category
    if (!categoryValues.realEstate) {
      categoryValues.realEstate = 0;
    }
    
    // Calculate total value
    const totalValue = Object.values(categoryValues).reduce((sum, value) => sum + value, 0);
    
    // Only use last known value if we have no positions/deposits but still have a value
    // This prevents the value from dropping to 0 when we have active positions
    if (totalValue === 0 && lastKnownTotalValue > 0 && 
        Object.keys(positions).length === 0 && 
        activeDeposits.length === 0 && 
        maturedDeposits.length === 0 &&
        activeCauciones.length === 0 &&
        maturedCauciones.length === 0) {
      valueHistory.push({ 
        date: dateStr, 
        categories: { cash: lastKnownTotalValue },
        totalValue: lastKnownTotalValue
      });
    } else {
      valueHistory.push({ 
        date: dateStr, 
        categories: categoryValues,
        totalValue: totalValue
      });
      lastKnownTotalValue = totalValue;
    }
  }

  return valueHistory;
} 