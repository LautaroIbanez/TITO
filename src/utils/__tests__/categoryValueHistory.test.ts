import { calculateCategoryValueHistory, CategoryValueEntry } from '../categoryValueHistory';
import { PortfolioTransaction } from '@/types';
import { PriceData } from '@/types/finance';
import dayjs from 'dayjs';

// Mock the currency module
jest.mock('../currency', () => ({
  getExchangeRate: jest.fn().mockResolvedValue(1000), // 1 USD = 1000 ARS
}));

describe('calculateCategoryValueHistory', () => {
  const mockPriceHistory: Record<string, PriceData[]> = {
    AAPL: [
      { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { date: '2024-01-02', open: 102, high: 108, low: 100, close: 105, volume: 1200 },
    ],
    BTCUSDT: [
      { date: '2024-01-01', open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 },
      { date: '2024-01-02', open: 50500, high: 52000, low: 50000, close: 51500, volume: 150 },
    ],
    AL29D: [
      { date: '2024-01-01', open: 100, high: 102, low: 98, close: 101, volume: 500 },
      { date: '2024-01-02', open: 101, high: 104, low: 100, close: 103, volume: 600 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('debug test', () => {
    it('should debug single stock purchase', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'USD',
        { startDate: '2024-01-01', endDate: '2024-01-01' }
      );

      console.log('Debug result:', JSON.stringify(result, null, 2));
      expect(result).toHaveLength(1);
    });
  });

  describe('empty transactions', () => {
    it('should return empty array for no transactions', async () => {
      const result = await calculateCategoryValueHistory([], mockPriceHistory);
      expect(result).toEqual([]);
    });

    it('should return empty array for null transactions', async () => {
      const result = await calculateCategoryValueHistory(null as any, mockPriceHistory);
      expect(result).toEqual([]);
    });
  });

  describe('basic stock transactions', () => {
    it('should calculate category values for stock buy/sell', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Sell',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 5,
          price: 105,
          currency: 'USD',
          market: 'NASDAQ',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'USD',
        { startDate: '2024-01-01', endDate: '2024-01-02' }
      );

      expect(result).toHaveLength(2);
      
      // Day 1: 10 AAPL shares at $102 = $1020 in tech category, but cash is reduced by $1000
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].categories.tech).toBe(1020); // 10 * 102
      expect(result[0].categories.cash).toBe(-1000); // Reduced by purchase amount
      expect(result[0].totalValue).toBe(20); // 1020 - 1000
      
      // Day 2: 5 AAPL shares at $105 = $525 in tech category, cash increased by $525 from sale
      expect(result[1].date).toBe('2024-01-02');
      expect(result[1].categories.tech).toBe(525); // 5 * 105
      expect(result[1].categories.cash).toBe(-475); // -1000 + 525
      expect(result[1].totalValue).toBe(50); // 525 - 475
    });

    it('should categorize stocks correctly', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
        {
          id: '2',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'SPY',
          quantity: 5,
          price: 400,
          currency: 'USD',
          market: 'NYSE',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'USD',
        { startDate: '2024-01-01', endDate: '2024-01-01' }
      );

      expect(result).toHaveLength(1);
      expect(result[0].categories.tech).toBe(1020); // AAPL in tech
      expect(result[0].categories.etfs).toBe(2000); // SPY in etfs (5 * 400)
      expect(result[0].categories.cash).toBe(-3000); // Reduced by purchase amounts (1000 + 2000)
      expect(result[0].totalValue).toBe(20); // 1020 + 2000 - 3000
    });
  });

  describe('crypto transactions', () => {
    it('should calculate category values for crypto', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Crypto',
          symbol: 'BTCUSDT',
          quantity: 0.1,
          price: 50000,
          currency: 'USD',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'USD',
        { startDate: '2024-01-01', endDate: '2024-01-01' }
      );

      expect(result).toHaveLength(1);
      expect(result[0].categories.crypto).toBe(5050); // 0.1 * 50500
      expect(result[0].categories.cash).toBe(-5000); // Reduced by purchase amount
      expect(result[0].totalValue).toBe(50); // 5050 - 5000
    });
  });

  describe('bond transactions', () => {
    it('should calculate category values for bonds', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Bond',
          ticker: 'AL29D',
          quantity: 100,
          price: 100,
          currency: 'ARS',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { startDate: '2024-01-01', endDate: '2024-01-01' }
      );

      expect(result).toHaveLength(1);
      expect(result[0].categories.bonds).toBe(10100); // 100 * 101
      expect(result[0].categories.cash).toBe(-10000); // Reduced by purchase amount
      expect(result[0].totalValue).toBe(100); // 10100 - 10000
    });
  });

  describe('fixed term deposits', () => {
    it('should calculate category values for deposits', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Create',
          assetType: 'FixedTermDeposit',
          provider: 'Bank',
          amount: 10000,
          annualRate: 50,
          termDays: 30,
          maturityDate: '2024-01-31',
          currency: 'ARS',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { startDate: '2024-01-01', endDate: '2024-01-02' }
      );

      expect(result).toHaveLength(2);
      
      // Day 1: Initial deposit value, cash reduced by deposit amount
      expect(result[0].categories.deposits).toBe(10000);
      expect(result[0].categories.cash).toBe(-10000); // Reduced by deposit amount
      expect(result[0].totalValue).toBe(0); // 10000 - 10000
      
      // Day 2: Deposit with 1 day of interest
      const dailyRate = 50 / 100 / 365;
      const interest = 10000 * dailyRate * 1;
      const expectedValue = 10000 + interest;
      expect(result[1].categories.deposits).toBeCloseTo(expectedValue, 2);
    });
  });

  describe('cauciones', () => {
    it('should calculate category values for cauciones', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Create',
          assetType: 'Caucion',
          provider: 'Broker',
          amount: 5000,
          annualRate: 40,
          termDays: 7,
          maturityDate: '2024-01-08',
          currency: 'ARS',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { startDate: '2024-01-01', endDate: '2024-01-02' }
      );

      expect(result).toHaveLength(2);
      
      // Day 1: Initial caucion value, cash reduced by caucion amount
      expect(result[0].categories.cauciones).toBe(5000);
      expect(result[0].categories.cash).toBe(-5000); // Reduced by caucion amount
      expect(result[0].totalValue).toBe(0); // 5000 - 5000
      
      // Day 2: Caucion with 1 day of interest
      const dailyRate = 40 / 100 / 365;
      const interest = 5000 * dailyRate * 1;
      const expectedValue = 5000 + interest;
      expect(result[1].categories.cauciones).toBeCloseTo(expectedValue, 2);
    });
  });

  describe('cash transactions', () => {
    it('should handle deposits and withdrawals', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS',
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Withdrawal',
          amount: 2000,
          currency: 'ARS',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { startDate: '2024-01-01', endDate: '2024-01-02' }
      );

      expect(result).toHaveLength(2);
      
      // Day 1: $10,000 cash
      expect(result[0].categories.cash).toBe(10000);
      expect(result[0].totalValue).toBe(10000);
      
      // Day 2: $8,000 cash after withdrawal
      expect(result[1].categories.cash).toBe(8000);
      expect(result[1].totalValue).toBe(8000);
    });
  });

  describe('currency conversion', () => {
    it('should convert values to target currency', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS', // Convert to ARS
        { startDate: '2024-01-01', endDate: '2024-01-01' }
      );

      expect(result).toHaveLength(1);
      // 10 AAPL * $102 * 1000 ARS/USD = 1,020,000 ARS
      expect(result[0].categories.tech).toBe(1020000);
      expect(result[0].categories.cash).toBe(-1000000); // Reduced by purchase amount in USD, converted to ARS
      expect(result[0].totalValue).toBe(20000); // 1020000 - 1000000
    });
  });

  describe('date range options', () => {
    it('should respect startDate and endDate options', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 1000,
          currency: 'ARS',
        },
        {
          id: '2',
          date: '2024-01-05',
          type: 'Deposit',
          amount: 2000,
          currency: 'ARS',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { startDate: '2024-01-02', endDate: '2024-01-04' }
      );

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-01-02');
      expect(result[1].date).toBe('2024-01-03');
      expect(result[2].date).toBe('2024-01-04');
      
      // All days should have the same cash value (1000 from first deposit)
      result.forEach(entry => {
        expect(entry.categories.cash).toBe(1000);
        expect(entry.totalValue).toBe(1000);
      });
    });

    it('should respect days option', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 1000,
          currency: 'ARS',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      expect(result).toHaveLength(3);
      // Should calculate last 3 days from today
      const today = dayjs();
      expect(result[0].date).toBe(today.subtract(2, 'day').format('YYYY-MM-DD'));
      expect(result[1].date).toBe(today.subtract(1, 'day').format('YYYY-MM-DD'));
      expect(result[2].date).toBe(today.format('YYYY-MM-DD'));
    });
  });

  describe('maturity handling', () => {
    it('should handle deposit maturity correctly', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Create',
          assetType: 'FixedTermDeposit',
          provider: 'Bank',
          amount: 10000,
          annualRate: 50,
          termDays: 1,
          maturityDate: '2024-01-02',
          currency: 'ARS',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { startDate: '2024-01-01', endDate: '2024-01-03' }
      );

      expect(result).toHaveLength(3);
      
      // Day 1: Active deposit, cash reduced
      expect(result[0].categories.deposits).toBe(10000);
      expect(result[0].categories.cash).toBe(-10000);
      
      // Day 2: Matured deposit (should still be in deposits category)
      const dailyRate = 50 / 100 / 365;
      const fullInterest = 10000 * dailyRate * 1;
      const finalValue = 10000 + fullInterest;
      expect(result[1].categories.deposits).toBeCloseTo(finalValue, 2);
      expect(result[1].categories.cash).toBe(-10000);
      
      // Day 3: Still matured deposit
      expect(result[2].categories.deposits).toBeCloseTo(finalValue, 2);
      expect(result[2].categories.cash).toBe(-10000);
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed asset types correctly', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS',
        },
        {
          id: '2',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 5,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
        {
          id: '3',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Crypto',
          symbol: 'BTCUSDT',
          quantity: 0.05,
          price: 50000,
          currency: 'USD',
        },
        {
          id: '4',
          date: '2024-01-01',
          type: 'Create',
          assetType: 'FixedTermDeposit',
          provider: 'Bank',
          amount: 5000,
          annualRate: 50,
          termDays: 30,
          maturityDate: '2024-01-31',
          currency: 'ARS',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { startDate: '2024-01-01', endDate: '2024-01-01' }
      );

      expect(result).toHaveLength(1);
      
      // Cash: 10000 ARS
      expect(result[0].categories.cash).toBe(10000);
      
      // Tech: 5 AAPL * $102 * 1000 ARS/USD = 510,000 ARS
      expect(result[0].categories.tech).toBe(510000);
      
      // Crypto: 0.05 BTC * $50,500 * 1000 ARS/USD = 2,525,000 ARS
      expect(result[0].categories.crypto).toBe(2525000);
      
      // Deposits: 5000 ARS
      expect(result[0].categories.deposits).toBe(5000);
      
      // Cash reduced by purchases: -1000 USD (AAPL) - 2500 USD (BTC) - 5000 ARS (deposit) = -1000000 - 2500000 - 5000 = -3,505,000 ARS
      // Total: 10000 + 510000 + 2525000 + 5000 - 3505000 = 100,000 ARS
      expect(result[0].totalValue).toBe(100000);
    });
  });

  describe('edge cases', () => {
    it('should handle zero quantity positions', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Sell',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 105,
          currency: 'USD',
          market: 'NASDAQ',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'USD',
        { startDate: '2024-01-01', endDate: '2024-01-02' }
      );

      expect(result).toHaveLength(2);
      
      // Day 1: 10 shares
      expect(result[0].categories.tech).toBe(1020);
      expect(result[0].categories.cash).toBe(-1000); // Reduced by purchase
      
      // Day 2: 0 shares (sold all)
      expect(result[1].categories.tech).toBeUndefined();
      expect(result[1].categories.cash).toBe(-475); // -1000 + 525 from sale
      expect(result[1].totalValue).toBe(-475);
    });

    it('should handle missing price data gracefully', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'UNKNOWN',
          quantity: 10,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'USD',
        { startDate: '2024-01-01', endDate: '2024-01-01' }
      );

      expect(result).toHaveLength(1);
      // Should not include unknown stock in any category
      expect(result[0].totalValue).toBe(0);
    });
  });

  describe('zero price handling', () => {
    it('should exclude assets with all zero prices from daily totals', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
        {
          id: '2',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'INVALID',
          quantity: 5,
          price: 50,
          currency: 'USD',
          market: 'NASDAQ',
        },
      ];

      const priceHistoryWithZeros = {
        ...mockPriceHistory,
        'INVALID': [
          { date: '2024-01-01', open: 0, high: 0, low: 0, close: 0, volume: 0 },
          { date: '2024-01-02', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        ],
      };

      const result = await calculateCategoryValueHistory(
        transactions,
        priceHistoryWithZeros,
        'USD',
        { startDate: '2024-01-01', endDate: '2024-01-02' }
      );

      expect(result).toHaveLength(2);
      
      // Day 1: Only AAPL should be included, INVALID should be excluded due to zero prices
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].categories.tech).toBe(1020); // Only AAPL value (10 * 102)
      expect(result[0].categories.cash).toBe(-1250); // Reduced by both purchase amounts (1000 + 500)
      expect(result[0].totalValue).toBe(-230); // 1020 - 1250
      
      // Day 2: Same as day 1 since INVALID still has zero prices
      expect(result[1].date).toBe('2024-01-02');
      expect(result[1].categories.tech).toBe(1050); // Only AAPL value (10 * 105)
      expect(result[1].categories.cash).toBe(-1250);
      expect(result[1].totalValue).toBe(-200); // 1050 - 1250
    });

    it('should use most recent non-zero price when some prices are zero', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
      ];

      const priceHistoryWithMixedZeros = {
        AAPL: [
          { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
          { date: '2024-01-02', open: 0, high: 0, low: 0, close: 0, volume: 0 },
          { date: '2024-01-03', open: 0, high: 0, low: 0, close: 0, volume: 0 },
          { date: '2024-01-04', open: 110, high: 115, low: 105, close: 112, volume: 1200 },
        ],
      };

      const result = await calculateCategoryValueHistory(
        transactions,
        priceHistoryWithMixedZeros,
        'USD',
        { startDate: '2024-01-01', endDate: '2024-01-04' }
      );

      expect(result).toHaveLength(4);
      
      // Day 1: Use price from day 1
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].categories.tech).toBe(1020); // 10 * 102
      
      // Day 2: Use most recent non-zero price (from day 1)
      expect(result[1].date).toBe('2024-01-02');
      expect(result[1].categories.tech).toBe(1020); // Still 10 * 102 (most recent non-zero)
      
      // Day 3: Use most recent non-zero price (from day 1)
      expect(result[2].date).toBe('2024-01-03');
      expect(result[2].categories.tech).toBe(1020); // Still 10 * 102 (most recent non-zero)
      
      // Day 4: Use new price from day 4
      expect(result[3].date).toBe('2024-01-04');
      expect(result[3].categories.tech).toBe(1120); // 10 * 112
    });

    it('should maintain stable category curves when price data is missing', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
        {
          id: '2',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'SPY',
          quantity: 5,
          price: 400,
          currency: 'USD',
          market: 'NYSE',
        },
      ];

      const priceHistoryWithMissingData = {
        AAPL: [
          { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
          { date: '2024-01-02', open: 0, high: 0, low: 0, close: 0, volume: 0 },
          { date: '2024-01-03', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        ],
        SPY: [
          { date: '2024-01-01', open: 400, high: 410, low: 390, close: 405, volume: 500 },
          { date: '2024-01-02', open: 405, high: 415, low: 400, close: 410, volume: 600 },
          { date: '2024-01-03', open: 410, high: 420, low: 405, close: 415, volume: 700 },
        ],
      };

      const result = await calculateCategoryValueHistory(
        transactions,
        priceHistoryWithMissingData,
        'USD',
        { startDate: '2024-01-01', endDate: '2024-01-03' }
      );

      expect(result).toHaveLength(3);
      
      // Day 1: Both assets have valid prices
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].categories.tech).toBe(1020); // AAPL: 10 * 102
      expect(result[0].categories.etfs).toBe(2025); // SPY: 5 * 405
      
      // Day 2: AAPL uses most recent non-zero price, SPY uses current price
      expect(result[1].date).toBe('2024-01-02');
      expect(result[1].categories.tech).toBe(1020); // AAPL: still 10 * 102 (most recent non-zero)
      expect(result[1].categories.etfs).toBe(2050); // SPY: 5 * 410
      
      // Day 3: AAPL still uses most recent non-zero price, SPY uses current price
      expect(result[2].date).toBe('2024-01-03');
      expect(result[2].categories.tech).toBe(1020); // AAPL: still 10 * 102 (most recent non-zero)
      expect(result[2].categories.etfs).toBe(2075); // SPY: 5 * 415
      
      // Verify that the tech category remains stable (no drops to zero)
      expect(result[0].categories.tech).toBe(result[1].categories.tech);
      expect(result[1].categories.tech).toBe(result[2].categories.tech);
    });

    it('should handle assets with no price history', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 100,
          currency: 'USD',
          market: 'NASDAQ',
        },
        {
          id: '2',
          date: '2024-01-01',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'NODATA',
          quantity: 5,
          price: 50,
          currency: 'USD',
          market: 'NASDAQ',
        },
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory, // NODATA has no price history
        'USD',
        { startDate: '2024-01-01', endDate: '2024-01-02' }
      );

      expect(result).toHaveLength(2);
      
      // Only AAPL should be included, NODATA should be excluded due to no price history
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].categories.tech).toBe(1020); // Only AAPL value (10 * 102)
      expect(result[0].categories.cash).toBe(-1250); // Reduced by both purchase amounts (1000 + 500)
      expect(result[0].totalValue).toBe(-230); // 1020 - 1250
      
      expect(result[1].date).toBe('2024-01-02');
      expect(result[1].categories.tech).toBe(1050); // Only AAPL value (10 * 105)
      expect(result[1].categories.cash).toBe(-1250);
      expect(result[1].totalValue).toBe(-200); // 1050 - 1250
    });
  });
}); 