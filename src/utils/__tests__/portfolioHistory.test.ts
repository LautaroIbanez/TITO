import fs from 'fs';
import path from 'path';
import { appendDailyRecord, loadPortfolioHistory, DailyPortfolioRecord } from '../portfolioHistory';

// Mock fs module
jest.mock('fs');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('portfolioHistory', () => {
  const mockUsername = 'testuser';
  const mockRecord: DailyPortfolioRecord = {
    fecha: '2024-01-01',
    total_portfolio_ars: 100000,
    total_portfolio_usd: 2000,
    capital_invertido_ars: 80000,
    capital_invertido_usd: 1600,
    ganancias_netas_ars: 20000,
    ganancias_netas_usd: 400,
    efectivo_disponible_ars: 10000,
    efectivo_disponible_usd: 200,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.join.mockImplementation((...args) => args.join('/'));
    // Mock process.cwd to return a predictable path
    Object.defineProperty(process, 'cwd', {
      value: jest.fn(() => '/mock/path'),
      configurable: true
    });
  });

  describe('appendDailyRecord', () => {
    it('should create directory and file if they do not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      appendDailyRecord(mockUsername, mockRecord);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/mock/path/data/history', { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/path/data/history/testuser.json',
        JSON.stringify([mockRecord], null, 2)
      );
    });

    it('should append new record to existing history', () => {
      const existingHistory = [
        {
          fecha: '2023-12-31',
          total_portfolio_ars: 90000,
          total_portfolio_usd: 1800,
          capital_invertido_ars: 70000,
          capital_invertido_usd: 1400,
          ganancias_netas_ars: 20000,
          ganancias_netas_usd: 400,
          efectivo_disponible_ars: 9000,
          efectivo_disponible_usd: 180,
        },
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingHistory));

      appendDailyRecord(mockUsername, mockRecord);

      const expectedHistory = [...existingHistory, mockRecord];
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/path/data/history/testuser.json',
        JSON.stringify(expectedHistory, null, 2)
      );
    });

    it('should update existing record for the same date', () => {
      const existingHistory = [
        {
          fecha: '2024-01-01',
          total_portfolio_ars: 90000,
          total_portfolio_usd: 1800,
          capital_invertido_ars: 70000,
          capital_invertido_usd: 1400,
          ganancias_netas_ars: 20000,
          ganancias_netas_usd: 400,
          efectivo_disponible_ars: 9000,
          efectivo_disponible_usd: 180,
        },
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingHistory));

      appendDailyRecord(mockUsername, mockRecord);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/path/data/history/testuser.json',
        JSON.stringify([mockRecord], null, 2)
      );
    });

    it('should sort records by date', () => {
      const existingHistory = [
        {
          fecha: '2024-01-02',
          total_portfolio_ars: 110000,
          total_portfolio_usd: 2200,
          capital_invertido_ars: 90000,
          capital_invertido_usd: 1800,
          ganancias_netas_ars: 20000,
          ganancias_netas_usd: 400,
          efectivo_disponible_ars: 11000,
          efectivo_disponible_usd: 220,
        },
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingHistory));

      appendDailyRecord(mockUsername, mockRecord);

      const expectedHistory = [mockRecord, ...existingHistory];
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/path/data/history/testuser.json',
        JSON.stringify(expectedHistory, null, 2)
      );
    });

    it('should handle errors gracefully', () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw
      expect(() => appendDailyRecord(mockUsername, mockRecord)).not.toThrow();
    });
  });

  describe('loadPortfolioHistory', () => {
    it('should return empty array if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = loadPortfolioHistory(mockUsername);

      expect(result).toEqual([]);
    });

    it('should load and parse existing history', () => {
      const existingHistory = [
        {
          fecha: '2024-01-01',
          total_portfolio_ars: 100000,
          total_portfolio_usd: 2000,
          capital_invertido_ars: 80000,
          capital_invertido_usd: 1600,
          ganancias_netas_ars: 20000,
          ganancias_netas_usd: 400,
          efectivo_disponible_ars: 10000,
          efectivo_disponible_usd: 200,
        },
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingHistory));

      const result = loadPortfolioHistory(mockUsername);

      expect(result).toEqual(existingHistory);
    });

    it('should handle errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const result = loadPortfolioHistory(mockUsername);

      expect(result).toEqual([]);
    });
  });
}); 