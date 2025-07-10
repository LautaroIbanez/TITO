import { promises as fs } from 'fs';
import path from 'path';
import { UserData, StockPosition, CryptoPosition, FixedTermDepositPosition, CaucionPosition, FixedTermDepositCreditTransaction, CaucionCreditTransaction, BondCouponTransaction, BondAmortizationTransaction } from '@/types';
import { Fundamentals, Technicals, PriceData } from '@/types/finance';
import { getBaseTicker, ensureBaSuffix } from './tickers';
import dayjs from 'dayjs';

async function readJsonSafe<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

// Migration function to standardize field names
function migratePositionFields(user: UserData): boolean {
  let changed = false;
  
  user.positions.forEach(pos => {
    // Migrate averagePrice to purchasePrice for all position types that should have it
    if (pos.type === 'Stock' || pos.type === 'Bond' || pos.type === 'Crypto') {
      const typedPos = pos as StockPosition | CryptoPosition | { ticker: string; quantity: number; purchasePrice?: number; averagePrice?: number; currency: string };
      
      if ('averagePrice' in typedPos && typeof typedPos.averagePrice === 'number' && Number.isFinite(typedPos.averagePrice)) {
        if (!('purchasePrice' in typedPos) || !Number.isFinite(typedPos.purchasePrice)) {
          (pos as any).purchasePrice = typedPos.averagePrice;
          delete (pos as any).averagePrice;
          changed = true;
        }
      }
    }
  });
  
  return changed;
}

async function applyMaturityCredits(user: UserData) {
  let changed = false;
  const now = dayjs();
  const positionsToRemove: string[] = [];
  
  // Fixed-term deposits
  for (const pos of user.positions) {
    if (pos.type === 'FixedTermDeposit') {
      const matured = dayjs(pos.maturityDate).isBefore(now);
      const alreadyCredited = user.transactions.some(
        t => t.type === 'Acreditación Plazo Fijo' && (t as FixedTermDepositCreditTransaction).depositId === pos.id
      );
      if (matured && !alreadyCredited) {
        const principal = pos.amount;
        const interest = principal * (pos.annualRate / 100) * (dayjs(pos.maturityDate).diff(dayjs(pos.startDate), 'day') / 365);
        const payout = principal + interest;
        const tx: FixedTermDepositCreditTransaction = {
          id: `ftd-credit-${pos.id}`,
          date: pos.maturityDate,
          type: 'Acreditación Plazo Fijo',
          assetType: 'FixedTermDeposit',
          provider: pos.provider,
          amount: payout,
          principal,
          interest,
          currency: pos.currency,
          depositId: pos.id,
        };
        user.transactions.push(tx);
        user.cash[pos.currency as 'ARS' | 'USD'] += payout;
        positionsToRemove.push(pos.id);
        changed = true;
      } else if (matured && alreadyCredited) {
        // Position is matured and already credited, remove it
        positionsToRemove.push(pos.id);
      }
    }
    if (pos.type === 'Caucion') {
      const matured = dayjs(pos.maturityDate).isBefore(now);
      const alreadyCredited = user.transactions.some(
        t => t.type === 'Acreditación Caución' && (t as CaucionCreditTransaction).caucionId === pos.id
      );
      if (matured && !alreadyCredited) {
        const principal = pos.amount;
        const interest = principal * (pos.annualRate / 100) * (pos.term / 365);
        const payout = principal + interest;
        const tx: CaucionCreditTransaction = {
          id: `caucion-credit-${pos.id}`,
          date: pos.maturityDate,
          type: 'Acreditación Caución',
          assetType: 'Caucion',
          provider: pos.provider,
          amount: payout,
          principal,
          interest,
          currency: pos.currency,
          caucionId: pos.id,
        };
        user.transactions.push(tx);
        user.cash[pos.currency as 'ARS' | 'USD'] += payout;
        positionsToRemove.push(pos.id);
        changed = true;
      } else if (matured && alreadyCredited) {
        // Position is matured and already credited, remove it
        positionsToRemove.push(pos.id);
      }
    }
  }
  
  // Remove matured positions
  if (positionsToRemove.length > 0) {
    user.positions = user.positions.filter(pos => {
      // Only FixedTermDeposit and Caucion positions have id property
      if (pos.type === 'FixedTermDeposit' || pos.type === 'Caucion') {
        return !positionsToRemove.includes((pos as FixedTermDepositPosition | CaucionPosition).id);
      }
      return true; // Keep other position types
    });
  }
  // Bond coupon/amortization events
  const bondPaymentsPath = path.join(process.cwd(), 'data', 'bondPayments.json');
  let bondPayments = [];
  try {
    bondPayments = JSON.parse(await fs.readFile(bondPaymentsPath, 'utf-8'));
  } catch {}
  for (const payment of bondPayments) {
    const { ticker, date, type, amount, currency, number } = payment;
    const alreadyCredited = user.transactions.some(
      t => t.type === type && (t as BondCouponTransaction | BondAmortizationTransaction).ticker === ticker && t.date === date
    );
    if (!alreadyCredited) {
      if (type === 'Pago de Cupón Bono') {
        const tx: BondCouponTransaction = {
          id: `bond-coupon-${ticker}-${date}`,
          date,
          type,
          assetType: 'Bond',
          ticker,
          amount,
          currency,
          couponNumber: number,
        };
        user.transactions.push(tx);
        user.cash[currency as 'ARS' | 'USD'] += amount;
        changed = true;
      } else if (type === 'Amortización Bono') {
        const tx: BondAmortizationTransaction = {
          id: `bond-amort-${ticker}-${date}`,
          date,
          type,
          assetType: 'Bond',
          ticker,
          amount,
          currency,
          amortizationNumber: number,
        };
        user.transactions.push(tx);
        user.cash[currency as 'ARS' | 'USD'] += amount;
        changed = true;
      }
    }
  }
  return changed;
}

export async function getPortfolioData(username: string) {
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  const user: UserData | null = await readJsonSafe<UserData>(userFile);

  if (!user) {
    throw new Error('User not found');
  }

  // --- Start Migration Logic ---
  // If the old `availableCash` property exists, migrate it to the new `cash` object.
  // We assume the legacy currency was ARS.
  if (typeof (user as any).availableCash === 'number') {
    user.cash = {
      ARS: (user as any).availableCash,
      USD: 0, // Assume no USD balance for old accounts
    };
    delete (user as any).availableCash;
  }
  
  // Migrate position field names (averagePrice -> purchasePrice)
  const positionFieldsChanged = migratePositionFields(user);
  // --- End Migration Logic ---

  // Initialize missing fields for safety
  if (!user.cash) user.cash = { ARS: 0, USD: 0 };
  if (!user.positions) user.positions = [];
  if (!user.transactions) user.transactions = [];
  if (!user.goals) user.goals = [];

  const historicalPrices: Record<string, PriceData[]> = {};
  const fundamentals: Record<string, Fundamentals | null> = {};
  const technicals: Record<string, Technicals | null> = {};

  const stockSymbols = user.positions
    .filter((pos): pos is StockPosition => pos.type === 'Stock')
    .map((pos) => {
      let symbol = getBaseTicker(pos.symbol);
      if (pos.market === 'BCBA') symbol = ensureBaSuffix(symbol);
      return symbol;
    });

  const cryptoSymbols = user.positions
    .filter((pos): pos is CryptoPosition => pos.type === 'Crypto')
    .map((pos) => pos.symbol);

  // Build a map of base tickers to avoid duplicate fundamentals reads
  const baseTickerMap = new Map<string, string[]>();
  stockSymbols.forEach(symbol => {
    const baseTicker = getBaseTicker(symbol);
    if (!baseTickerMap.has(baseTicker)) {
      baseTickerMap.set(baseTicker, []);
    }
    baseTickerMap.get(baseTicker)!.push(symbol);
  });

  // Load fundamentals once per base ticker
  const fundamentalsCache = new Map<string, Fundamentals | null>();
  await Promise.all(
    Array.from(baseTickerMap.keys()).map(async (baseTicker) => {
      const fund = await readJsonSafe<Fundamentals>(path.join(process.cwd(), 'data', 'fundamentals', `${baseTicker}.json`));
      fundamentalsCache.set(baseTicker, fund);
    })
  );

  await Promise.all([
    // Load stock data with optimized fundamentals
    ...stockSymbols.map(async (symbol, idx) => {
      const baseTicker = getBaseTicker(symbol);
      historicalPrices[symbol] = await readJsonSafe<PriceData[]>(path.join(process.cwd(), 'data', 'stocks', `${symbol}.json`)) || [];
      fundamentals[symbol] = fundamentalsCache.get(baseTicker) || null;
      technicals[symbol] = await readJsonSafe<Technicals>(path.join(process.cwd(), 'data', 'technicals', `${symbol}.json`)) || null;
    }),
    // Load crypto data
    ...cryptoSymbols.map(async (symbol) => {
      historicalPrices[symbol] = await readJsonSafe<PriceData[]>(path.join(process.cwd(), 'data', 'crypto', `${symbol}.json`)) || [];
      fundamentals[symbol] = await readJsonSafe<Fundamentals>(path.join(process.cwd(), 'data', 'fundamentals', `${symbol}.json`)) || null;
      technicals[symbol] = await readJsonSafe<Technicals>(path.join(process.cwd(), 'data', 'crypto-technicals', `${symbol}.json`)) || null;
    })
  ]);

  const changed = await applyMaturityCredits(user);
  if (changed || positionFieldsChanged) {
    await saveUserData(username, user);
  }

  return {
    positions: user.positions,
    transactions: user.transactions,
    historicalPrices,
    fundamentals,
    technicals,
    profile: user.profile,
    cash: user.cash,
    goals: user.goals,
  };
}

export async function saveUserData(username: string, data: UserData): Promise<void> {
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  try {
    await fs.writeFile(userFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Failed to save data for user ${username}:`, error);
    throw new Error('Failed to save user data');
  }
} 