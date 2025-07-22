import { 
  calculateCumulativeNetGains, 
  getLatestCumulativeNetGains,
  calculateNetGainsForDateRange,
  recalculateNetGainsForRecords
} from '../netGainsCalculator';
import type { DailyPortfolioRecord } from '../portfolioHistoryClient';

describe('netGainsCalculator', () => {
  describe('calculateCumulativeNetGains', () => {
    it('should return zero gains for empty records', () => {
      const result = calculateCumulativeNetGains([]);
      
      expect(result.cumulativeARS).toBe(0);
      expect(result.cumulativeUSD).toBe(0);
      expect(result.dailyGains).toEqual([]);
    });

    it('should return zero gains for single record', () => {
      const records: DailyPortfolioRecord[] = [{
        fecha: '2024-01-01',
        total_portfolio_ars: 1000,
        total_portfolio_usd: 100,
        capital_invertido_ars: 800,
        capital_invertido_usd: 80,
        ganancias_netas_ars: 0,
        ganancias_netas_usd: 0,
        efectivo_disponible_ars: 200,
        efectivo_disponible_usd: 20
      }];

      const result = calculateCumulativeNetGains(records);
      
      expect(result.cumulativeARS).toBe(0);
      expect(result.cumulativeUSD).toBe(0);
      expect(result.dailyGains).toEqual([{
        date: '2024-01-01',
        gainARS: 0,
        gainUSD: 0
      }]);
    });

    it('should calculate cumulative gains from daily differences', () => {
      const records: DailyPortfolioRecord[] = [
        {
          fecha: '2024-01-01',
          total_portfolio_ars: 1000,
          total_portfolio_usd: 100,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 0,
          ganancias_netas_usd: 0,
          efectivo_disponible_ars: 200,
          efectivo_disponible_usd: 20
        },
        {
          fecha: '2024-01-02',
          total_portfolio_ars: 1050,
          total_portfolio_usd: 105,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 50,
          ganancias_netas_usd: 5,
          efectivo_disponible_ars: 250,
          efectivo_disponible_usd: 25
        },
        {
          fecha: '2024-01-03',
          total_portfolio_ars: 1100,
          total_portfolio_usd: 110,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 100,
          ganancias_netas_usd: 10,
          efectivo_disponible_ars: 300,
          efectivo_disponible_usd: 30
        }
      ];

      const result = calculateCumulativeNetGains(records);
      
      expect(result.cumulativeARS).toBe(100); // 50 + 50
      expect(result.cumulativeUSD).toBe(10); // 5 + 5
      expect(result.dailyGains).toEqual([
        { date: '2024-01-02', gainARS: 50, gainUSD: 5 },
        { date: '2024-01-03', gainARS: 50, gainUSD: 5 }
      ]);
    });

    it('should handle negative daily gains', () => {
      const records: DailyPortfolioRecord[] = [
        {
          fecha: '2024-01-01',
          total_portfolio_ars: 1000,
          total_portfolio_usd: 100,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 0,
          ganancias_netas_usd: 0,
          efectivo_disponible_ars: 200,
          efectivo_disponible_usd: 20
        },
        {
          fecha: '2024-01-02',
          total_portfolio_ars: 950,
          total_portfolio_usd: 95,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: -50,
          ganancias_netas_usd: -5,
          efectivo_disponible_ars: 150,
          efectivo_disponible_usd: 15
        }
      ];

      const result = calculateCumulativeNetGains(records);
      
      expect(result.cumulativeARS).toBe(-50);
      expect(result.cumulativeUSD).toBe(-5);
      expect(result.dailyGains).toEqual([
        { date: '2024-01-02', gainARS: -50, gainUSD: -5 }
      ]);
    });

    it('should sort records by date before calculating', () => {
      const records: DailyPortfolioRecord[] = [
        {
          fecha: '2024-01-03',
          total_portfolio_ars: 1100,
          total_portfolio_usd: 110,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 100,
          ganancias_netas_usd: 10,
          efectivo_disponible_ars: 300,
          efectivo_disponible_usd: 30
        },
        {
          fecha: '2024-01-01',
          total_portfolio_ars: 1000,
          total_portfolio_usd: 100,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 0,
          ganancias_netas_usd: 0,
          efectivo_disponible_ars: 200,
          efectivo_disponible_usd: 20
        },
        {
          fecha: '2024-01-02',
          total_portfolio_ars: 1050,
          total_portfolio_usd: 105,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 50,
          ganancias_netas_usd: 5,
          efectivo_disponible_ars: 250,
          efectivo_disponible_usd: 25
        }
      ];

      const result = calculateCumulativeNetGains(records);
      
      expect(result.cumulativeARS).toBe(100); // 50 + 50
      expect(result.cumulativeUSD).toBe(10); // 5 + 5
    });
  });

  describe('getLatestCumulativeNetGains', () => {
    it('should return latest cumulative gains', () => {
      const records: DailyPortfolioRecord[] = [
        {
          fecha: '2024-01-01',
          total_portfolio_ars: 1000,
          total_portfolio_usd: 100,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 0,
          ganancias_netas_usd: 0,
          efectivo_disponible_ars: 200,
          efectivo_disponible_usd: 20
        },
        {
          fecha: '2024-01-02',
          total_portfolio_ars: 1050,
          total_portfolio_usd: 105,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 50,
          ganancias_netas_usd: 5,
          efectivo_disponible_ars: 250,
          efectivo_disponible_usd: 25
        }
      ];

      const result = getLatestCumulativeNetGains(records);
      
      expect(result.cumulativeARS).toBe(50);
      expect(result.cumulativeUSD).toBe(5);
    });
  });

  describe('calculateNetGainsForDateRange', () => {
    it('should calculate gains for specific date range', () => {
      const records: DailyPortfolioRecord[] = [
        {
          fecha: '2024-01-01',
          total_portfolio_ars: 1000,
          total_portfolio_usd: 100,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 0,
          ganancias_netas_usd: 0,
          efectivo_disponible_ars: 200,
          efectivo_disponible_usd: 20
        },
        {
          fecha: '2024-01-02',
          total_portfolio_ars: 1050,
          total_portfolio_usd: 105,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 50,
          ganancias_netas_usd: 5,
          efectivo_disponible_ars: 250,
          efectivo_disponible_usd: 25
        },
        {
          fecha: '2024-01-03',
          total_portfolio_ars: 1100,
          total_portfolio_usd: 110,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 100,
          ganancias_netas_usd: 10,
          efectivo_disponible_ars: 300,
          efectivo_disponible_usd: 30
        }
      ];

      const result = calculateNetGainsForDateRange(records, '2024-01-02', '2024-01-03');
      
      expect(result.netGainsARS).toBe(50); // Only the gain from 2024-01-02 to 2024-01-03
      expect(result.netGainsUSD).toBe(5);
    });

    it('should return zero for empty date range', () => {
      const records: DailyPortfolioRecord[] = [
        {
          fecha: '2024-01-01',
          total_portfolio_ars: 1000,
          total_portfolio_usd: 100,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 0,
          ganancias_netas_usd: 0,
          efectivo_disponible_ars: 200,
          efectivo_disponible_usd: 20
        }
      ];

      const result = calculateNetGainsForDateRange(records, '2024-01-02', '2024-01-03');
      
      expect(result.netGainsARS).toBe(0);
      expect(result.netGainsUSD).toBe(0);
    });
  });

  describe('recalculateNetGainsForRecords', () => {
    it('should update all records with cumulative gains', () => {
      const records: DailyPortfolioRecord[] = [
        {
          fecha: '2024-01-01',
          total_portfolio_ars: 1000,
          total_portfolio_usd: 100,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 999, // Old incorrect value
          ganancias_netas_usd: 99, // Old incorrect value
          efectivo_disponible_ars: 200,
          efectivo_disponible_usd: 20
        },
        {
          fecha: '2024-01-02',
          total_portfolio_ars: 1050,
          total_portfolio_usd: 105,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 999, // Old incorrect value
          ganancias_netas_usd: 99, // Old incorrect value
          efectivo_disponible_ars: 250,
          efectivo_disponible_usd: 25
        }
      ];

      const result = recalculateNetGainsForRecords(records);
      
      expect(result[0].ganancias_netas_ars).toBe(0);
      expect(result[0].ganancias_netas_usd).toBe(0);
      expect(result[1].ganancias_netas_ars).toBe(50);
      expect(result[1].ganancias_netas_usd).toBe(5);
    });

    it('should handle single record', () => {
      const records: DailyPortfolioRecord[] = [
        {
          fecha: '2024-01-01',
          total_portfolio_ars: 1000,
          total_portfolio_usd: 100,
          capital_invertido_ars: 800,
          capital_invertido_usd: 80,
          ganancias_netas_ars: 999, // Old incorrect value
          ganancias_netas_usd: 99, // Old incorrect value
          efectivo_disponible_ars: 200,
          efectivo_disponible_usd: 20
        }
      ];

      const result = recalculateNetGainsForRecords(records);
      
      expect(result[0].ganancias_netas_ars).toBe(0);
      expect(result[0].ganancias_netas_usd).toBe(0);
    });

    it('should handle empty records', () => {
      const result = recalculateNetGainsForRecords([]);
      expect(result).toEqual([]);
    });
  });
}); 