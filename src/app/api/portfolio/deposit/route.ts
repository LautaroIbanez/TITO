import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, DepositTransaction } from '@/types';
import { getPortfolioData, saveUserData } from '@/utils/portfolioData';

async function readUserFile(username: string): Promise<UserData | null> {
    const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
    try {
        const data = await fs.readFile(userFile, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

// Add a new deposit
export async function POST(request: Request) {
  try {
    const { username, amount, date, currency }: { username: string; amount: number; date: string; currency: 'ARS' | 'USD' } = await request.json();
    if (!username || !amount || !date || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userData = await readUserFile(username);
    if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!userData.cash) {
      userData.cash = { ARS: 0, USD: 0 };
    }
    if (!userData.transactions) {
      userData.transactions = [];
    }
    
    const newDeposit: DepositTransaction = {
      id: `dep_${new Date().getTime()}`,
      date: date,
      type: 'Deposit',
      amount: Number(amount),
      currency: currency,
    };

    userData.transactions.push(newDeposit);
    userData.cash[currency] = (userData.cash[currency] || 0) + Number(amount);

    await saveUserData(username, userData);

    return NextResponse.json({ message: 'Deposit added successfully', deposit: newDeposit, cash: userData.cash });
  } catch (error) {
    console.error('Failed to add deposit:', error);
    return NextResponse.json({ error: 'Failed to add deposit' }, { status: 500 });
  }
}

// Update an existing deposit
export async function PUT(request: Request) {
  try {
    const { username, transactionId, amount, date, currency }: { username: string; transactionId: string; amount: number; date: string; currency: 'ARS' | 'USD' } = await request.json();
    if (!username || !transactionId || !amount || !date || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userData = await readUserFile(username);
    if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const txIndex = userData.transactions.findIndex(tx => tx.id === transactionId);

    if (txIndex === -1) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    const oldTx = userData.transactions[txIndex];
    if (oldTx.type !== 'Deposit') {
        return NextResponse.json({ error: 'Transaction is not a deposit' }, { status: 400 });
    }
    
    const oldDeposit = oldTx as DepositTransaction;
    const oldAmount = oldDeposit.amount;
    const oldCurrency = oldDeposit.currency;
    const newAmount = Number(amount);

    // Adjust available cash
    if (oldCurrency !== currency) {
      // Currency has changed, so we need to adjust both balances
      userData.cash[oldCurrency] = (userData.cash[oldCurrency] || 0) - oldAmount;
      userData.cash[currency] = (userData.cash[currency] || 0) + newAmount;
    } else {
      // Currency is the same, just adjust the balance
      userData.cash[currency] = (userData.cash[currency] || 0) - oldAmount + newAmount;
    }
    
    // Update transaction
    userData.transactions[txIndex] = { ...oldTx, amount: newAmount, date, currency };

    await saveUserData(username, userData);

    return NextResponse.json({ message: 'Deposit updated successfully', cash: userData.cash });
  } catch (error) {
    console.error('Failed to update deposit:', error);
    return NextResponse.json({ error: 'Failed to update deposit' }, { status: 500 });
  }
}

// Delete a deposit
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const transactionId = searchParams.get('transactionId');

    if (!username || !transactionId) {
      return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    const userData = await readUserFile(username);
    if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const txIndex = userData.transactions.findIndex(tx => tx.id === transactionId);

    if (txIndex === -1) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const txToDelete = userData.transactions[txIndex];
    if (txToDelete.type !== 'Deposit') {
        return NextResponse.json({ error: 'Transaction is not a deposit' }, { status: 400 });
    }

    const depositToDelete = txToDelete as DepositTransaction;
    userData.cash[depositToDelete.currency] = (userData.cash[depositToDelete.currency] || 0) - depositToDelete.amount;
    userData.transactions.splice(txIndex, 1);

    await saveUserData(username, userData);

    return NextResponse.json({ message: 'Deposit deleted successfully', cash: userData.cash });
  } catch (error) {
    console.error('Failed to delete deposit:', error);
    return NextResponse.json({ error: 'Failed to delete deposit' }, { status: 500 });
  }
} 