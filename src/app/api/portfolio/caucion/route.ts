import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, CaucionCreationTransaction, CaucionPosition } from '@/types';
import { getPortfolioData, saveUserData } from '@/utils/portfolioData';
import dayjs from 'dayjs';

async function readUserFile(username: string): Promise<UserData | null> {
    const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
    try {
        const data = await fs.readFile(userFile, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

// Create a new caución
export async function POST(request: Request) {
  try {
    const { 
      username, 
      amount, 
      annualRate, 
      termDays, 
      provider, 
      currency 
    }: { 
      username: string; 
      amount: number; 
      annualRate: number; 
      termDays: number; 
      provider: string; 
      currency: 'ARS' | 'USD'; 
    } = await request.json();

    if (!username || !amount || !annualRate || !termDays || !provider || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userData = await readUserFile(username);
    if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has enough cash
    if (!userData.cash) {
      userData.cash = { ARS: 0, USD: 0 };
    }
    
    if (userData.cash[currency] < amount) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    if (!userData.transactions) {
      userData.transactions = [];
    }
    if (!userData.positions) {
      userData.positions = [];
    }

    const startDate = new Date().toISOString();
    const maturityDate = dayjs().add(termDays, 'day').toISOString();
    const caucionId = `caucion_${new Date().getTime()}`;

    // Create transaction record
    const newTransaction: CaucionCreationTransaction = {
      id: `caucion_tx_${new Date().getTime()}`,
      date: startDate,
      type: 'Create',
      assetType: 'Caucion',
      provider,
      amount: Number(amount),
      annualRate: Number(annualRate),
      termDays: Number(termDays),
      maturityDate,
      currency,
    };

    // Create position
    const newPosition: CaucionPosition = {
      type: 'Caucion',
      id: caucionId,
      provider,
      amount: Number(amount),
      annualRate: Number(annualRate),
      startDate,
      maturityDate,
      currency,
      term: Number(termDays),
    };

    userData.transactions.push(newTransaction);
    userData.positions.push(newPosition);
    userData.cash[currency] -= Number(amount);

    await saveUserData(username, userData);

    return NextResponse.json({ 
      message: 'Caución created successfully', 
      transaction: newTransaction, 
      position: newPosition, 
      cash: userData.cash 
    });
  } catch (error) {
    console.error('Failed to create caución:', error);
    return NextResponse.json({ error: 'Failed to create caución' }, { status: 500 });
  }
}

// Update an existing caución
export async function PUT(request: Request) {
  try {
    const { 
      username, 
      positionId, 
      amount, 
      annualRate, 
      termDays, 
      provider, 
      currency 
    }: { 
      username: string; 
      positionId: string; 
      amount: number; 
      annualRate: number; 
      termDays: number; 
      provider: string; 
      currency: 'ARS' | 'USD'; 
    } = await request.json();

    if (!username || !positionId || !amount || !annualRate || !termDays || !provider || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userData = await readUserFile(username);
    if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const positionIndex = userData.positions.findIndex(pos => 
      pos.type === 'Caucion' && (pos as CaucionPosition).id === positionId
    );

    if (positionIndex === -1) {
      return NextResponse.json({ error: 'Caución position not found' }, { status: 404 });
    }
    
    const oldPosition = userData.positions[positionIndex];
    if (oldPosition.type !== 'Caucion') {
        return NextResponse.json({ error: 'Position is not a caución' }, { status: 400 });
    }
    
    const oldCaucion = oldPosition as CaucionPosition;
    const oldAmount = oldCaucion.amount;
    const oldCurrency = oldCaucion.currency;
    const newAmount = Number(amount);

    // Check if user has enough cash for the difference
    const amountDifference = newAmount - oldAmount;
    if (amountDifference > 0 && userData.cash[currency] < amountDifference) {
      return NextResponse.json({ error: 'Insufficient funds for the increase' }, { status: 400 });
    }

    // Adjust available cash
    if (oldCurrency !== currency) {
      // Currency has changed, so we need to adjust both balances
      userData.cash[oldCurrency] = (userData.cash[oldCurrency] || 0) + oldAmount;
      userData.cash[currency] = (userData.cash[currency] || 0) - newAmount;
    } else {
      // Currency is the same, just adjust the balance
      userData.cash[currency] = (userData.cash[currency] || 0) + oldAmount - newAmount;
    }
    
    // Update position
    const maturityDate = dayjs().add(termDays, 'day').toISOString();
    userData.positions[positionIndex] = { 
      ...oldPosition, 
      amount: newAmount, 
      annualRate: Number(annualRate),
      term: Number(termDays),
      provider,
      currency,
      maturityDate
    };

    await saveUserData(username, userData);

    return NextResponse.json({ message: 'Caución updated successfully', cash: userData.cash });
  } catch (error) {
    console.error('Failed to update caución:', error);
    return NextResponse.json({ error: 'Failed to update caución' }, { status: 500 });
  }
}

// Delete a caución
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const positionId = searchParams.get('positionId');

    if (!username || !positionId) {
      return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    const userData = await readUserFile(username);
    if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const positionIndex = userData.positions.findIndex(pos => 
      pos.type === 'Caucion' && (pos as CaucionPosition).id === positionId
    );

    if (positionIndex === -1) {
      return NextResponse.json({ error: 'Caución position not found' }, { status: 404 });
    }

    const positionToDelete = userData.positions[positionIndex];
    if (positionToDelete.type !== 'Caucion') {
        return NextResponse.json({ error: 'Position is not a caución' }, { status: 400 });
    }

    const caucionToDelete = positionToDelete as CaucionPosition;
    userData.cash[caucionToDelete.currency] = (userData.cash[caucionToDelete.currency] || 0) + caucionToDelete.amount;
    userData.positions.splice(positionIndex, 1);

    await saveUserData(username, userData);

    return NextResponse.json({ message: 'Caución deleted successfully', cash: userData.cash });
  } catch (error) {
    console.error('Failed to delete caución:', error);
    return NextResponse.json({ error: 'Failed to delete caución' }, { status: 500 });
  }
} 