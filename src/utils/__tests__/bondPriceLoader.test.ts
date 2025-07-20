import { getBondPriceFromCache, getBondPriceFromJson } from '../calculatePortfolioValue';

// Mock fs and path for server-side testing
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
}));

describe('Bond Price Loading', () => {
  const mockFs = require('fs');
  const mockPath = require('path');

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the cache by directly accessing the module's cache
    const calculatePortfolioValue = require('../calculatePortfolioValue');
    // Clear the cache by setting it to empty array
    (calculatePortfolioValue as any).bondPricesCache = [];
    (calculatePortfolioValue as any).bondPricesCacheTimestamp = 0;
  });

  describe('getBondPriceFromCache', () => {
    it('should return undefined when cache is empty and no bonds.json file exists', () => {
      mockPath.join.mockReturnValue('/fake/path/bonds.json');
      mockFs.existsSync.mockReturnValue(false);

      const result = getBondPriceFromCache('YCA6P', 'ARS');
      expect(result).toBeUndefined();
    });

    it('should return bond price from bonds.json when cache is empty', () => {
      const mockBondsData = {
        bonds: [
          { ticker: 'YCA6P', price: 150.50, currency: 'ARS' },
          { ticker: 'GD30', price: 200.75, currency: 'ARS' }
        ]
      };

      mockPath.join.mockReturnValue('/fake/path/bonds.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockBondsData));

      const result = getBondPriceFromCache('YCA6P', 'ARS');
      expect(result).toBe(150.50);
    });

    it('should return bond price from cache when available', () => {
      // Manually set cache
      (global as any).bondPricesCache = [
        { ticker: 'YCA6P', price: 150.50, currency: 'ARS' }
      ];
      (global as any).bondPricesCacheTimestamp = Date.now();

      const result = getBondPriceFromCache('YCA6P', 'ARS');
      expect(result).toBe(150.50);
    });

    it('should return undefined for non-existent bond', () => {
      const mockBondsData = {
        bonds: [
          { ticker: 'GD30', price: 200.75, currency: 'ARS' }
        ]
      };

      mockPath.join.mockReturnValue('/fake/path/bonds.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockBondsData));

      const result = getBondPriceFromCache('NONEXISTENT', 'ARS');
      expect(result).toBeUndefined();
    });

    it('should handle old format bonds.json (array instead of object)', () => {
      const mockBondsData = [
        { ticker: 'YCA6P', price: 150.50, currency: 'ARS' },
        { ticker: 'GD30', price: 200.75, currency: 'ARS' }
      ];

      mockPath.join.mockReturnValue('/fake/path/bonds.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockBondsData));

      const result = getBondPriceFromCache('YCA6P', 'ARS');
      expect(result).toBe(150.50);
    });

    it('should handle JSON parsing errors gracefully', () => {
      mockPath.join.mockReturnValue('/fake/path/bonds.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = getBondPriceFromCache('YCA6P', 'ARS');
      
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load bond price synchronously:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle file system errors gracefully', () => {
      mockPath.join.mockReturnValue('/fake/path/bonds.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = getBondPriceFromCache('YCA6P', 'ARS');
      
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load bond price synchronously:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('getBondPriceFromJson', () => {
    it('should return bond price from API in client environment', async () => {
      // Mock fetch for client environment
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          bonds: [
            { ticker: 'YCA6P', price: 150.50, currency: 'ARS' }
          ]
        })
      });

      const result = await getBondPriceFromJson('YCA6P', 'ARS');
      expect(result).toBe(150.50);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await getBondPriceFromJson('YCA6P', 'ARS');
      
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load bond prices:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
}); 