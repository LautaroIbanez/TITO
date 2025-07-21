import { 
  getLatestPortfolioSnapshot, 
  normalizePortfolioHistory
} from '../portfolioHistoryClient';
import { loadAndNormalizePortfolioHistory } from '../portfolioHistory';
import type { DailyPortfolioRecord } from '../portfolioHistoryClient';

// Mock fs module
jest.mock('fs/promises');
const fs = require('fs/promises');

describe('portfolioHistory', () => {
  const mockRecords: DailyPortfolioRecord[] = [
    {
      fecha: '2024-01-01',
      total_portfolio_ars: 100000,
      total_portfolio_usd: 1000,
      capital_invertido_ars: 90000,
      capital_invertido_usd: 900,
      ganancias_netas_ars: 10000,
      ganancias_netas_usd: 100,
      efectivo_disponible_ars: 10000,
      efectivo_disponible_usd: 100,
    },
    {
      fecha: '2024-01-02',
      total_portfolio_ars: 110000,
      total_portfolio_usd: 1100,
      capital_invertido_ars: 90000,
      capital_invertido_usd: 900,
      ganancias_netas_ars: 20000,
      ganancias_netas_usd: 200,
      efectivo_disponible_ars: 20000,
      efectivo_disponible_usd: 200,
    },
  ];

  describe('getLatestPortfolioSnapshot', () => {
    it('returns the latest record from sorted history', () => {
      const result = getLatestPortfolioSnapshot(mockRecords);
      
      expect(result).toEqual(mockRecords[1]); // 2024-01-02 record
    });

    it('returns null for empty array', () => {
      const result = getLatestPortfolioSnapshot([]);
      
      expect(result).toBeNull();
    });

    it('returns null for null input', () => {
      const result = getLatestPortfolioSnapshot(null as any);
      
      expect(result).toBeNull();
    });

    it('sorts records by date before returning latest', () => {
      const unsortedRecords = [mockRecords[1], mockRecords[0]]; // Reverse order
      const result = getLatestPortfolioSnapshot(unsortedRecords);
      
      expect(result).toEqual(mockRecords[1]); // Should still return the latest (2024-01-02)
    });
  });

  describe('normalizePortfolioHistory', () => {
    it('corrects ganancias_netas_* values to match calculated values', () => {
      const recordsWithIncorrectGains: DailyPortfolioRecord[] = [
        {
          ...mockRecords[0],
          ganancias_netas_ars: 5000, // Incorrect: should be 10000
          ganancias_netas_usd: 50,   // Incorrect: should be 100
        },
        {
          ...mockRecords[1],
          ganancias_netas_ars: 15000, // Incorrect: should be 20000
          ganancias_netas_usd: 150,   // Incorrect: should be 200
        },
      ];
      
      const result = normalizePortfolioHistory(recordsWithIncorrectGains);
      
      expect(result[0].ganancias_netas_ars).toBe(10000); // 100000 - 90000
      expect(result[0].ganancias_netas_usd).toBe(100);   // 1000 - 900
      expect(result[1].ganancias_netas_ars).toBe(20000); // 110000 - 90000
      expect(result[1].ganancias_netas_usd).toBe(200);   // 1100 - 900
    });

    it('leaves records unchanged if gains are already correct', () => {
      const result = normalizePortfolioHistory(mockRecords);
      
      expect(result).toEqual(mockRecords);
    });

    it('handles negative gains correctly', () => {
      const negativeRecord: DailyPortfolioRecord = {
        fecha: '2024-01-03',
        total_portfolio_ars: 80000,
        total_portfolio_usd: 800,
        capital_invertido_ars: 90000,
        capital_invertido_usd: 900,
        ganancias_netas_ars: 0, // Incorrect: should be -10000
        ganancias_netas_usd: 0, // Incorrect: should be -100
        efectivo_disponible_ars: 0,
        efectivo_disponible_usd: 0,
      };
      
      const result = normalizePortfolioHistory([negativeRecord]);
      
      expect(result[0].ganancias_netas_ars).toBe(-10000); // 80000 - 90000
      expect(result[0].ganancias_netas_usd).toBe(-100);   // 800 - 900
    });

    it('returns empty array for empty input', () => {
      const result = normalizePortfolioHistory([]);
      
      expect(result).toEqual([]);
    });
  });

  describe('loadAndNormalizePortfolioHistory', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('loads and normalizes history, saving changes if needed', async () => {
      const mockFileContent = JSON.stringify([
        {
          ...mockRecords[0],
          ganancias_netas_ars: 5000, // Incorrect value
          ganancias_netas_usd: 50,   // Incorrect value
        },
        mockRecords[1], // Correct values
      ]);
      
      fs.readFile.mockResolvedValue(mockFileContent);
      fs.writeFile.mockResolvedValue(undefined);
      
      const result = await loadAndNormalizePortfolioHistory('testuser');
      
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('testuser.json'),
        'utf-8'
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('testuser.json'),
        expect.stringContaining('"ganancias_netas_ars": 10000')
      );
      
      expect(result).toHaveLength(2);
      expect(result[0].ganancias_netas_ars).toBe(10000);
      expect(result[0].ganancias_netas_usd).toBe(100);
      expect(result[1].ganancias_netas_ars).toBe(20000);
      expect(result[1].ganancias_netas_usd).toBe(200);
    });

    it('does not save file if no changes are needed', async () => {
      const mockFileContent = JSON.stringify(mockRecords);
      
      fs.readFile.mockResolvedValue(mockFileContent);
      fs.writeFile.mockResolvedValue(undefined);
      
      const result = await loadAndNormalizePortfolioHistory('testuser');
      
      expect(fs.readFile).toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
      
      expect(result).toEqual(mockRecords);
    });

    it('handles file read errors gracefully', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      const result = await loadAndNormalizePortfolioHistory('testuser');
      
      expect(result).toEqual([]);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('handles file write errors gracefully', async () => {
      const mockFileContent = JSON.stringify([
        {
          ...mockRecords[0],
          ganancias_netas_ars: 5000, // Incorrect value
        },
      ]);
      
      fs.readFile.mockResolvedValue(mockFileContent);
      fs.writeFile.mockRejectedValue(new Error('Write failed'));
      
      const result = await loadAndNormalizePortfolioHistory('testuser');
      
      expect(result).toHaveLength(1);
      expect(result[0].ganancias_netas_ars).toBe(10000); // Still normalized in memory
    });
  });
}); 