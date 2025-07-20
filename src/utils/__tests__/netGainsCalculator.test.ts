import { recalculateNetGains, recalculateNetGainsForRecords, getLatestNetGains } from '../netGainsCalculator';
import type { DailyPortfolioRecord } from '../portfolioHistory';

describe('netGainsCalculator', () => {
  const mockRecord: DailyPortfolioRecord = {
    fecha: '2024-01-01',
    total_portfolio_ars: 100000,
    total_portfolio_usd: 1000,
    capital_invertido_ars: 90000,
    capital_invertido_usd: 900,
    ganancias_netas_ars: 0,
    ganancias_netas_usd: 0,
    efectivo_disponible_ars: 10000,
    efectivo_disponible_usd: 100,
  };

  describe('recalculateNetGains', () => {
    it('calculates net gains correctly for a single record', () => {
      const result = recalculateNetGains(mockRecord);
      
      expect(result.ARS).toBe(10000); // 100000 - 90000
      expect(result.USD).toBe(100);   // 1000 - 900
    });

    it('handles negative gains correctly', () => {
      const negativeRecord: DailyPortfolioRecord = {
        ...mockRecord,
        total_portfolio_ars: 80000,
        total_portfolio_usd: 800,
      };
      
      const result = recalculateNetGains(negativeRecord);
      
      expect(result.ARS).toBe(-10000); // 80000 - 90000
      expect(result.USD).toBe(-100);   // 800 - 900
    });

    it('handles zero values correctly', () => {
      const zeroRecord: DailyPortfolioRecord = {
        ...mockRecord,
        total_portfolio_ars: 0,
        total_portfolio_usd: 0,
        capital_invertido_ars: 0,
        capital_invertido_usd: 0,
      };
      
      const result = recalculateNetGains(zeroRecord);
      
      expect(result.ARS).toBe(0);
      expect(result.USD).toBe(0);
    });
  });

  describe('recalculateNetGainsForRecords', () => {
    it('calculates net gains for multiple records', () => {
      const records: DailyPortfolioRecord[] = [
        { ...mockRecord, fecha: '2024-01-01' },
        { ...mockRecord, fecha: '2024-01-02', total_portfolio_ars: 110000, total_portfolio_usd: 1100 },
      ];
      
      const results = recalculateNetGainsForRecords(records);
      
      expect(results).toHaveLength(2);
      expect(results[0].ARS).toBe(10000);
      expect(results[0].USD).toBe(100);
      expect(results[1].ARS).toBe(20000); // 110000 - 90000
      expect(results[1].USD).toBe(200);   // 1100 - 900
    });

    it('returns empty array for empty input', () => {
      const results = recalculateNetGainsForRecords([]);
      
      expect(results).toEqual([]);
    });
  });

  describe('getLatestNetGains', () => {
    it('returns net gains for the latest record', () => {
      const records: DailyPortfolioRecord[] = [
        { ...mockRecord, fecha: '2024-01-01' },
        { ...mockRecord, fecha: '2024-01-02', total_portfolio_ars: 110000, total_portfolio_usd: 1100 },
      ];
      
      const result = getLatestNetGains(records);
      
      expect(result).toEqual({ ARS: 20000, USD: 200 });
    });

    it('returns null for empty array', () => {
      const result = getLatestNetGains([]);
      
      expect(result).toBeNull();
    });

    it('returns null for null input', () => {
      const result = getLatestNetGains(null as any);
      
      expect(result).toBeNull();
    });
  });
}); 