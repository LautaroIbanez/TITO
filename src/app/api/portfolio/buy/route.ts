import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, PortfolioPosition, PortfolioTransaction } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { username, symbol, quantity, price } = await request.json();
    if (!username || !symbol || !quantity || !price) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    
    const totalCost = quantity * price;
    
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
    
    // Check if user has enough cash
    if (user.availableCash < totalCost) {
      return NextResponse.json({ 
        error: 'Insufficient funds', 
        availableCash: user.availableCash,
        requiredAmount: totalCost
      }, { status: 400 });
    }
    
    if (!Array.isArray(user.positions)) user.positions = [];
    if (!Array.isArray(user.transactions)) user.transactions = [];
    
    let pos = user.positions.find((p) => p.symbol === symbol);
    if (pos) {
      // Weighted average price
      const totalCost = pos.averagePrice * pos.quantity + price * quantity;
      pos.quantity += quantity;
      pos.averagePrice = totalCost / pos.quantity;
    } else {
      pos = { symbol, quantity, averagePrice: price };
      user.positions.push(pos);
    }
    
    const tx: PortfolioTransaction = {
      date: new Date().toISOString(),
      type: 'Buy',
      symbol,
      quantity,
      price,
    };
    user.transactions.push(tx);
    
    // Deduct the purchase amount from available cash
    user.availableCash -= totalCost;
    
    try {
      await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    } catch (err) {
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
    return NextResponse.json({ 
      positions: user.positions, 
      transactions: user.transactions,
      availableCash: user.availableCash
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 