import { generatePriceDataHash, generatePortfolioHash } from '../priceDataHash';

describe('priceDataHash', () => {
  describe('generatePriceDataHash', () => {
    it('should return "empty" for empty or null historical prices', () => {
      expect(generatePriceDataHash({})).toBe('empty');
      expect(generatePriceDataHash(null as any)).toBe('empty');
      expect(generatePriceDataHash(undefined as any)).toBe('empty');
    });

    it('should generate consistent hashes for the same price data', () => {
      const historicalPrices = {
        'AAPL': [
          { date: '2024-01-01', close: 150, open: 148, high: 152, low: 147, volume: 1000 },
          { date: '2024-01-02', close: 155, open: 150, high: 156, low: 149, volume: 1200 }
        ],
        'GOOGL': [
          { date: '2024-01-01', close: 2800, open: 2780, high: 2820, low: 2770, volume: 500 }
        ]
      };

      const hash1 = generatePriceDataHash(historicalPrices);
      const hash2 = generatePriceDataHash(historicalPrices);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1).not.toBe('empty');
    });

    it('should generate different hashes for different price data', () => {
      const prices1 = {
        'AAPL': [
          { date: '2024-01-01', close: 150, open: 148, high: 152, low: 147, volume: 1000 }
        ]
      };

      const prices2 = {
        'AAPL': [
          { date: '2024-01-01', close: 160, open: 158, high: 162, low: 157, volume: 1000 }
        ]
      };

      const hash1 = generatePriceDataHash(prices1);
      const hash2 = generatePriceDataHash(prices2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should detect changes in price data structure', () => {
      const prices1 = {
        'AAPL': [
          { date: '2024-01-01', close: 150, open: 148, high: 152, low: 147, volume: 1000 }
        ]
      };

      const prices2 = {
        'AAPL': [
          { date: '2024-01-01', close: 150, open: 148, high: 152, low: 147, volume: 1000 }
        ],
        'GOOGL': [
          { date: '2024-01-01', close: 2800, open: 2780, high: 2820, low: 2770, volume: 500 }
        ]
      };

      const hash1 = generatePriceDataHash(prices1);
      const hash2 = generatePriceDataHash(prices2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty price arrays', () => {
      const historicalPrices = {
        'AAPL': [],
        'GOOGL': [
          { date: '2024-01-01', close: 2800, open: 2780, high: 2820, low: 2770, volume: 500 }
        ]
      };

      const hash = generatePriceDataHash(historicalPrices);
      expect(hash).not.toBe('empty');
      expect(typeof hash).toBe('string');
    });

    it('should be sensitive to the last price and date', () => {
      const prices1 = {
        'AAPL': [
          { date: '2024-01-01', close: 150, open: 148, high: 152, low: 147, volume: 1000 },
          { date: '2024-01-02', close: 155, open: 150, high: 156, low: 149, volume: 1200 }
        ]
      };

      const prices2 = {
        'AAPL': [
          { date: '2024-01-01', close: 150, open: 148, high: 152, low: 147, volume: 1000 },
          { date: '2024-01-02', close: 155, open: 150, high: 156, low: 149, volume: 1200 },
          { date: '2024-01-03', close: 160, open: 155, high: 161, low: 154, volume: 1100 }
        ]
      };

      const hash1 = generatePriceDataHash(prices1);
      const hash2 = generatePriceDataHash(prices2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generatePortfolioHash', () => {
    it('should combine portfolio version and price data hash', () => {
      const portfolioVersion = 5;
      const historicalPrices = {
        'AAPL': [
          { date: '2024-01-01', close: 150, open: 148, high: 152, low: 147, volume: 1000 }
        ]
      };

      const hash = generatePortfolioHash(portfolioVersion, historicalPrices);
      
      expect(hash).toContain('5-');
      expect(hash.split('-')[0]).toBe('5');
      expect(hash.split('-').length).toBeGreaterThanOrEqual(2);
    });

    it('should change when portfolio version changes', () => {
      const historicalPrices = {
        'AAPL': [
          { date: '2024-01-01', close: 150, open: 148, high: 152, low: 147, volume: 1000 }
        ]
      };

      const hash1 = generatePortfolioHash(1, historicalPrices);
      const hash2 = generatePortfolioHash(2, historicalPrices);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should change when price data changes', () => {
      const portfolioVersion = 1;
      const prices1 = {
        'AAPL': [
          { date: '2024-01-01', close: 150, open: 148, high: 152, low: 147, volume: 1000 }
        ]
      };

      const prices2 = {
        'AAPL': [
          { date: '2024-01-01', close: 160, open: 158, high: 162, low: 157, volume: 1000 }
        ]
      };

      const hash1 = generatePortfolioHash(portfolioVersion, prices1);
      const hash2 = generatePortfolioHash(portfolioVersion, prices2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty price data', () => {
      const portfolioVersion = 1;
      const hash = generatePortfolioHash(portfolioVersion, {});
      
      expect(hash).toBe('1-empty');
    });
  });
}); 