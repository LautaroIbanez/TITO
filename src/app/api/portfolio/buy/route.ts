import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { 
  UserData, 
  PortfolioTransaction,
  StockPosition,
  BondPosition,
  FixedTermDepositPosition,
  CryptoPosition,
  CryptoTradeTransaction
} from '@/types';
import { DEFAULT_COMMISSION_PCT, DEFAULT_PURCHASE_FEE_PCT } from '@/utils/constants';
import { convertCurrency } from '@/utils/currency';

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
    if (!user.cash) user.cash = { ARS: 0, USD: 0 };
    
    let totalCost = 0;

    switch (assetType) {
      case 'Stock': {
        const { symbol, quantity, price, currency, market, commissionPct = DEFAULT_COMMISSION_PCT, purchaseFeePct = DEFAULT_PURCHASE_FEE_PCT } = body;
        if (!symbol || !quantity || !price || !currency || !market) return NextResponse.json({ error: 'Missing fields for Stock purchase' }, { status: 400 });
        
        const validatedCurrency = currency as 'ARS' | 'USD';
        const baseCost = quantity * price;
        totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
        if (user.cash[validatedCurrency] < totalCost) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

        // Find an existing position for the same stock, currency, and market
        const pos = user.positions.find(
          (p): p is StockPosition =>
            p.type === 'Stock' &&
            p.symbol === symbol &&
            p.currency === validatedCurrency &&
            p.market === market
        );
        
        if (pos) {
          // If the position exists, update it. This now differentiates by currency and market.
          const newTotalValue = pos.averagePrice * pos.quantity + price * quantity;
          pos.quantity += quantity;
          pos.averagePrice = newTotalValue / pos.quantity;
        } else {
          const newPosition: StockPosition = { type: 'Stock', symbol, quantity, averagePrice: price, currency: validatedCurrency, market };
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
          currency: validatedCurrency,
          market,
          commissionPct,
          purchaseFeePct
        };
        user.transactions.push(tx);
        user.cash[validatedCurrency] -= totalCost;
        break;
      }
      
      case 'Bond': {
        const { ticker, quantity, price, currency, commissionPct = DEFAULT_COMMISSION_PCT, purchaseFeePct = DEFAULT_PURCHASE_FEE_PCT } = body;
        if (!ticker || !quantity || !price || !currency) return NextResponse.json({ error: 'Missing fields for Bond purchase' }, { status: 400 });
        
        const validatedCurrency = currency as 'ARS' | 'USD';
        const baseCost = quantity * price; // Assuming price is per unit
        totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
        if (user.cash[validatedCurrency] < totalCost) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

        const pos = user.positions.find((p): p is BondPosition => p.type === 'Bond' && p.ticker === ticker && p.currency === validatedCurrency);
        if (pos) {
          const newTotalValue = pos.averagePrice * pos.quantity + price * quantity;
          pos.quantity += quantity;
          pos.averagePrice = newTotalValue / pos.quantity;
        } else {
          const newPosition: BondPosition = { type: 'Bond', ticker, quantity, averagePrice: price, currency: validatedCurrency };
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
          currency: validatedCurrency,
          commissionPct,
          purchaseFeePct
        };
        user.transactions.push(tx);
        user.cash[validatedCurrency] -= totalCost;
        break;
      }
      
      case 'Crypto': {
        const { symbol, quantity, price, currency = 'USD', commissionPct = DEFAULT_COMMISSION_PCT, purchaseFeePct = DEFAULT_PURCHASE_FEE_PCT } = body;
        if (!symbol || !quantity || !price) return NextResponse.json({ error: 'Missing fields for Crypto purchase' }, { status: 400 });
        
        const validatedCurrency = currency as 'ARS' | 'USD';
        const baseCost = quantity * price;
        totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
        
        // Check if user has sufficient funds in the selected currency
        if (user.cash[validatedCurrency] < totalCost) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

        // Convert ARS to USD if needed for crypto position
        let usdAmount = totalCost;
        if (validatedCurrency === 'ARS') {
          usdAmount = await convertCurrency(totalCost, 'ARS', 'USD');
        }

        const pos = user.positions.find((p): p is CryptoPosition => p.type === 'Crypto' && p.symbol === symbol);
        if (pos) {
          const newTotalValue = pos.averagePrice * pos.quantity + price * quantity;
          pos.quantity += quantity;
          pos.averagePrice = newTotalValue / pos.quantity;
        } else {
          const newPosition: CryptoPosition = { type: 'Crypto', symbol, quantity, averagePrice: price, currency: 'USD' };
          user.positions.push(newPosition);
        }
        
        const tx: CryptoTradeTransaction = { 
          id: Date.now().toString(), 
          date: new Date().toISOString(), 
          type: 'Buy', 
          assetType: 'Crypto', 
          symbol, 
          quantity, 
          price,
          currency: 'USD', // Crypto positions are always recorded in USD
          commissionPct,
          purchaseFeePct,
          // Add conversion info if ARS was used
          ...(validatedCurrency === 'ARS' && {
            originalCurrency: 'ARS',
            originalAmount: totalCost,
            convertedAmount: usdAmount
          })
        };
        user.transactions.push(tx);
        user.cash[validatedCurrency] -= totalCost;
        break;
      }
      
      case 'FixedTermDeposit': {
        const { provider, amount, annualRate, termDays, currency } = body;
        if (!provider || !amount || !annualRate || !termDays || !currency) return NextResponse.json({ error: 'Missing fields for Fixed Term Deposit' }, { status: 400 });

        const validatedCurrency = currency as 'ARS' | 'USD';
        totalCost = amount;
        if (user.cash[validatedCurrency] < totalCost) return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });

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
          currency: validatedCurrency,
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
          maturityDate: maturityDate.toISOString(),
          currency: validatedCurrency,
        };
        user.transactions.push(tx);
        user.cash[validatedCurrency] -= totalCost;
        break;
      }
      
      default:
        return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 });
    }
    
    await saveUserData(username, user);
    
    return NextResponse.json({ 
      positions: user.positions, 
      transactions: user.transactions,
      cash: user.cash
    });

  } catch (err) {
    console.error('Error in buy route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 