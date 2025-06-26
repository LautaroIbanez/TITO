import { calculateInvestedCapital, calculateNetContributions } from '../investedCapital';
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

describe('calculateNetContributions', () => {
  it('should return 0 for an empty array of transactions', () => {
    expect(calculateNetContributions([], 'ARS')).toBe(0);
  });

  it('should correctly sum deposit transactions as positive contributions', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Deposit', amount: 10000, date: '2023-01-01', currency: 'ARS' }, // +10000
      { id: '2', type: 'Deposit', amount: 5000, date: '2023-01-02', currency: 'ARS' }, // +5000
    ];
    expect(calculateNetContributions(transactions, 'ARS')).toBe(15000);
  });

  it('should correctly sum withdrawal transactions as negative contributions', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Withdrawal', amount: 3000, date: '2023-01-01', currency: 'ARS' }, // -3000
      { id: '2', type: 'Withdrawal', amount: 2000, date: '2023-01-02', currency: 'ARS' }, // -2000
    ];
    expect(calculateNetContributions(transactions, 'ARS')).toBe(-5000);
  });

  it('should correctly sum buy transactions as positive contributions', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Buy', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-01', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // +1500
      { id: '2', type: 'Buy', ticker: 'US-BOND', quantity: 5, price: 100, date: '2023-01-02', assetType: 'Bond', currency: 'ARS' }, // +500
    ];
    expect(calculateNetContributions(transactions, 'ARS')).toBe(2000);
  });

  it('should correctly sum sell transactions as negative contributions', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Sell', symbol: 'AAPL', quantity: 5, price: 160, date: '2023-01-01', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // -800
      { id: '2', type: 'Sell', ticker: 'US-BOND', quantity: 2, price: 110, date: '2023-01-02', assetType: 'Bond', currency: 'ARS' }, // -220
    ];
    expect(calculateNetContributions(transactions, 'ARS')).toBe(-1020);
  });

  it('should correctly sum fixed-term deposit creation transactions as positive contributions', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Create', amount: 5000, date: '2023-01-01', assetType: 'FixedTermDeposit', provider: 'Test Bank', annualRate: 0.05, termDays: 365, maturityDate: '2024-01-01', currency: 'ARS' }, // +5000
      { id: '2', type: 'Create', amount: 3000, date: '2023-01-02', assetType: 'FixedTermDeposit', provider: 'Test Bank', annualRate: 0.04, termDays: 180, maturityDate: '2023-07-02', currency: 'ARS' }, // +3000
    ];
    expect(calculateNetContributions(transactions, 'ARS')).toBe(8000);
  });

  it('should handle a complex mix of all transaction types correctly', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Deposit', amount: 20000, date: '2023-01-01', currency: 'ARS' }, // +20000
      { id: '2', type: 'Buy', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-02', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // +1500
      { id: '3', type: 'Create', amount: 5000, date: '2023-01-03', assetType: 'FixedTermDeposit', provider: 'Test Bank', annualRate: 0.05, termDays: 365, maturityDate: '2024-01-03', currency: 'ARS' }, // +5000
      { id: '4', type: 'Sell', symbol: 'AAPL', quantity: 5, price: 160, date: '2023-01-04', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // -800
      { id: '5', type: 'Withdrawal', amount: 3000, date: '2023-01-05', currency: 'ARS' }, // -3000
    ];
    // 20000 + 1500 + 5000 - 800 - 3000 = 22700
    expect(calculateNetContributions(transactions, 'ARS')).toBe(22700);
  });

  it('should return a negative value if withdrawals and sells exceed deposits and buys', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Deposit', amount: 1000, date: '2023-01-01', currency: 'ARS' }, // +1000
      { id: '2', type: 'Buy', symbol: 'AAPL', quantity: 5, price: 150, date: '2023-01-02', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // +750
      { id: '3', type: 'Sell', symbol: 'AAPL', quantity: 5, price: 160, date: '2023-01-03', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // -800
      { id: '4', type: 'Withdrawal', amount: 2000, date: '2023-01-04', currency: 'ARS' }, // -2000
    ];
    // 1000 + 750 - 800 - 2000 = -1050
    expect(calculateNetContributions(transactions, 'ARS')).toBe(-1050);
  });

  it('should filter transactions by currency correctly', () => {
    const transactions: PortfolioTransaction[] = [
      { id: '1', type: 'Deposit', amount: 10000, date: '2023-01-01', currency: 'ARS' }, // +10000 (ARS)
      { id: '2', type: 'Deposit', amount: 5000, date: '2023-01-02', currency: 'USD' }, // +5000 (USD)
      { id: '3', type: 'Buy', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-03', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // +1500 (ARS)
      { id: '4', type: 'Buy', symbol: 'GOOGL', quantity: 5, price: 200, date: '2023-01-04', assetType: 'Stock', currency: 'USD', market: 'NASDAQ' }, // +1000 (USD)
    ];
    expect(calculateNetContributions(transactions, 'ARS')).toBe(11500); // 10000 + 1500
    expect(calculateNetContributions(transactions, 'USD')).toBe(6000); // 5000 + 1000
  });
}); 