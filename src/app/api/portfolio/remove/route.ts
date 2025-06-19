import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, PortfolioTransaction } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { username, symbol } = await request.json();
    if (!username || !symbol) {
      return NextResponse.json({ error: 'Username and symbol required' }, { status: 400 });
    }
    const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
    let user: UserData;
    try {
      const data = await fs.readFile(userFile, 'utf-8');
      user = JSON.parse(data);
    } catch {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!Array.isArray(user.positions)) user.positions = [];
    if (!Array.isArray(user.transactions)) user.transactions = [];
    let pos = user.positions.find((p) => p.symbol === symbol);
    if (!pos) {
      return NextResponse.json({ error: 'Position not found' }, { status: 400 });
    }
    // Get current price from local data
    const stockFile = path.join(process.cwd(), 'data', 'stocks', `${symbol}.json`);
    let price = 0;
    try {
      const stockData = JSON.parse(await fs.readFile(stockFile, 'utf-8'));
      price = stockData[stockData.length - 1]?.close || 0;
    } catch {}
    if (!price) {
      return NextResponse.json({ error: 'No price data for symbol' }, { status: 400 });
    }
    // Sell all shares at current price
    const tx: PortfolioTransaction = {
      date: new Date().toISOString(),
      type: 'Sell',
      symbol,
      quantity: pos.quantity,
      price,
    };
    user.transactions.push(tx);
    user.positions = user.positions.filter((p) => p.symbol !== symbol);
    try {
      await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    } catch (err) {
      console.error('Error writing user file:', err);
      return NextResponse.json({ error: 'Failed to update portfolio' }, { status: 500 });
    }
    return NextResponse.json({ positions: user.positions, transactions: user.transactions });
  } catch (err) {
    console.error('Portfolio remove error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 