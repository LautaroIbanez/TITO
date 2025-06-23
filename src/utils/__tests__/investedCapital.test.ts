import { calculateInvestedCapital } from '../investedCapital';
import { PortfolioTransaction } from '@/types';

describe('calculateInvestedCapital', () => {
  it('should return 0 for an empty array of transactions', () => {
    expect(calculateInvestedCapital([], 'ARS')).toBe(0);
  });

  it('should correctly sum buy transactions for stocks and bonds', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Buy', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-01', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // 1500
      { id: '2', type: 'Buy', ticker: 'US-BOND', quantity: 5, price: 100, date: '2023-01-02', assetType: 'Bond', currency: 'ARS' }, // 500
    ];
    expect(calculateInvestedCapital(transactions, 'ARS')).toBe(2000);
  });

  it('should correctly sum fixed-term deposit creation transactions', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '3', type: 'Create', amount: 5000, date: '2023-01-03', assetType: 'FixedTermDeposit', provider: 'Test Bank', annualRate: 0.05, termDays: 365, maturityDate: '2024-01-03', currency: 'ARS' },
    ];
    expect(calculateInvestedCapital(transactions, 'ARS')).toBe(5000);
  });

  it('should subtract sell transaction proceeds', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Buy', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-01', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // +1500
      { id: '4', type: 'Sell', symbol: 'AAPL', quantity: 5, price: 160, date: '2023-01-04', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // -800
    ];
    expect(calculateInvestedCapital(transactions, 'ARS')).toBe(700);
  });

  it('should ignore simple deposit transactions', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '5', type: 'Deposit', amount: 10000, date: '2023-01-05', currency: 'ARS' },
      { id: '1', type: 'Buy', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-01', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // 1500
    ];
    expect(calculateInvestedCapital(transactions, 'ARS')).toBe(1500);
  });

  it('should handle a complex mix of transactions correctly', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '5', type: 'Deposit', amount: 20000, date: '2023-01-01', currency: 'ARS' }, // Ignored
      { id: '1', type: 'Buy', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-02', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // +1500
      { id: '2', type: 'Buy', ticker: 'US-BOND', quantity: 5, price: 100, date: '2023-01-03', assetType: 'Bond', currency: 'ARS' }, // +500
      { id: '3', type: 'Create', amount: 5000, date: '2023-01-04', assetType: 'FixedTermDeposit', provider: 'Test Bank', annualRate: 0.05, termDays: 365, maturityDate: '2024-01-04', currency: 'ARS' }, // +5000
      { id: '4', type: 'Sell', symbol: 'AAPL', quantity: 5, price: 160, date: '2023-01-05', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // -800
    ];
    // 1500 + 500 + 5000 - 800 = 6200
    expect(calculateInvestedCapital(transactions, 'ARS')).toBe(6200);
  });

  it('should return a negative value if sell proceeds exceed buy costs', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Buy', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-01', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // +1500
      { id: '4', type: 'Sell', symbol: 'AAPL', quantity: 10, price: 200, date: '2023-01-04', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // -2000
    ];
    expect(calculateInvestedCapital(transactions, 'ARS')).toBe(-500);
  });
}); 