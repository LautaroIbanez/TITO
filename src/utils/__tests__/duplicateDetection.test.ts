import { detectDuplicates, filterDuplicates, consolidateDuplicates, areSameAsset } from '../duplicateDetection';
import { PortfolioPosition } from '@/types';

describe('duplicateDetection', () => {
  describe('detectDuplicates', () => {
    it('should detect no duplicates when positions are unique', () => {
      const positions: PortfolioPosition[] = [
        {
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Stock',
          symbol: 'GOOGL',
          quantity: 5,
          averagePrice: 200,
          currency: 'USD',
          market: 'NASDAQ'
        }
      ];

      const result = detectDuplicates(positions);
      expect(result.hasDuplicates).toBe(false);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should detect duplicates when same stock is held in different markets', () => {
      const positions: PortfolioPosition[] = [
        {
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Stock',
          symbol: 'AAPL.BA',
          quantity: 5,
          averagePrice: 150,
          currency: 'ARS',
          market: 'BCBA'
        }
      ];

      const result = detectDuplicates(positions);
      expect(result.hasDuplicates).toBe(true);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].baseTicker).toBe('AAPL');
      expect(result.duplicates[0].positions).toHaveLength(2);
      expect(result.warningMessage).toContain('1 grupo(s) de activos duplicados');
    });

    it('should detect duplicates for bonds', () => {
      const positions: PortfolioPosition[] = [
        {
          type: 'Bond',
          ticker: 'GD30',
          quantity: 100,
          averagePrice: 50,
          currency: 'USD'
        },
        {
          type: 'Bond',
          ticker: 'GD30.BA',
          quantity: 50,
          averagePrice: 75,
          currency: 'ARS'
        }
      ];

      const result = detectDuplicates(positions);
      expect(result.hasDuplicates).toBe(true);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].baseTicker).toBe('GD30');
    });

    it('should not detect duplicates for different asset types', () => {
      const positions: PortfolioPosition[] = [
        {
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Crypto',
          symbol: 'BTCUSDT',
          quantity: 0.1,
          averagePrice: 50000,
          currency: 'USD'
        }
      ];

      const result = detectDuplicates(positions);
      expect(result.hasDuplicates).toBe(false);
    });

    it('should detect duplicates for different currencies of same ticker', () => {
      const positions: PortfolioPosition[] = [
        {
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 5,
          averagePrice: 150,
          currency: 'ARS',
          market: 'BCBA'
        }
      ];

      const result = detectDuplicates(positions);
      expect(result.hasDuplicates).toBe(true); // Same ticker in different currencies IS considered duplicate
    });

    it('should handle multiple duplicate groups', () => {
      const positions: PortfolioPosition[] = [
        {
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Stock',
          symbol: 'AAPL.BA',
          quantity: 5,
          averagePrice: 150,
          currency: 'ARS',
          market: 'BCBA'
        },
        {
          type: 'Stock',
          symbol: 'GOOGL',
          quantity: 5,
          averagePrice: 200,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Stock',
          symbol: 'GOOGL.BA',
          quantity: 3,
          averagePrice: 250,
          currency: 'ARS',
          market: 'BCBA'
        }
      ];

      const result = detectDuplicates(positions);
      expect(result.hasDuplicates).toBe(true);
      expect(result.duplicates).toHaveLength(2);
      expect(result.warningMessage).toContain('2 grupo(s) de activos duplicados');
    });
  });

  describe('filterDuplicates', () => {
    it('should remove all duplicate positions', () => {
      const positions: PortfolioPosition[] = [
        {
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Stock',
          symbol: 'AAPL.BA',
          quantity: 5,
          averagePrice: 150,
          currency: 'ARS',
          market: 'BCBA'
        },
        {
          type: 'Stock',
          symbol: 'GOOGL',
          quantity: 5,
          averagePrice: 200,
          currency: 'USD',
          market: 'NASDAQ'
        }
      ];

      const filtered = filterDuplicates(positions);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('Stock');
      expect((filtered[0] as any).symbol).toBe('GOOGL');
    });

    it('should keep non-stock/bond positions', () => {
      const positions: PortfolioPosition[] = [
        {
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Stock',
          symbol: 'AAPL.BA',
          quantity: 5,
          averagePrice: 150,
          currency: 'ARS',
          market: 'BCBA'
        },
        {
          type: 'Crypto',
          symbol: 'BTCUSDT',
          quantity: 0.1,
          averagePrice: 50000,
          currency: 'USD'
        }
      ];

      const filtered = filterDuplicates(positions);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('Crypto');
    });
  });

  describe('consolidateDuplicates', () => {
    it('should keep the position with highest value', () => {
      const positions: PortfolioPosition[] = [
        {
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Stock',
          symbol: 'AAPL.BA',
          quantity: 5,
          averagePrice: 150,
          currency: 'ARS',
          market: 'BCBA'
        }
      ];

      const consolidated = consolidateDuplicates(positions);
      expect(consolidated).toHaveLength(1);
      expect(consolidated[0].type).toBe('Stock');
      expect((consolidated[0] as any).symbol).toBe('AAPL'); // Higher value: 10 * 100 = 1000 vs 5 * 150 = 750
    });
  });

  describe('areSameAsset', () => {
    it('should return true for same stock in different markets', () => {
      const pos1: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      };
      const pos2: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL.BA',
        quantity: 5,
        averagePrice: 150,
        currency: 'ARS',
        market: 'BCBA'
      };

      expect(areSameAsset(pos1, pos2)).toBe(true);
    });

    it('should return false for different asset types', () => {
      const pos1: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      };
      const pos2: PortfolioPosition = {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.1,
        averagePrice: 50000,
        currency: 'USD'
      };

      expect(areSameAsset(pos1, pos2)).toBe(false);
    });

    it('should return true for same ticker regardless of currency', () => {
      const pos1: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      };
      const pos2: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 5,
        averagePrice: 150,
        currency: 'ARS',
        market: 'BCBA'
      };

      expect(areSameAsset(pos1, pos2)).toBe(true); // Same ticker is considered same asset regardless of currency
    });
  });
}); 