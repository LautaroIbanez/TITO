import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, DepositTransaction } from '@/types';
import { saveUserData } from '@/utils/portfolioData';

async function readUserFile(username: string): Promise<UserData | null> {
    const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
    try {
        const data = await fs.readFile(userFile, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const transactionId = params.id;
    const { username, amount, date } = await request.json();
    if (!username || !transactionId || amount === undefined || !date) {
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

    const oldAmount = (oldTx as DepositTransaction).amount;
    const newAmount = Number(amount);
    userData.availableCash = (userData.availableCash || 0) - oldAmount + newAmount;
    
    userData.transactions[txIndex] = { ...oldTx, amount: newAmount, date };

    await saveUserData(username, userData);
    return NextResponse.json({ message: 'Deposit updated successfully' });
  } catch (error) {
    console.error('Failed to update deposit:', error);
    return NextResponse.json({ error: 'Failed to update deposit' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const transactionId = params.id;
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

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

    const amountToDelete = (txToDelete as DepositTransaction).amount;
    if (userData.availableCash < amountToDelete) {
      return NextResponse.json({ error: 'Cannot delete deposit, insufficient available cash' }, { status: 400 });
    }
    
    userData.availableCash -= amountToDelete;
    userData.transactions.splice(txIndex, 1);

    await saveUserData(username, userData);
    return NextResponse.json({ message: 'Deposit deleted successfully' });
  } catch (error) {
    console.error('Failed to delete deposit:', error);
    return NextResponse.json({ error: 'Failed to delete deposit' }, { status: 500 });
  }
} 