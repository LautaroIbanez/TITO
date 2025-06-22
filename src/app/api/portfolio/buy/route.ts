import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { 
  UserData, 
  PortfolioPosition, 
  PortfolioTransaction,
  StockPosition,
  BondPosition,
  FixedTermDepositPosition
} from '@/types';
import { DEFAULT_COMMISSION_PCT, DEFAULT_PURCHASE_FEE_PCT } from '@/utils/constants';

async function getUserData(username: string): Promise<UserData | null> {
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  try {
    const data = await fs.readFile(userFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveUserData(username: string, data: UserData) {
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  await fs.writeFile(userFile, JSON.stringify(data, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, assetType } = body;

    if (!username || !assetType) {
      return NextResponse.json({ error: 'Username and assetType are required' }, { status: 400 });
    }

    const user = await getUserData(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure arrays exist
    if (!user.positions) user.positions = [];
    if (!user.transactions) user.transactions = [];
    if (typeof user.availableCash !== 'number') user.availableCash = 0;
    
    let totalCost = 0;

    switch (assetType) {
      case 'Stock': {
        const { symbol, quantity, price, commissionPct = DEFAULT_COMMISSION_PCT, purchaseFeePct = DEFAULT_PURCHASE_FEE_PCT } = body;
        if (!symbol || !quantity || !price) return NextResponse.json({ error: 'Missing fields for Stock purchase' }, { status: 400 });
        
        const baseCost = quantity * price;
        totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
        if (user.availableCash < totalCost) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

        let pos = user.positions.find((p): p is StockPosition => p.type === 'Stock' && p.symbol === symbol);
        if (pos) {
          const newTotalValue = pos.averagePrice * pos.quantity + price * quantity;
          pos.quantity += quantity;
          pos.averagePrice = newTotalValue / pos.quantity;
        } else {
          const newPosition: StockPosition = { type: 'Stock', symbol, quantity, averagePrice: price };
          user.positions.push(newPosition);
        }
        
        const tx: PortfolioTransaction = { 
          id: Date.now().toString(), 
          date: new Date().toISOString(), 
          type: 'Buy', 
          assetType: 'Stock', 
          symbol, 
          quantity, 
          price,
          commissionPct,
          purchaseFeePct
        };
        user.transactions.push(tx);
        break;
      }
      
      case 'Bond': {
        const { ticker, quantity, price, commissionPct = DEFAULT_COMMISSION_PCT, purchaseFeePct = DEFAULT_PURCHASE_FEE_PCT } = body;
        if (!ticker || !quantity || !price) return NextResponse.json({ error: 'Missing fields for Bond purchase' }, { status: 400 });
        
        const baseCost = quantity * price; // Assuming price is per unit
        totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
        if (user.availableCash < totalCost) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

        let pos = user.positions.find((p): p is BondPosition => p.type === 'Bond' && p.ticker === ticker);
        if (pos) {
          const newTotalValue = pos.averagePrice * pos.quantity + price * quantity;
          pos.quantity += quantity;
          pos.averagePrice = newTotalValue / pos.quantity;
        } else {
          const newPosition: BondPosition = { type: 'Bond', ticker, quantity, averagePrice: price };
          user.positions.push(newPosition);
        }
        
        const tx: PortfolioTransaction = { 
          id: Date.now().toString(), 
          date: new Date().toISOString(), 
          type: 'Buy', 
          assetType: 'Bond', 
          ticker, 
          quantity, 
          price,
          commissionPct,
          purchaseFeePct
        };
        user.transactions.push(tx);
        break;
      }
      
      case 'FixedTermDeposit': {
        const { provider, amount, annualRate, termDays } = body;
        if (!provider || !amount || !annualRate || !termDays) return NextResponse.json({ error: 'Missing fields for Fixed Term Deposit' }, { status: 400 });

        totalCost = amount;
        if (user.availableCash < totalCost) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

        const startDate = dayjs();
        const maturityDate = startDate.add(termDays, 'day');
        
        const newPosition: FixedTermDepositPosition = {
          type: 'FixedTermDeposit',
          id: `ftd-${Date.now()}`,
          provider,
          amount,
          annualRate,
          startDate: startDate.toISOString(),
          maturityDate: maturityDate.toISOString(),
        };
        user.positions.push(newPosition);

        const tx: PortfolioTransaction = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: 'Create',
          assetType: 'FixedTermDeposit',
          provider,
          amount,
          annualRate,
          termDays,
          maturityDate: maturityDate.toISOString()
        };
        user.transactions.push(tx);
        break;
      }
      
      default:
        return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 });
    }

    user.availableCash -= totalCost;
    await saveUserData(username, user);
    
    return NextResponse.json({ 
      positions: user.positions, 
      transactions: user.transactions,
      availableCash: user.availableCash
    });

  } catch (err) {
    console.error('Error in buy route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 