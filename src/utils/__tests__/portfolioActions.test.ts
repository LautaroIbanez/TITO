import { addDeposit, buyAsset, sellAsset } from '../portfolioActions';
import { getUserData } from '../userData';
import { UserData, StockPosition, BondPosition, CryptoPosition } from '@/types';

// Mock the userData module
jest.mock('../userData');
const mockGetUserData = getUserData as jest.MockedFunction<typeof getUserData>;

// Mock the saveUserData function (it's called internally by the functions we're testing)
jest.mock('../userData', () => ({
  getUserData: jest.fn(),
  saveUserData: jest.fn().mockResolvedValue(undefined),
}));

describe('portfolioActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addDeposit', () => {
    it('should add a deposit and update cash balance', async () => {
      const mockUser = {
        username: 'testuser',
        cash: { ARS: 1000, USD: 50 },
        transactions: [],
        positions: [],
        goals: [],
        createdAt: '2023-01-01',
        profileCompleted: false,
      };

      mockGetUserData.mockResolvedValue(mockUser);

      const result = await addDeposit('testuser', 500, '2023-01-02', 'ARS');

      expect(result.deposit).toEqual({
        id: expect.stringMatching(/^dep_\d+$/),
        date: '2023-01-02',
        type: 'Deposit',
        amount: 500,
        currency: 'ARS',
      });
      expect(result.cash).toEqual({ ARS: 1500, USD: 50 });
    });

    it('should throw error if user not found', async () => {
      mockGetUserData.mockResolvedValue(null);

      await expect(addDeposit('nonexistent', 100, '2023-01-01', 'USD'))
        .rejects.toThrow('User not found');
    });
  });

  describe('buyAsset', () => {
    it('should buy stock and update position', async () => {
      const mockUser = {
        username: 'testuser',
        cash: { ARS: 10000, USD: 1000 },
        transactions: [],
        positions: [],
        goals: [],
        createdAt: '2023-01-01',
        profileCompleted: false,
      };

      mockGetUserData.mockResolvedValue(mockUser);

      const result = await buyAsset('testuser', 'Stock', {
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        currency: 'USD',
        market: 'NASDAQ',
      });

      expect(result.positions).toHaveLength(1);
      expect(result.positions[0]).toEqual({
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: expect.any(Number),
        currency: 'USD',
        market: 'NASDAQ',
      });
      expect(result.cash.USD).toBeLessThan(1000); // Should be reduced by purchase cost
    });

    it('should buy crypto and always store in USD', async () => {
      const mockUser = {
        username: 'testuser',
        cash: { ARS: 10000, USD: 1000 },
        transactions: [],
        positions: [],
        goals: [],
        createdAt: '2023-01-01',
        profileCompleted: false,
      };

      mockGetUserData.mockResolvedValue(mockUser);

      const result = await buyAsset('testuser', 'Crypto', {
        symbol: 'BTCUSDT',
        quantity: 0.1,
        price: 50000,
        currency: 'USD',
      });

      expect(result.positions).toHaveLength(1);
      expect(result.positions[0]).toEqual({
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.1,
        averagePrice: expect.any(Number),
        currency: 'USD',
      });
    });
  });

  describe('sellAsset', () => {
    it('should sell stock and add proceeds to correct currency', async () => {
      const mockUser = {
        username: 'testuser',
        cash: { ARS: 1000, USD: 100 },
        transactions: [],
        positions: [{
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 150,
          currency: 'USD',
          market: 'NASDAQ',
        }],
        goals: [],
        createdAt: '2023-01-01',
        profileCompleted: false,
      };

      mockGetUserData.mockResolvedValue(mockUser);

      const result = await sellAsset('testuser', 'Stock', {
        symbol: 'AAPL',
        quantity: 5,
        price: 160,
        currency: 'USD',
        market: 'NASDAQ',
      });

      expect(result.positions[0].quantity).toBe(5);
      expect(result.cash.USD).toBeGreaterThan(100); // Should be increased by sale proceeds
      expect(result.cash.ARS).toBe(1000); // Should remain unchanged
    });

    it('should sell crypto and always add proceeds to USD', async () => {
      const mockUser = {
        username: 'testuser',
        cash: { ARS: 1000, USD: 100 },
        transactions: [],
        positions: [{
          type: 'Crypto',
          symbol: 'BTCUSDT',
          quantity: 0.1,
          averagePrice: 50000,
          currency: 'USD',
        }],
        goals: [],
        createdAt: '2023-01-01',
        profileCompleted: false,
      };

      mockGetUserData.mockResolvedValue(mockUser);

      const result = await sellAsset('testuser', 'Crypto', {
        symbol: 'BTCUSDT',
        quantity: 0.05,
        price: 55000,
        // Note: currency is not specified for crypto, but proceeds should go to USD
      });

      expect(result.positions[0].quantity).toBe(0.05);
      expect(result.cash.USD).toBeGreaterThan(100); // Should be increased by sale proceeds
      expect(result.cash.ARS).toBe(1000); // Should remain unchanged
    });

    it('should sell crypto and add proceeds to USD even when ARS is specified in body', async () => {
      const mockUser = {
        username: 'testuser',
        cash: { ARS: 1000, USD: 100 },
        transactions: [],
        positions: [{
          type: 'Crypto',
          symbol: 'BTCUSDT',
          quantity: 0.1,
          averagePrice: 50000,
          currency: 'USD',
        }],
        goals: [],
        createdAt: '2023-01-01',
        profileCompleted: false,
      };

      mockGetUserData.mockResolvedValue(mockUser);

      const result = await sellAsset('testuser', 'Crypto', {
        symbol: 'BTCUSDT',
        quantity: 0.05,
        price: 55000,
        currency: 'ARS', // This should be ignored for crypto
      });

      expect(result.positions[0].quantity).toBe(0.05);
      expect(result.cash.USD).toBeGreaterThan(100); // Should be increased by sale proceeds
      expect(result.cash.ARS).toBe(1000); // Should remain unchanged (not increased)
    });

    it('should sell bond and add proceeds to correct currency', async () => {
      const mockUser = {
        username: 'testuser',
        cash: { ARS: 1000, USD: 100 },
        transactions: [],
        positions: [{
          type: 'Bond',
          ticker: 'BONAR24',
          quantity: 100,
          averagePrice: 100,
          currency: 'ARS',
        }],
        goals: [],
        createdAt: '2023-01-01',
        profileCompleted: false,
      };

      mockGetUserData.mockResolvedValue(mockUser);

      const result = await sellAsset('testuser', 'Bond', {
        ticker: 'BONAR24',
        quantity: 50,
        price: 105,
        currency: 'ARS',
      });

      expect(result.positions[0].quantity).toBe(50);
      expect(result.cash.ARS).toBeGreaterThan(1000); // Should be increased by sale proceeds
      expect(result.cash.USD).toBe(100); // Should remain unchanged
    });

    it('should throw error if position not found', async () => {
      const mockUser = {
        username: 'testuser',
        cash: { ARS: 1000, USD: 100 },
        transactions: [],
        positions: [],
        goals: [],
        createdAt: '2023-01-01',
        profileCompleted: false,
      };

      mockGetUserData.mockResolvedValue(mockUser);

      await expect(sellAsset('testuser', 'Stock', {
        symbol: 'AAPL',
        quantity: 5,
        price: 160,
        currency: 'USD',
        market: 'NASDAQ',
      })).rejects.toThrow('Position not found');
    });

    it('should throw error if insufficient quantity', async () => {
      const mockUser = {
        username: 'testuser',
        cash: { ARS: 1000, USD: 100 },
        transactions: [],
        positions: [{
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 150,
          currency: 'USD',
          market: 'NASDAQ',
        }],
        goals: [],
        createdAt: '2023-01-01',
        profileCompleted: false,
      };

      mockGetUserData.mockResolvedValue(mockUser);

      await expect(sellAsset('testuser', 'Stock', {
        symbol: 'AAPL',
        quantity: 15, // More than available
        price: 160,
        currency: 'USD',
        market: 'NASDAQ',
      })).rejects.toThrow('Insufficient quantity');
    });
  });
}); 