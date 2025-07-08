import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, StockPosition, BondPosition, StockTradeTransaction, BondTradeTransaction, FixedTermDepositPosition, DepositTransaction, WithdrawalTransaction } from '@/types';
import { getUserData, saveUserData } from '@/utils/userData';





export async function POST(request: NextRequest) {
  try {
    const { username, assetType, identifier, currency, amount }: {
      username: string;
      assetType: 'Stock' | 'Bond' | 'FixedTermDeposit' | 'Cash';
      identifier?: string;
      currency?: 'ARS' | 'USD';
      amount?: number;
    } = await request.json();

    if (!username || !assetType) {
      return NextResponse.json({ error: 'Username and assetType are required' }, { status: 400 });
    }

    const user: UserData | null = await getUserData(username);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.positions = user.positions || [];
    user.transactions = user.transactions || [];
    user.cash = user.cash || { ARS: 0, USD: 0 };

    if (assetType === 'Cash') {
      if (!amount || !currency) {
        return NextResponse.json({ error: 'Amount and currency are required for cash withdrawal' }, { status: 400 });
      }
      if (user.cash[currency] < amount) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
      }

      user.cash[currency] -= amount;

      const tx: WithdrawalTransaction = {
        id: `wdl_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'Withdrawal',
        amount: amount,
        currency: currency
      };
      user.transactions.push(tx);
      
      await saveUserData(username, user);
      
      return NextResponse.json({
        cash: user.cash,
        transactions: user.transactions,
      });
    }

    if (!identifier) {
      return NextResponse.json({ error: 'Identifier is required for removing assets' }, { status: 400 });
    }
    
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
    const positionCurrency = (position as StockPosition | BondPosition | FixedTermDepositPosition).currency;


    if (position.type === 'Stock') {
      const stockData = await fs.readFile(path.join(process.cwd(), 'data', 'stocks', `${position.symbol}.json`), 'utf-8');
      const price = JSON.parse(stockData)?.[JSON.parse(stockData).length - 1]?.close || 0;
      if (!price) {
        return NextResponse.json({ error: `No price data for symbol ${position.symbol}` }, { status: 400 });
      }
      const totalProceeds = position.quantity * price;
      user.cash[positionCurrency] += totalProceeds;
      const tx: StockTradeTransaction = { id: Date.now().toString(), date: new Date().toISOString(), type: 'Sell', assetType: 'Stock', symbol: position.symbol, quantity: position.quantity, price, currency: positionCurrency, market: position.market };
      user.transactions.push(tx);
    } else if (position.type === 'Bond') {
      const price = position.purchasePrice; // Assume sale at purchase price for simplicity
      const totalProceeds = position.quantity * price;
      user.cash[positionCurrency] += totalProceeds;
      const tx: BondTradeTransaction = { id: Date.now().toString(), date: new Date().toISOString(), type: 'Sell', assetType: 'Bond', ticker: position.ticker, quantity: position.quantity, price, currency: positionCurrency };
      user.transactions.push(tx);
    } else if (position.type === 'FixedTermDeposit') {
      // Calculate if matured
      const startDate = new Date(position.startDate);
      const maturityDate = new Date(position.maturityDate);
      const today = new Date();
      let payout = position.amount;
      let interest = 0;
      if (today >= maturityDate) {
        // Full interest
        const days = Math.round((maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyRate = position.annualRate / 100 / 365;
        interest = position.amount * dailyRate * days;
        payout += interest;
      }
      user.cash[positionCurrency] += payout;
      // Register a DepositTransaction for the payout
      const tx: DepositTransaction = {
        id: `dep_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'Deposit',
        amount: payout,
        currency: positionCurrency,
        source: 'FixedTermPayout',
      };
      user.transactions.push(tx);
    }

    // Remove the position from the array
    user.positions.splice(positionIndex, 1);

    await saveUserData(username, user);

    return NextResponse.json({
      positions: user.positions,
      transactions: user.transactions,
      cash: user.cash,
    });
  } catch (err) {
    console.error('Portfolio remove error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 