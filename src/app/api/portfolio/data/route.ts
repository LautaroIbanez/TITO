import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData } from '@/types';

async function readJsonSafe(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  let user: UserData;
  try {
    const data = await fs.readFile(userFile, 'utf-8');
    user = JSON.parse(data);
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  // Initialize availableCash if it doesn't exist (for backward compatibility)
  if (typeof user.availableCash !== 'number') {
    user.availableCash = 0;
  }
  
  const positions = user.positions || [];
  const transactions = user.transactions || [];
  const historicalPrices: Record<string, any[]> = {};
  const fundamentals: Record<string, any> = {};
  const technicals: Record<string, any> = {};
  await Promise.all(
    positions.map(async (pos) => {
      historicalPrices[pos.symbol] =
        (await readJsonSafe(path.join(process.cwd(), 'data', 'stocks', `${pos.symbol}.json`))) || [];
      fundamentals[pos.symbol] =
        (await readJsonSafe(path.join(process.cwd(), 'data', 'fundamentals', `${pos.symbol}.json`))) || null;
      technicals[pos.symbol] =
        (await readJsonSafe(path.join(process.cwd(), 'data', 'technicals', `${pos.symbol}.json`))) || null;
    })
  );
  return NextResponse.json({ 
    positions, 
    transactions, 
    historicalPrices, 
    fundamentals, 
    technicals, 
    profile: user.profile,
    availableCash: user.availableCash
  });
} 