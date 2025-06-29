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

  it('should account for commissionPct and purchaseFeePct in Buy and Sell transactions', () => {
    const transactions: PortfolioTransaction[] = [
      // Buy: 10 * 100 * (1 + 0.01 + 0.02) = 1000 * 1.03 = 1030
      { id: '1', type: 'Buy', symbol: 'BTC', quantity: 10, price: 100, date: '2023-01-01', assetType: 'Crypto', currency: 'USD', commissionPct: 1, purchaseFeePct: 2 },
      // Sell: 5 * 120 * (1 - 0.01) = 600 * 0.99 = 594
      { id: '2', type: 'Sell', symbol: 'BTC', quantity: 5, price: 120, date: '2023-01-02', assetType: 'Crypto', currency: 'USD', commissionPct: 1 },
      // Buy without commission/fee: 2 * 200 = 400
      { id: '3', type: 'Buy', symbol: 'ETH', quantity: 2, price: 200, date: '2023-01-03', assetType: 'Crypto', currency: 'USD' },
      // Sell without commission: 1 * 250 = 250
      { id: '4', type: 'Sell', symbol: 'ETH', quantity: 1, price: 250, date: '2023-01-04', assetType: 'Crypto', currency: 'USD' },
    ];
    // 1030 (buy) - 594 (sell) + 400 (buy) - 250 (sell) = 586
    expect(calculateInvestedCapital(transactions, 'USD')).toBeCloseTo(586);
  });

  it('should offset invested capital when a fixed-term deposit is closed and payout is deposited', () => {
    const transactions: PortfolioTransaction[] = [
      // Create a fixed-term deposit
      { id: 'ftd1', type: 'Create', assetType: 'FixedTermDeposit', provider: 'Bank', amount: 1000, annualRate: 0.1, termDays: 30, maturityDate: '2023-02-01', date: '2023-01-01', currency: 'ARS' },
      // Deposit payout (principal only)
      { id: 'dep1', type: 'Deposit', amount: 1000, date: '2023-02-01', currency: 'ARS' },
    ];
    // 1000 (create) - 1000 (deposit) = 0
    expect(calculateInvestedCapital(transactions, 'ARS')).toBe(0);

    // Now with interest payout
    const transactionsWithInterest: PortfolioTransaction[] = [
      { id: 'ftd1', type: 'Create', assetType: 'FixedTermDeposit', provider: 'Bank', amount: 1000, annualRate: 0.1, termDays: 30, maturityDate: '2023-02-01', date: '2023-01-01', currency: 'ARS' },
      { id: 'dep1', type: 'Deposit', amount: 1010, date: '2023-02-01', currency: 'ARS' },
    ];
    // 1000 (create) - 1010 (deposit) = -10 (ganancia)
    expect(calculateInvestedCapital(transactionsWithInterest, 'ARS')).toBe(-10);
  });

  it('should add ARS invested capital for crypto buys paid in ARS but recorded in USD', () => {
    const transactions: PortfolioTransaction[] = [
      // Buy 0.5 BTC, pagado en ARS, registrado en USD
      {
        id: 'crypto1',
        type: 'Buy',
        assetType: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.5,
        price: 20000, // USD
        date: '2023-01-01',
        currency: 'USD',
        commissionPct: 1,
        purchaseFeePct: 2,
        originalCurrency: 'ARS',
        originalAmount: 5000000, // ARS gastados
      },
    ];
    // El capital invertido en ARS debe reflejar el gasto real en ARS
    expect(calculateInvestedCapital(transactions, 'ARS')).toBe(5000000);
    // El capital invertido en USD debe ser 0 (no suma nada)
    expect(calculateInvestedCapital(transactions, 'USD')).toBe(0);
  });

  it('should treat FixedTermPayout deposits as reducing invested capital but not as net contributions', () => {
    const transactions: PortfolioTransaction[] = [
      { id: 'ftd1', type: 'Create', assetType: 'FixedTermDeposit', provider: 'Bank', amount: 1000, annualRate: 0.1, termDays: 30, maturityDate: '2023-02-01', date: '2023-01-01', currency: 'ARS' },
      { id: 'dep1', type: 'Deposit', amount: 1010, date: '2023-02-01', currency: 'ARS', source: 'FixedTermPayout' },
    ];
    // Capital invertido: 1000 (create) - 1010 (deposit) = -10
    expect(calculateInvestedCapital(transactions, 'ARS')).toBe(-10);
    // Net contributions: solo el create cuenta, el deposit se ignora
    expect(calculateNetContributions(transactions, 'ARS')).toBe(0);
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

describe('calculateDailyInvestedCapital', () => {
  it('should return all zeros for no transactions', () => {
    const result = require('../investedCapital').calculateDailyInvestedCapital([], '2023-01-01', '2023-01-03');
    expect(result).toEqual([
      { date: '2023-01-01', investedARS: 0, investedUSD: 0 },
      { date: '2023-01-02', investedARS: 0, investedUSD: 0 },
      { date: '2023-01-03', investedARS: 0, investedUSD: 0 },
    ]);
  });

  it('should accumulate only ARS transactions', () => {
    const txs = [
      { id: '1', type: 'Buy', symbol: 'AAPL', quantity: 2, price: 100, date: '2023-01-01', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // +200
      { id: '2', type: 'Sell', symbol: 'AAPL', quantity: 1, price: 120, date: '2023-01-02', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // -120
      { id: '3', type: 'Create', amount: 500, date: '2023-01-03', assetType: 'FixedTermDeposit', provider: 'Bank', annualRate: 0.05, termDays: 365, maturityDate: '2024-01-03', currency: 'ARS' }, // +500
    ];
    const result = require('../investedCapital').calculateDailyInvestedCapital(txs, '2023-01-01', '2023-01-03');
    expect(result).toEqual([
      { date: '2023-01-01', investedARS: 200, investedUSD: 0 },
      { date: '2023-01-02', investedARS: 80, investedUSD: 0 },
      { date: '2023-01-03', investedARS: 580, investedUSD: 0 },
    ]);
  });

  it('should accumulate only USD transactions', () => {
    const txs = [
      { id: '1', type: 'Buy', symbol: 'AAPL', quantity: 2, price: 50, date: '2023-01-01', assetType: 'Stock', currency: 'USD', market: 'NASDAQ' }, // +100
      { id: '2', type: 'Sell', symbol: 'AAPL', quantity: 1, price: 60, date: '2023-01-02', assetType: 'Stock', currency: 'USD', market: 'NASDAQ' }, // -60
      { id: '3', type: 'Create', amount: 200, date: '2023-01-03', assetType: 'FixedTermDeposit', provider: 'Bank', annualRate: 0.05, termDays: 365, maturityDate: '2024-01-03', currency: 'USD' }, // +200
    ];
    const result = require('../investedCapital').calculateDailyInvestedCapital(txs, '2023-01-01', '2023-01-03');
    expect(result).toEqual([
      { date: '2023-01-01', investedARS: 0, investedUSD: 100 },
      { date: '2023-01-02', investedARS: 0, investedUSD: 40 },
      { date: '2023-01-03', investedARS: 0, investedUSD: 240 },
    ]);
  });

  it('should accumulate mixed ARS and USD transactions', () => {
    const txs = [
      { id: '1', type: 'Buy', symbol: 'AAPL', quantity: 2, price: 100, date: '2023-01-01', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // +200
      { id: '2', type: 'Buy', symbol: 'AAPL', quantity: 1, price: 50, date: '2023-01-01', assetType: 'Stock', currency: 'USD', market: 'NASDAQ' }, // +50
      { id: '3', type: 'Sell', symbol: 'AAPL', quantity: 1, price: 120, date: '2023-01-02', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // -120
      { id: '4', type: 'Sell', symbol: 'AAPL', quantity: 1, price: 60, date: '2023-01-02', assetType: 'Stock', currency: 'USD', market: 'NASDAQ' }, // -60
      { id: '5', type: 'Create', amount: 500, date: '2023-01-03', assetType: 'FixedTermDeposit', provider: 'Bank', annualRate: 0.05, termDays: 365, maturityDate: '2024-01-03', currency: 'ARS' }, // +500
      { id: '6', type: 'Create', amount: 200, date: '2023-01-03', assetType: 'FixedTermDeposit', provider: 'Bank', annualRate: 0.05, termDays: 365, maturityDate: '2024-01-03', currency: 'USD' }, // +200
    ];
    const result = require('../investedCapital').calculateDailyInvestedCapital(txs, '2023-01-01', '2023-01-03');
    expect(result).toEqual([
      { date: '2023-01-01', investedARS: 200, investedUSD: 50 },
      { date: '2023-01-02', investedARS: 80, investedUSD: -10 },
      { date: '2023-01-03', investedARS: 580, investedUSD: 190 },
    ]);
  });

  it('should handle commission and purchaseFee in Buy and Sell', () => {
    const txs = [
      { id: '1', type: 'Buy', symbol: 'BTC', quantity: 1, price: 100, date: '2023-01-01', assetType: 'Crypto', currency: 'USD', commissionPct: 1, purchaseFeePct: 2 }, // 100 * 1.03 = 103
      { id: '2', type: 'Sell', symbol: 'BTC', quantity: 1, price: 120, date: '2023-01-02', assetType: 'Crypto', currency: 'USD', commissionPct: 1 }, // 120 * 0.99 = 118.8
    ];
    const result = require('../investedCapital').calculateDailyInvestedCapital(txs, '2023-01-01', '2023-01-02');
    expect(result).toEqual([
      { date: '2023-01-01', investedARS: 0, investedUSD: 103 },
      { date: '2023-01-02', investedARS: 0, investedUSD: -15.8 },
    ]);
  });

  it('should return correct values when there are days with no transactions', () => {
    const txs = [
      { id: '1', type: 'Buy', symbol: 'AAPL', quantity: 2, price: 100, date: '2023-01-01', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // +200
      { id: '2', type: 'Sell', symbol: 'AAPL', quantity: 1, price: 120, date: '2023-01-03', assetType: 'Stock', currency: 'ARS', market: 'NASDAQ' }, // -120
    ];
    const result = require('../investedCapital').calculateDailyInvestedCapital(txs, '2023-01-01', '2023-01-04');
    expect(result).toEqual([
      { date: '2023-01-01', investedARS: 200, investedUSD: 0 },
      { date: '2023-01-02', investedARS: 200, investedUSD: 0 },
      { date: '2023-01-03', investedARS: 80, investedUSD: 0 },
      { date: '2023-01-04', investedARS: 80, investedUSD: 0 },
    ]);
  });
}); 