import { promises as fs } from 'fs';
import path from 'path';
import { UserData, StockPosition, CryptoPosition } from '@/types';
import { Fundamentals, Technicals, PriceData } from '@/types/finance';
import { getBaseTicker, ensureBaSuffix } from './tickers';

async function readJsonSafe<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
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