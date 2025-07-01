import { getUserData, saveUserData } from './userData';
import { UserData, DepositTransaction, PortfolioTransaction, StockPosition, BondPosition, CryptoPosition, CryptoTradeTransaction, FixedTermDepositPosition } from '@/types';
import { DEFAULT_COMMISSION_PCT, DEFAULT_PURCHASE_FEE_PCT } from './constants';
import { convertCurrency } from './currency';
import dayjs from 'dayjs';

export async function addDeposit(username: string, amount: number, date: string, currency: 'ARS' | 'USD') {
  const user = await getUserData(username);
  if (!user) throw new Error('User not found');
  if (!user.cash) user.cash = { ARS: 0, USD: 0 };
  if (!user.transactions) user.transactions = [];

  const newDeposit: DepositTransaction = {
    id: `dep_${Date.now()}`,
    date,
    type: 'Deposit',
    amount: Number(amount),
    currency,
  };
  user.transactions.push(newDeposit);
  user.cash[currency] = (user.cash[currency] || 0) + Number(amount);
  await saveUserData(username, user);
  return { deposit: newDeposit, cash: user.cash };
}

export async function buyAsset(username: string, assetType: string, body: any) {
  const user = await getUserData(username);
  if (!user) throw new Error('User not found');
  if (!user.positions) user.positions = [];
  if (!user.transactions) user.transactions = [];
  if (!user.cash) user.cash = { ARS: 0, USD: 0 };
  let totalCost = 0;

  switch (assetType) {
    case 'Stock': {
      const { symbol, quantity, price, currency, market, commissionPct = DEFAULT_COMMISSION_PCT, purchaseFeePct = DEFAULT_PURCHASE_FEE_PCT } = body;
      if (!symbol || !quantity || !price || !currency || !market) throw new Error('Missing fields for Stock purchase');
      const validatedCurrency = currency as 'ARS' | 'USD';
      const baseCost = quantity * price;
      totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
      if (user.cash[validatedCurrency] < totalCost) throw new Error('Insufficient funds');
      const pos = user.positions.find(
        (p): p is StockPosition =>
          p.type === 'Stock' &&
          p.symbol === symbol &&
          p.currency === validatedCurrency &&
          p.market === market
      );
      if (pos) {
        const prevTotalCost = pos.averagePrice * pos.quantity;
        pos.quantity += quantity;
        pos.averagePrice = (prevTotalCost + totalCost) / pos.quantity;
      } else {
        const newPosition: StockPosition = { type: 'Stock', symbol, quantity, averagePrice: totalCost / quantity, currency: validatedCurrency, market };
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
      if (!ticker || !quantity || !price || !currency) throw new Error('Missing fields for Bond purchase');
      const validatedCurrency = currency as 'ARS' | 'USD';
      const baseCost = quantity * price;
      totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
      if (user.cash[validatedCurrency] < totalCost) throw new Error('Insufficient funds');
      const pos = user.positions.find((p): p is BondPosition => p.type === 'Bond' && p.ticker === ticker && p.currency === validatedCurrency);
      if (pos) {
        const prevTotalCost = pos.averagePrice * pos.quantity;
        pos.quantity += quantity;
        pos.averagePrice = (prevTotalCost + totalCost) / pos.quantity;
      } else {
        const newPosition: BondPosition = { type: 'Bond', ticker, quantity, averagePrice: totalCost / quantity, currency: validatedCurrency };
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
      if (!symbol || !quantity || !price) throw new Error('Missing fields for Crypto purchase');
      const validatedCurrency = currency as 'ARS' | 'USD';
      const baseCost = quantity * price;
      totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
      if (user.cash[validatedCurrency] < totalCost) throw new Error('Insufficient funds');
      let usdAmount = totalCost;
      if (validatedCurrency === 'ARS') {
        usdAmount = await convertCurrency(totalCost, 'ARS', 'USD');
      }
      const pos = user.positions.find((p): p is CryptoPosition => p.type === 'Crypto' && p.symbol === symbol);
      if (pos) {
        const prevTotalCost = pos.averagePrice * pos.quantity;
        pos.quantity += quantity;
        pos.averagePrice = (prevTotalCost + usdAmount) / pos.quantity;
      } else {
        const newPosition: CryptoPosition = { type: 'Crypto', symbol, quantity, averagePrice: usdAmount / quantity, currency: 'USD' };
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
        currency: 'USD',
        commissionPct,
        purchaseFeePct,
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
      if (!provider || !amount || !annualRate || !termDays || !currency) throw new Error('Missing fields for Fixed Term Deposit');
      const validatedCurrency = currency as 'ARS' | 'USD';
      totalCost = amount;
      if (user.cash[validatedCurrency] < totalCost) throw new Error('Insufficient funds');
      const startDate = dayjs();
      const maturityDate = startDate.add(termDays, 'day');
      const newPosition: FixedTermDepositPosition = {
        type: 'FixedTermDeposit',
        id: `ftd-${Date.now()}`,
        provider,
        amount,
        annualRate,
        termDays,
        currency: validatedCurrency,
        startDate: startDate.toISOString(),
        maturityDate: maturityDate.toISOString(),
        status: 'active',
      };
      user.positions.push(newPosition);
      const tx: PortfolioTransaction = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: 'Buy',
        assetType: 'FixedTermDeposit',
        provider,
        amount,
        annualRate,
        termDays,
        currency: validatedCurrency,
      };
      user.transactions.push(tx);
      user.cash[validatedCurrency] -= totalCost;
      break;
    }
    default:
      throw new Error('Unsupported asset type');
  }
  await saveUserData(username, user);
  return { positions: user.positions, transactions: user.transactions, cash: user.cash };
}

export async function sellAsset(username: string, assetType: string, body: any) {
  const user = await getUserData(username);
  if (!user) throw new Error('User not found');
  if (!user.positions) user.positions = [];
  if (!user.transactions) user.transactions = [];
  if (!user.cash) user.cash = { ARS: 0, USD: 0 };
  let proceeds = 0;
  let cashCurrency: 'ARS' | 'USD';
  const commissionPct = body.commissionPct ?? DEFAULT_COMMISSION_PCT;
  switch (assetType) {
    case 'Stock': {
      const { symbol, quantity, price, currency, market } = body;
      if (!symbol) throw new Error('Symbol is required for stock sell');
      const posIndex = user.positions.findIndex(p => p.type === 'Stock' && p.symbol === symbol && p.currency === currency && p.market === market);
      if (posIndex === -1) throw new Error('Position not found');
      const pos = user.positions[posIndex] as StockPosition;
      if (pos.quantity < quantity) throw new Error('Insufficient quantity');
      proceeds = quantity * price * (1 - commissionPct / 100);
      cashCurrency = currency;
      pos.quantity -= quantity;
      if (pos.quantity < 1e-6) {
        user.positions.splice(posIndex, 1);
      }
      const tx: PortfolioTransaction = {
        id: `txn_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'Sell',
        assetType: 'Stock',
        symbol,
        quantity,
        price,
        currency,
        market,
        commissionPct,
      };
      user.transactions.push(tx);
      break;
    }
    case 'Bond': {
      const { ticker, quantity, price, currency } = body;
      if (!ticker) throw new Error('Ticker is required for bond sell');
      const posIndex = user.positions.findIndex(p => p.type === 'Bond' && p.ticker === ticker && p.currency === currency);
      if (posIndex === -1) throw new Error('Position not found');
      const pos = user.positions[posIndex] as BondPosition;
      if (pos.quantity < quantity) throw new Error('Insufficient quantity');
      proceeds = quantity * price * (1 - commissionPct / 100);
      cashCurrency = currency;
      pos.quantity -= quantity;
      if (pos.quantity < 1e-6) {
        user.positions.splice(posIndex, 1);
      }
      const tx: PortfolioTransaction = {
        id: `txn_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'Sell',
        assetType: 'Bond',
        ticker,
        quantity,
        price,
        currency,
        commissionPct
      };
      user.transactions.push(tx);
      break;
    }
    case 'Crypto': {
      const { symbol, quantity, price } = body;
      if (!symbol) throw new Error('Symbol is required for crypto sell');
      const posIndex = user.positions.findIndex(p => p.type === 'Crypto' && p.symbol === symbol);
      if (posIndex === -1) throw new Error('Position not found');
      const pos = user.positions[posIndex] as CryptoPosition;
      if (pos.quantity < quantity) throw new Error('Insufficient quantity');
      proceeds = quantity * price * (1 - commissionPct / 100);
      cashCurrency = 'USD'; // Crypto proceeds always go to USD
      pos.quantity -= quantity;
      if (pos.quantity < 1e-6) {
        user.positions.splice(posIndex, 1);
      }
      const tx: CryptoTradeTransaction = {
        id: `txn_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'Sell',
        assetType: 'Crypto',
        symbol,
        quantity,
        price,
        currency: 'USD',
        commissionPct
      };
      user.transactions.push(tx);
      break;
    }
    default:
      throw new Error('Invalid asset type for selling');
  }
  user.cash[cashCurrency] += proceeds;
  await saveUserData(username, user);
  return { positions: user.positions, transactions: user.transactions, cash: user.cash };
} 