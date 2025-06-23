import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, PortfolioTransaction, StockPosition, BondPosition } from '@/types';
import { DEFAULT_COMMISSION_PCT } from '@/utils/constants';

async function getUserData(username: string): Promise<UserData | null> {
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  try {
    const data = await fs.readFile(userFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveUserData(username: string, data: UserData) {
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  await fs.writeFile(userFile, JSON.stringify(data, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, assetType, quantity, price, currency }: {
      username: string,
      assetType: 'Stock' | 'Bond',
      quantity: number,
      price: number,
      currency: 'ARS' | 'USD'
    } = body;

    if (!username || !assetType || !quantity || !price || !currency) {
      return NextResponse.json({ error: 'Username, assetType, quantity, price, and currency are required' }, { status: 400 });
    }

    const user = await getUserData(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.positions) user.positions = [];
    if (!user.transactions) user.transactions = [];
    if (!user.cash) user.cash = { ARS: 0, USD: 0 };

    let proceeds = 0;
    const commissionPct = body.commissionPct ?? DEFAULT_COMMISSION_PCT;

    switch (assetType) {
      case 'Stock': {
        const { symbol } = body;
        if (!symbol) return NextResponse.json({ error: 'Symbol is required for stock sell' }, { status: 400 });

        const posIndex = user.positions.findIndex(p => p.type === 'Stock' && p.symbol === symbol && p.currency === currency);
        if (posIndex === -1) return NextResponse.json({ error: 'Position not found' }, { status: 404 });
        
        const pos = user.positions[posIndex] as StockPosition;
        if (pos.quantity < quantity) return NextResponse.json({ error: 'Insufficient quantity' }, { status: 400 });

        proceeds = quantity * price * (1 - commissionPct / 100);
        
        pos.quantity -= quantity;
        if (pos.quantity < 1e-6) { // Use a small epsilon for float comparison
          user.positions.splice(posIndex, 1);
        }

        const tx: PortfolioTransaction = {
          id: `txn_${Date.now()}`,
          date: new Date().toISOString(),
          type: 'Sell',
          assetType: 'Stock',
          symbol,
          quantity,
          price,
          currency,
          market: pos.market,
          commissionPct,
        };
        user.transactions.push(tx);
        break;
      }
      case 'Bond': {
        const { ticker } = body;
        if (!ticker) return NextResponse.json({ error: 'Ticker is required for bond sell' }, { status: 400 });

        const posIndex = user.positions.findIndex(p => p.type === 'Bond' && p.ticker === ticker && p.currency === currency);
        if (posIndex === -1) return NextResponse.json({ error: 'Position not found' }, { status: 404 });

        const pos = user.positions[posIndex] as BondPosition;
        if (pos.quantity < quantity) return NextResponse.json({ error: 'Insufficient quantity' }, { status: 400 });

        proceeds = quantity * price * (1 - commissionPct / 100);

        pos.quantity -= quantity;
        if (pos.quantity < 1e-6) {
          user.positions.splice(posIndex, 1);
        }

        const tx: PortfolioTransaction = {
          id: `txn_${Date.now()}`,
          date: new Date().toISOString(),
          type: 'Sell',
          assetType: 'Bond',
          ticker,
          quantity,
          price,
          currency,
          commissionPct
        };
        user.transactions.push(tx);
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid asset type for selling' }, { status: 400 });
    }

    user.cash[currency] += proceeds;
    await saveUserData(username, user);

    return NextResponse.json({
      positions: user.positions,
      transactions: user.transactions,
      cash: user.cash
    });

  } catch (err) {
    console.error('Error in sell route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 