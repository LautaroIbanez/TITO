import { getPortfolioData } from '../portfolioData';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

describe('portfolioData', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPortfolioData', () => {
    it('should optimize fundamentals loading by using base ticker mapping', async () => {
      // Mock user data with AAPL and AAPL.BA positions
      const mockUserData = {
        positions: [
          { type: 'Stock', symbol: 'AAPL', quantity: 10, averagePrice: 150, currency: 'USD', market: 'NASDAQ' },
          { type: 'Stock', symbol: 'AAPL.BA', quantity: 5, averagePrice: 150000, currency: 'ARS', market: 'BCBA' },
        ],
        transactions: [],
        cash: { ARS: 0, USD: 0 },
        goals: [],
        profile: null,
      };

      mockFs.readFile.mockImplementation((filePath: any, _options?: any) => {
        if (filePath.includes('users/testuser.json')) {
          return Promise.resolve(JSON.stringify(mockUserData));
        }
        if (filePath.includes('stocks/AAPL.json')) {
          return Promise.resolve(JSON.stringify([{ date: '2024-01-01', close: 150 }]));
        }
        if (filePath.includes('stocks/AAPL.BA.json')) {
          return Promise.resolve(JSON.stringify([{ date: '2024-01-01', close: 150000 }]));
        }
        if (filePath.includes('fundamentals/AAPL.json')) {
          return Promise.resolve(JSON.stringify({ peRatio: 25, roe: 15 }));
        }
        if (filePath.includes('technicals/AAPL.json')) {
          return Promise.resolve(JSON.stringify({ rsi: 50, macd: 0.1 }));
        }
        if (filePath.includes('technicals/AAPL.BA.json')) {
          return Promise.resolve(JSON.stringify({ rsi: 55, macd: 0.2 }));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await getPortfolioData('testuser');

      // Verify that fundamentals were loaded only once for the base ticker
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('data/fundamentals/AAPL.json'),
        'utf-8'
      );

      // Verify that both symbols have the same fundamentals data
      expect(result.fundamentals['AAPL']).toEqual({ peRatio: 25, roe: 15 });
      expect(result.fundamentals['AAPL.BA']).toEqual({ peRatio: 25, roe: 15 });

      // Verify that prices and technicals were loaded for each symbol
      expect(result.historicalPrices['AAPL']).toEqual([{ date: '2024-01-01', close: 150 }]);
      expect(result.historicalPrices['AAPL.BA']).toEqual([{ date: '2024-01-01', close: 150000 }]);
      expect(result.technicals['AAPL']).toEqual({ rsi: 50, macd: 0.1 });
      expect(result.technicals['AAPL.BA']).toEqual({ rsi: 55, macd: 0.2 });
    });

    it('should handle crypto positions without base ticker optimization', async () => {
      // Mock user data with crypto positions
      const mockUserData = {
        positions: [
          { type: 'Crypto', symbol: 'BTCUSDT', quantity: 0.1, averagePrice: 50000, currency: 'USD' },
        ],
        transactions: [],
        cash: { ARS: 0, USD: 0 },
        goals: [],
        profile: null,
      };

      mockFs.readFile.mockImplementation((filePath: any, _options?: any) => {
        if (filePath.includes('users/testuser.json')) {
          return Promise.resolve(JSON.stringify(mockUserData));
        }
        if (filePath.includes('crypto/BTCUSDT.json')) {
          return Promise.resolve(JSON.stringify([{ date: '2024-01-01', close: 50000 }]));
        }
        if (filePath.includes('fundamentals/BTCUSDT.json')) {
          return Promise.resolve(JSON.stringify({ marketCap: 1000000000 }));
        }
        if (filePath.includes('crypto-technicals/BTCUSDT.json')) {
          return Promise.resolve(JSON.stringify({ rsi: 60, macd: 0.3 }));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await getPortfolioData('testuser');

      // Verify that crypto fundamentals were loaded normally
      expect(result.fundamentals['BTCUSDT']).toEqual({ marketCap: 1000000000 });
      expect(result.historicalPrices['BTCUSDT']).toEqual([{ date: '2024-01-01', close: 50000 }]);
      expect(result.technicals['BTCUSDT']).toEqual({ rsi: 60, macd: 0.3 });
    });

    it('should handle missing files gracefully', async () => {
      // Mock user data
      const mockUserData = {
        positions: [
          { type: 'Stock', symbol: 'AAPL', quantity: 10, averagePrice: 150, currency: 'USD', market: 'NASDAQ' },
        ],
        transactions: [],
        cash: { ARS: 0, USD: 0 },
        goals: [],
        profile: null,
      };

      mockFs.readFile.mockImplementation((filePath: any, _options?: any) => {
        if (filePath.includes('users/testuser.json')) {
          return Promise.resolve(JSON.stringify(mockUserData));
        }
        if (filePath.includes('stocks/AAPL.json')) {
          return Promise.resolve(JSON.stringify([{ date: '2024-01-01', close: 150 }]));
        }
        if (filePath.includes('fundamentals/AAPL.json')) {
          return Promise.reject(new Error('File not found'));
        }
        if (filePath.includes('technicals/AAPL.json')) {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await getPortfolioData('testuser');

      // Verify that missing files are handled gracefully
      expect(result.fundamentals['AAPL']).toBeNull();
      expect(result.technicals['AAPL']).toBeNull();
      expect(result.historicalPrices['AAPL']).toEqual([{ date: '2024-01-01', close: 150 }]);
    });

    it('should include deposit transactions for initial balances', async () => {
      const mockUserData = {
        positions: [],
        transactions: [
          { id: 'deposit-ARS-initial', date: '2024-06-01', type: 'Deposit', amount: 10000, currency: 'ARS' },
          { id: 'deposit-USD-initial', date: '2024-06-01', type: 'Deposit', amount: 500, currency: 'USD' },
        ],
        cash: { ARS: 10000, USD: 500 },
        goals: [],
        profile: { initialBalanceARS: 10000, initialBalanceUSD: 500 },
      };

      mockFs.readFile.mockImplementation((filePath: any, _options?: any) => {
        if (filePath.includes('users/testuser.json')) {
          return Promise.resolve(JSON.stringify(mockUserData));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await getPortfolioData('testuser');
      const depositARS = result.transactions.find((tx: any) => tx.type === 'Deposit' && tx.currency === 'ARS');
      const depositUSD = result.transactions.find((tx: any) => tx.type === 'Deposit' && tx.currency === 'USD');
      expect(depositARS).toBeDefined();
      if (depositARS) expect((depositARS as any).amount).toBe(10000);
      expect(depositUSD).toBeDefined();
      if (depositUSD) expect((depositUSD as any).amount).toBe(500);
    });

    it('should remove matured fixed-term deposits after creating credit transactions', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago
      
      const mockUserData = {
        positions: [
          {
            type: 'FixedTermDeposit',
            id: 'deposit-1',
            provider: 'Test Bank',
            amount: 100000,
            annualRate: 120,
            startDate: '2024-01-01',
            maturityDate: pastDate.toISOString().split('T')[0],
            currency: 'ARS'
          },
          {
            type: 'Stock',
            symbol: 'AAPL',
            quantity: 10,
            averagePrice: 150,
            currency: 'USD',
            market: 'NASDAQ'
          }
        ],
        transactions: [],
        cash: { ARS: 0, USD: 0 },
        goals: [],
        profile: null,
      };

      mockFs.readFile.mockImplementation((filePath: any, _options?: any) => {
        if (filePath.includes('users/testuser.json')) {
          return Promise.resolve(JSON.stringify(mockUserData));
        }
        if (filePath.includes('stocks/AAPL.json')) {
          return Promise.resolve(JSON.stringify([{ date: '2024-01-01', close: 150 }]));
        }
        if (filePath.includes('fundamentals/AAPL.json')) {
          return Promise.resolve(JSON.stringify({ peRatio: 25 }));
        }
        if (filePath.includes('technicals/AAPL.json')) {
          return Promise.resolve(JSON.stringify({ rsi: 50 }));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await getPortfolioData('testuser');
      
      // Verify that the matured deposit was removed
      expect(result.positions.length).toBe(1);
      expect(result.positions[0].type).toBe('Stock');
      
      // Verify that a credit transaction was created
      const creditTransaction = result.transactions.find((tx: any) => 
        tx.type === 'Acreditación Plazo Fijo' && tx.depositId === 'deposit-1'
      );
      expect(creditTransaction).toBeDefined();
      
      // Verify that cash was increased
      expect(result.cash.ARS).toBeGreaterThan(0);
    });

    it('should remove matured cauciones after creating credit transactions', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago
      
      const mockUserData = {
        positions: [
          {
            type: 'Caucion',
            id: 'caucion-1',
            provider: 'BYMA',
            amount: 50000,
            annualRate: 110,
            startDate: '2024-01-01',
            maturityDate: pastDate.toISOString().split('T')[0],
            currency: 'ARS',
            term: 30
          },
          {
            type: 'Bond',
            ticker: 'TEST-BOND',
            quantity: 100,
            averagePrice: 1000,
            currency: 'ARS'
          }
        ],
        transactions: [],
        cash: { ARS: 0, USD: 0 },
        goals: [],
        profile: null,
      };

      mockFs.readFile.mockImplementation((filePath: any, _options?: any) => {
        if (filePath.includes('users/testuser.json')) {
          return Promise.resolve(JSON.stringify(mockUserData));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await getPortfolioData('testuser');
      
      // Verify that the matured caucion was removed
      expect(result.positions.length).toBe(1);
      expect(result.positions[0].type).toBe('Bond');
      
      // Verify that a credit transaction was created
      const creditTransaction = result.transactions.find((tx: any) => 
        tx.type === 'Acreditación Caución' && tx.caucionId === 'caucion-1'
      );
      expect(creditTransaction).toBeDefined();
      
      // Verify that cash was increased
      expect(result.cash.ARS).toBeGreaterThan(0);
    });

    it('should not remove positions that have not matured yet', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10); // 10 days in the future
      
      const mockUserData = {
        positions: [
          {
            type: 'FixedTermDeposit',
            id: 'deposit-1',
            provider: 'Test Bank',
            amount: 100000,
            annualRate: 120,
            startDate: '2024-01-01',
            maturityDate: futureDate.toISOString().split('T')[0],
            currency: 'ARS'
          }
        ],
        transactions: [],
        cash: { ARS: 0, USD: 0 },
        goals: [],
        profile: null,
      };

      mockFs.readFile.mockImplementation((filePath: any, _options?: any) => {
        if (filePath.includes('users/testuser.json')) {
          return Promise.resolve(JSON.stringify(mockUserData));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await getPortfolioData('testuser');
      
      // Verify that the position was not removed
      expect(result.positions.length).toBe(1);
      expect(result.positions[0].type).toBe('FixedTermDeposit');
      
      // Verify that no credit transaction was created
      const creditTransaction = result.transactions.find((tx: any) => 
        tx.type === 'Acreditación Plazo Fijo'
      );
      expect(creditTransaction).toBeUndefined();
      
      // Verify that cash was not increased
      expect(result.cash.ARS).toBe(0);
    });

    it('should not create duplicate credit transactions for already credited positions', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago
      
      const mockUserData = {
        positions: [
          {
            type: 'FixedTermDeposit',
            id: 'deposit-1',
            provider: 'Test Bank',
            amount: 100000,
            annualRate: 120,
            startDate: '2024-01-01',
            maturityDate: pastDate.toISOString().split('T')[0],
            currency: 'ARS'
          }
        ],
        transactions: [
          {
            id: 'ftd-credit-deposit-1',
            date: pastDate.toISOString().split('T')[0],
            type: 'Acreditación Plazo Fijo',
            assetType: 'FixedTermDeposit',
            provider: 'Test Bank',
            amount: 103287.67, // principal + interest
            principal: 100000,
            interest: 3287.67,
            currency: 'ARS',
            depositId: 'deposit-1',
          }
        ],
        cash: { ARS: 103287.67, USD: 0 },
        goals: [],
        profile: null,
      };

      mockFs.readFile.mockImplementation((filePath: any, _options?: any) => {
        if (filePath.includes('users/testuser.json')) {
          return Promise.resolve(JSON.stringify(mockUserData));
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await getPortfolioData('testuser');
      
      // Verify that the position was removed (already credited)
      expect(result.positions.length).toBe(0);
      
      // Verify that no additional credit transaction was created
      const creditTransactions = result.transactions.filter((tx: any) => 
        tx.type === 'Acreditación Plazo Fijo' && tx.depositId === 'deposit-1'
      );
      expect(creditTransactions.length).toBe(1);
      
      // Verify that cash was not increased again
      expect(result.cash.ARS).toBe(103287.67);
    });
  });
}); 