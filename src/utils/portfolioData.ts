import { promises as fs } from 'fs';
import path from 'path';

export async function getPortfolioData(username: string) {
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  let user;
  try {
    const data = await fs.readFile(userFile, 'utf-8');
    user = JSON.parse(data);
  } catch {
    return [];
  }
  const portfolio = Array.isArray(user.portfolio) ? user.portfolio : [];
  const results = await Promise.all(
    portfolio.map(async (symbol: string) => {
      const [prices, fundamentals, technicals] = await Promise.all([
        readJsonSafe(path.join(process.cwd(), 'data', 'stocks', `${symbol}.json`)),
        readJsonSafe(path.join(process.cwd(), 'data', 'fundamentals', `${symbol}.json`)),
        readJsonSafe(path.join(process.cwd(), 'data', 'technicals', `${symbol}.json`)),
      ]);
      return { symbol, prices, fundamentals, technicals };
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