import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, DepositTransaction } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { username, amount } = await request.json();
    
    if (!username || !amount) {
      return NextResponse.json({ error: 'Username and amount required' }, { status: 400 });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
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
    
    if (!user.transactions) {
        user.transactions = [];
    }

    // Add the deposit amount
    user.availableCash += amount;
    
    const newTransaction: DepositTransaction = {
        id: Date.now().toString(),
        type: 'Deposit',
        date: new Date().toISOString(),
        amount,
    };
    
    user.transactions.push(newTransaction);

    try {
      await fs.writeFile(userFile, JSON.stringify(user, null, 2));
    } catch (err) {
      console.error('Error writing user file:', err);
      return NextResponse.json({ error: 'Failed to update user data' }, { status: 500 });
    }

    return NextResponse.json({ 
      availableCash: user.availableCash,
      message: `Successfully deposited $${amount.toFixed(2)}`
    });
  } catch (err) {
    console.error('Deposit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 