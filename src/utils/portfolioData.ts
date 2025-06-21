import { promises as fs } from 'fs';
import path from 'path';
import { PortfolioPosition } from '@/types';

export async function getPortfolioData(username: string) {
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  let user;
  try {
    const data = await fs.readFile(userFile, 'utf-8');
    user = JSON.parse(data);
  } catch {
    return [];
  }
  const positions = Array.isArray(user.positions) ? user.positions : [];
  const results = await Promise.all(
    positions.map(async (position: PortfolioPosition) => {
      const [prices, fundamentals, technicals] = await Promise.all([
        readJsonSafe(path.join(process.cwd(), 'data', 'stocks', `${position.symbol}.json`)),
        readJsonSafe(path.join(process.cwd(), 'data', 'fundamentals', `${position.symbol}.json`)),
        readJsonSafe(path.join(process.cwd(), 'data', 'technicals', `${position.symbol}.json`)),
      ]);
      return { 
        symbol: position.symbol, 
        quantity: position.quantity,
        averagePrice: position.averagePrice,
        prices, 
        fundamentals, 
        technicals 
      };
    })
  );
  return results;
}

async function readJsonSafe(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
} 