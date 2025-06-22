import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, StockTradeTransaction, StockPosition } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { username, symbol, quantity, price } = await request.json();
    if (!username || !symbol || !quantity || !price) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    
    const totalProceeds = quantity * price;
    
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
    
    if (!Array.isArray(user.positions)) user.positions = [];
    if (!Array.isArray(user.transactions)) user.transactions = [];
    
    const pos = user.positions.find((p): p is StockPosition => 
      p.type === 'Stock' && p.symbol === symbol
    );
    
    if (!pos || pos.quantity < quantity) {
      return NextResponse.json({ error: 'Not enough shares' }, { status: 400 });
    }
    
    pos.quantity -= quantity;
    if (pos.quantity === 0) {
      user.positions = user.positions.filter(p => {
        if (p.type === 'Stock') return p.symbol !== symbol;
        return true;
      });
    }
    
    const tx: StockTradeTransaction = {
      id: `txn_${Date.now()}`,
      date: new Date().toISOString(),
      type: 'Sell',
      assetType: 'Stock',
      symbol,
      quantity,
      price,
    };
    user.transactions.push(tx);
    
    // Add the sale proceeds to available cash
    user.availableCash += totalProceeds;
    
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