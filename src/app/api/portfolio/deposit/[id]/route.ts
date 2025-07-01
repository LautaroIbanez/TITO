import { NextResponse } from 'next/server';
import { DepositTransaction } from '@/types';
import { getUserData, saveUserData } from '@/utils/userData';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const transactionId = params.id;
    const body = await request.json();
    const { username, amount, date, currency }: { username: string, amount: number, date: string, currency: 'ARS' | 'USD' } = body;

    if (!username || !transactionId || amount === undefined || !date || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (currency !== 'ARS' && currency !== 'USD') {
      return NextResponse.json({ error: 'Invalid currency specified' }, { status: 400 });
    }

    const userData = await getUserData(username);
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
    const oldCurrency = oldDeposit.currency as 'ARS' | 'USD';
    const newAmount = Number(amount);

    // Initialize cash object if it doesn't exist
    if (!userData.cash) userData.cash = { ARS: 0, USD: 0 };
    
    // Adjust cash balances
    if (oldCurrency !== currency) {
      // Currency has changed: reverse old deposit and apply new one
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const transactionId = params.id;
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username || !transactionId) {
      return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    const userData = await getUserData(username);
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
    const amountToDelete = depositToDelete.amount;
    const currency = depositToDelete.currency as 'ARS' | 'USD';

    if (!userData.cash || userData.cash[currency] === undefined) {
      // Initialize currency field if it doesn't exist
      if (!userData.cash) userData.cash = { ARS: 0, USD: 0 };
      userData.cash[currency] = 0;
    }
    
    if (userData.cash[currency] < amountToDelete) {
      return NextResponse.json({ error: 'Cannot delete deposit, insufficient available cash' }, { status: 400 });
    }
    
    userData.cash[currency] -= amountToDelete;
    userData.transactions.splice(txIndex, 1);

    await saveUserData(username, userData);
    return NextResponse.json({ message: 'Deposit deleted successfully', cash: userData.cash });
  } catch (error) {
    console.error('Failed to delete deposit:', error);
    return NextResponse.json({ error: 'Failed to delete deposit' }, { status: 500 });
  }
} 