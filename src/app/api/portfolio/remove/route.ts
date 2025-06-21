import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, StockPosition, BondPosition, PortfolioTransaction, StockTradeTransaction, BondTradeTransaction } from '@/types';

async function readJsonSafe(filePath: string): Promise<any | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, assetType, identifier } = await request.json();
    if (!username || !assetType || !identifier) {
      return NextResponse.json({ error: 'Username, assetType, and identifier required' }, { status: 400 });
    }

    const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
    const user: UserData | null = await readJsonSafe(userFile);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.positions = user.positions || [];
    user.transactions = user.transactions || [];
    user.availableCash = user.availableCash || 0;

    let positionIndex = -1;

    if (assetType === 'Stock') {
      positionIndex = user.positions.findIndex((p) => p.type === 'Stock' && p.symbol === identifier);
    } else if (assetType === 'Bond') {
      positionIndex = user.positions.findIndex((p) => p.type === 'Bond' && p.ticker === identifier);
    } else if (assetType === 'FixedTermDeposit') {
      positionIndex = user.positions.findIndex((p) => p.type === 'FixedTermDeposit' && p.id === identifier);
    }

    if (positionIndex === -1) {
      return NextResponse.json({ error: 'Position not found' }, { status: 400 });
    }

    const position = user.positions[positionIndex];

    if (position.type === 'Stock') {
      const stockData = await readJsonSafe(path.join(process.cwd(), 'data', 'stocks', `${position.symbol}.json`));
      const price = stockData?.[stockData.length - 1]?.close || 0;
      if (!price) {
        return NextResponse.json({ error: `No price data for symbol ${position.symbol}` }, { status: 400 });
      }
      const totalProceeds = position.quantity * price;
      user.availableCash += totalProceeds;
      const tx: StockTradeTransaction = { id: Date.now().toString(), date: new Date().toISOString(), type: 'Sell', assetType: 'Stock', symbol: position.symbol, quantity: position.quantity, price };
      user.transactions.push(tx);
    } else if (position.type === 'Bond') {
      const price = position.averagePrice; // Assume sale at average price for simplicity
      const totalProceeds = position.quantity * price;
      user.availableCash += totalProceeds;
      const tx: BondTradeTransaction = { id: Date.now().toString(), date: new Date().toISOString(), type: 'Sell', assetType: 'Bond', ticker: position.ticker, quantity: position.quantity, price };
      user.transactions.push(tx);
    } else if (position.type === 'FixedTermDeposit') {
      // For fixed-term deposits, we assume the principal + interest were already handled
      // and this is just removing the matured position from the portfolio view.
    }

    // Remove the position from the array
    user.positions.splice(positionIndex, 1);

    await fs.writeFile(userFile, JSON.stringify(user, null, 2));

    return NextResponse.json({
      positions: user.positions,
      transactions: user.transactions,
      availableCash: user.availableCash,
    });
  } catch (err) {
    console.error('Portfolio remove error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 