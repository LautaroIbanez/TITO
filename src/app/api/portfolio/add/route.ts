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
    // Buy 1 share at current price
    let pos = user.positions.find((p) => p.symbol === symbol);
    if (pos) {
      const totalCost = pos.averagePrice * pos.quantity + price * 1;
      pos.quantity += 1;
      pos.averagePrice = totalCost / pos.quantity;
    } else {
      pos = { symbol, quantity: 1, averagePrice: price };
      user.positions.push(pos);
    }
    const tx: PortfolioTransaction = {
      date: new Date().toISOString(),
      type: 'Buy',
      symbol,
      quantity: 1,
      price,
    };
    user.transactions.push(tx);
    try {
      await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    } catch (err) {
      return NextResponse.json({ error: 'Failed to update portfolio' }, { status: 500 });
    }
    return NextResponse.json({ positions: user.positions, transactions: user.transactions });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 