import dayjs from 'dayjs';
import { PortfolioTransaction, FixedTermDepositCreationTransaction, CaucionCreationTransaction } from '@/types';
import { PriceData } from '@/types/finance';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { getExchangeRate, convertCurrencySync } from './currency';
import { detectDuplicates, filterDuplicates } from './duplicateDetection';
import { hasAssetType, isTradeTransaction, isCreationTransaction, getTransactionIdentifier } from './typeGuards';
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
  bondFallback?: boolean; // Whether to use bonds.json as a fallback for bonds with no price history
  initialCash?: { ARS: number; USD: number }; // Initial cash balances before processing transactions
}

// Bond prices cache with timestamp
let bondPricesCache: Array<{ ticker: string; price: number; currency: string }> = [];
let bondPricesCacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadBondPrices(): Promise<Array<{ ticker: string; price: number; currency: string }>> {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (bondPricesCache.length > 0 && (now - bondPricesCacheTimestamp) < CACHE_DURATION) {
    return bondPricesCache;
  }
  
  try {
    if (typeof window !== 'undefined') {
      // Client environment: fetch from API
      const response = await fetch('/api/bonds');
      if (!response.ok) {
        throw new Error('Failed to fetch bonds from API');
      }
      const bondsData = await response.json();
      
      // Handle both old format (array) and new format (object with bonds array)
      const bonds = bondsData.bonds || bondsData;
      
      // Transform to the expected format
      const transformedBonds = bonds.map((bond: any) => ({
        ticker: bond.ticker,
        price: bond.price ?? 0,
        currency: bond.currency
      }));
      
      // Update cache
      bondPricesCache = transformedBonds;
      bondPricesCacheTimestamp = now;
      
      return transformedBonds;
    } else {
      // Server environment: read from file system
      const fs = await import('fs');
      const path = await import('path');
      const bondsPath = path.default.join(process.cwd(), 'data', 'bonds.json');
      const fileContents = await fs.promises.readFile(bondsPath, 'utf8');
      const bondsData = JSON.parse(fileContents);
      
      // Handle both old format (array) and new format (object with bonds array)
      const bonds = bondsData.bonds || bondsData;
      
      // Transform to the expected format
      const transformedBonds = bonds.map((bond: any) => ({
        ticker: bond.ticker,
        price: bond.price ?? 0,
        currency: bond.currency
      }));
      
      // Update cache
      bondPricesCache = transformedBonds;
      bondPricesCacheTimestamp = now;
      
      return transformedBonds;
    }
  } catch (error) {
    console.error('Failed to load bond prices:', error);
    return [];
  }
}

export async function getBondPriceFromJson(ticker: string, currency: string): Promise<number | undefined> {
  const bonds = await loadBondPrices();
  const bond = bonds.find(b => b.ticker === ticker && b.currency === currency);
  return bond?.price;
}

// Synchronous version for use in calculateCurrentValueByCurrency
export function getBondPriceFromCache(ticker: string, currency: string): number | undefined {
  // Use the cached bond prices if available
  if (bondPricesCache.length > 0) {
    const bond = bondPricesCache.find(b => b.ticker === ticker && b.currency === currency);
    return bond?.price;
  }
  
  // If cache is empty, try to load synchronously from bonds.json
  return loadBondPricesSync(ticker, currency);
}

// Synchronous loader for bond prices from bonds.json
function loadBondPricesSync(ticker: string, currency: string): number | undefined {
  try {
    if (typeof window !== 'undefined') {
      // Client environment: can't load synchronously, return undefined
      return undefined;
    } else {
      // Server environment: read from file system synchronously
      const fs = require('fs');
      const path = require('path');
      const bondsPath = path.join(process.cwd(), 'data', 'bonds.json');
      
      if (!fs.existsSync(bondsPath)) {
        return undefined;
      }
      
      const fileContents = fs.readFileSync(bondsPath, 'utf8');
      const bondsData = JSON.parse(fileContents);
      
      // Handle both old format (array) and new format (object with bonds array)
      const bonds = bondsData.bonds || bondsData;
      
      // Find the specific bond
      const bond = bonds.find((b: any) => b.ticker === ticker && b.currency === currency);
      
      if (bond && typeof bond.price === 'number') {
        // Update cache with this bond
        const existingIndex = bondPricesCache.findIndex(b => b.ticker === ticker && b.currency === currency);
        if (existingIndex >= 0) {
          bondPricesCache[existingIndex] = { ticker, price: bond.price, currency };
        } else {
          bondPricesCache.push({ ticker, price: bond.price, currency });
        }
        bondPricesCacheTimestamp = Date.now();
        
        return bond.price;
      }
      
      return undefined;
    }
  } catch (error) {
    console.error('Failed to load bond price synchronously:', error);
    return undefined;
  }
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
  let cashARS = options.initialCash?.ARS || 0;
  let cashUSD = options.initialCash?.USD || 0;
  
  // Build a set of bond tickers from transactions for this portfolio
  const bondTickers = new Set<string>();
  for (const tx of txs) {
    if (hasAssetType(tx) && tx.assetType === 'Bond' && 'ticker' in tx) {
      bondTickers.add(tx.ticker);
    }
  }

  for (const tx of txs) {
    const txDate = dayjs(tx.date).startOf('day');
    if (txDate.isSameOrBefore(startDate)) {
      if (isTradeTransaction(tx)) {
        const identifier = getTransactionIdentifier(tx);
        
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
      } else if (tx.type === 'Create' && 'assetType' in tx && tx.assetType === 'FixedTermDeposit') {
        activeDeposits.push(tx as ActiveFixedTermDeposit);
        // Reduce cash by the deposit amount
        if (tx.currency === 'ARS') {
          cashARS -= tx.amount;
        } else {
          cashUSD -= tx.amount;
        }
      } else if (tx.type === 'Create' && 'assetType' in tx && tx.assetType === 'Caucion') {
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
      } else if (tx.type === 'Acreditación Plazo Fijo' || tx.type === 'Acreditación Caución') {
        // Cash inflows from matured fixed income instruments
        if (tx.currency === 'ARS') {
          cashARS += tx.amount;
        } else {
          cashUSD += tx.amount;
        }
        // Remove the matching matured deposit/caucion after credit
        if (tx.type === 'Acreditación Plazo Fijo' && 'depositId' in tx) {
          const idx = maturedDeposits.findIndex(d => d.id === tx.depositId);
          if (idx !== -1) maturedDeposits.splice(idx, 1);
        }
        if (tx.type === 'Acreditación Caución' && 'caucionId' in tx) {
          const idx = maturedCauciones.findIndex(c => c.id === tx.caucionId);
          if (idx !== -1) maturedCauciones.splice(idx, 1);
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
      if (isTradeTransaction(tx)) {
        const identifier = getTransactionIdentifier(tx);
        
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
      } else if (tx.type === 'Create' && 'assetType' in tx && tx.assetType === 'FixedTermDeposit') {
        activeDeposits.push(tx as ActiveFixedTermDeposit);
        // Reduce cash by the deposit amount
        if (tx.currency === 'ARS') {
          cashARS -= tx.amount;
        } else {
          cashUSD -= tx.amount;
        }
      } else if (tx.type === 'Create' && 'assetType' in tx && tx.assetType === 'Caucion') {
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
      } else if (tx.type === 'Acreditación Plazo Fijo' || tx.type === 'Acreditación Caución') {
        // Cash inflows from matured fixed income instruments
        if (tx.currency === 'ARS') {
          cashARS += tx.amount;
        } else {
          cashUSD += tx.amount;
        }
        // Remove the matching matured deposit/caucion after credit
        if (tx.type === 'Acreditación Plazo Fijo' && 'depositId' in tx) {
          const idx = maturedDeposits.findIndex(d => d.id === tx.depositId);
          if (idx !== -1) maturedDeposits.splice(idx, 1);
        }
        if (tx.type === 'Acreditación Caución' && 'caucionId' in tx) {
          const idx = maturedCauciones.findIndex(c => c.id === tx.caucionId);
          if (idx !== -1) maturedCauciones.splice(idx, 1);
        }
      }
    }

    let dailyValueARS = cashARS; // Start with cash balance
    let dailyValueUSD = cashUSD; // Start with cash balance

    // Stocks and Bonds
    for (const key of Object.keys(positions)) {
      const [identifier, currency] = key.split('_');
      const pos = positions[key];
      if (!pos || pos.quantity <= 0) continue; // Only value open positions
      let currentPrice: number | undefined = undefined;
      const prices = priceHistory[identifier];
      if (prices && prices.length > 0) {
        // Buscar el precio más reciente no-cero hasta e incluyendo la fecha actual
        const validPrices = prices.filter(p => p.close > 0 && p.date <= dateStr);
        if (validPrices.length > 0) {
          // Tomar el más reciente
          currentPrice = validPrices[validPrices.length - 1].close;
        }
      }
      // Fallback: solo para bonos, solo si no hay precio válido, solo si la posición está abierta
      if (bondTickers.has(identifier) && currentPrice === undefined && options && options.bondFallback && pos.quantity > 0) {
        currentPrice = await getBondPriceFromJson(identifier, currency);
      }
      if (currentPrice !== undefined) {
        const positionValue = pos.quantity * currentPrice;
        if (currency === 'ARS') {
          dailyValueARS += positionValue;
        } else if (currency === 'USD') {
          // For USD bonds, convert to ARS before adding to ARS total
          if (bondTickers.has(identifier)) {
            const exchangeRate = await getExchangeRate('USD', 'ARS');
            dailyValueARS += positionValue * exchangeRate;
          } else {
            // For USD stocks/crypto, keep in USD
            dailyValueUSD += positionValue;
          }
        }
      }
      // If no valid price found, skip this asset (treat as "price not available")
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
 * USD bonds are converted to ARS before adding to ARS total.
 * @param positions Portfolio positions
 * @param cash { ARS: number, USD: number }
 * @param priceHistory Price data for stocks/bonds/crypto
 * @returns { ARS: number, USD: number, duplicates?: DuplicateDetectionResult }
 */
export function calculateCurrentValueByCurrency(
  positions: any[],
  cash: { ARS: number; USD: number },
  priceHistory: Record<string, PriceData[]>,
  bondPrices?: Record<string, number>
): { ARS: number; USD: number; duplicates?: any } {
  // Detect duplicates first
  const duplicateResult = detectDuplicates(positions);
  
  // Filter out duplicates for calculation to avoid double counting
  const filteredPositions = duplicateResult.hasDuplicates ? filterDuplicates(positions) : positions;
  
  let valueARS = cash.ARS || 0;
  let valueUSD = cash.USD || 0;

  const today = new Date();

  for (const pos of filteredPositions) {
    if (pos.type === 'Stock' || pos.type === 'Bond') {
      const symbol = pos.type === 'Stock' ? pos.symbol : pos.ticker;
      const prices = priceHistory[symbol];
      let currentPrice: number | undefined = undefined;
      if (prices && prices.length > 0) {
        // Find the most recent non-zero price
        const recentPrices = prices.slice().reverse().slice(0, 10); // Check last 10 prices
        const validPriceEntry = recentPrices.find(p => p.close > 0);
        if (validPriceEntry) {
          currentPrice = validPriceEntry.close;
        }
      }
      // For bonds, prioritize bondPrices, then price history, then bonds.json cache
      if (pos.type === 'Bond' && currentPrice === undefined) {
        if (bondPrices && bondPrices[pos.ticker]) {
          currentPrice = bondPrices[pos.ticker];
        } else {
          currentPrice = getBondPriceFromCache(pos.ticker, pos.currency);
        }
      }
      if (currentPrice !== undefined) {
        const positionValue = pos.quantity * currentPrice;
        if (pos.currency === 'ARS') {
          valueARS += positionValue;
        } else if (pos.currency === 'USD') {
          // For USD bonds, convert to ARS before adding to ARS total
          if (pos.type === 'Bond') {
            const convertedValue = convertCurrencySync(positionValue, 'USD', 'ARS');
            valueARS += convertedValue;
          } else {
            // For USD stocks, keep in USD
            valueUSD += positionValue;
          }
        }
      }
      // If no valid price found, skip this asset (treat as "price not available")
    } else if (pos.type === 'Crypto') {
      const prices = priceHistory[pos.symbol];
      if (prices && prices.length > 0) {
        // Find the most recent non-zero price
        const recentPrices = prices.slice().reverse().slice(0, 10); // Check last 10 prices
        const validPriceEntry = recentPrices.find(p => p.close > 0);
        
        if (validPriceEntry) {
          const currentPrice = validPriceEntry.close;
          // Crypto is always valued in USD
          valueUSD += pos.quantity * currentPrice;
        }
        // If no valid price found, skip this asset (treat as "price not available")
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
    } else if (pos.type === 'RealEstate') {
      // Real estate value is the amount plus any appreciation based on annual rate
      // For simplicity, we'll use the amount as the base value
      // In a real implementation, you might want to track purchase date and calculate appreciation
      let value = pos.amount;
      
      // Optional: Calculate appreciation if you have purchase date
      // const purchaseDate = new Date(pos.purchaseDate);
      // const daysSincePurchase = Math.round((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
      // const dailyRate = pos.annualRate / 100 / 365;
      // const appreciation = pos.amount * dailyRate * daysSincePurchase;
      // value += appreciation;
      
      if (pos.currency === 'ARS') {
        valueARS += value;
      } else if (pos.currency === 'USD') {
        valueUSD += value;
      }
    }
  }
  
  const result: { ARS: number; USD: number; duplicates?: any } = { ARS: valueARS, USD: valueUSD };
  
  // Include duplicate information if duplicates were found
  if (duplicateResult.hasDuplicates) {
    result.duplicates = duplicateResult;
  }
  
  return result;
} 