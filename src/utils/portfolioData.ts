import { promises as fs } from 'fs';
import path from 'path';
import { UserData, StockPosition } from '@/types';

async function readJsonSafe(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function getPortfolioData(username: string) {
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  const user: UserData | null = await readJsonSafe(userFile);

  if (!user) {
    throw new Error('User not found');
  }

  // Initialize missing fields for safety
  if (typeof user.availableCash !== 'number') user.availableCash = 0;
  if (!user.positions) user.positions = [];
  if (!user.transactions) user.transactions = [];
  if (!user.goals) user.goals = [];

  const historicalPrices: Record<string, any[]> = {};
  const fundamentals: Record<string, any> = {};
  const technicals: Record<string, any> = {};

  const stockSymbols = user.positions
    .filter((pos): pos is StockPosition => pos.type === 'Stock')
    .map((pos) => pos.symbol);

  await Promise.all(
    stockSymbols.map(async (symbol) => {
      historicalPrices[symbol] = await readJsonSafe(path.join(process.cwd(), 'data', 'stocks', `${symbol}.json`)) || [];
      fundamentals[symbol] = await readJsonSafe(path.join(process.cwd(), 'data', 'fundamentals', `${symbol}.json`)) || null;
      technicals[symbol] = await readJsonSafe(path.join(process.cwd(), 'data', 'technicals', `${symbol}.json`)) || null;
    })
  );

  return {
    positions: user.positions,
    transactions: user.transactions,
    historicalPrices,
    fundamentals,
    technicals,
    profile: user.profile,
    availableCash: user.availableCash,
    goals: user.goals,
  };
} 