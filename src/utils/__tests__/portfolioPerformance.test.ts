import { calculatePortfolioPerformance, formatPerformance, PerformanceMetrics, InflationData } from '../portfolioPerformance';
import { PortfolioValueHistory } from '../calculatePortfolioValue';
import dayjs from 'dayjs';

describe('portfolioPerformance', () => {
  describe('calculatePortfolioPerformance', () => {
    it('should return zero metrics for empty history', () => {
      const result = calculatePortfolioPerformance([]);
      
      expect(result).toEqual({
        monthlyReturnARS: 0,
        monthlyReturnUSD: 0,
        annualReturnARS: 0,
        annualReturnUSD: 0,
        monthlyReturnARSReal: 0,
        monthlyReturnUSDReal: 0,
        annualReturnARSReal: 0,
        annualReturnUSDReal: 0,
      });
    });

    it('should return zero metrics for single data point', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 }
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      expect(result.monthlyReturnARS).toBe(0);
      expect(result.annualReturnARS).toBe(0);
      expect(result.monthlyReturnUSD).toBe(0);
      expect(result.annualReturnUSD).toBe(0);
    });

    it('should calculate monthly returns correctly', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 },
        { date: '2024-02-01', valueARS: 1100, valueUSD: 105, valueARSRaw: 1100, valueUSDRaw: 105, cashARS: 550, cashUSD: 52.5 }
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      expect(result.monthlyReturnARS).toBe(10); // (1100 - 1000) / 1000 * 100
      expect(result.monthlyReturnUSD).toBe(5); // (105 - 100) / 100 * 100
    });

    it('should calculate annual returns correctly', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2023-01-01', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 },
        { date: '2024-01-01', valueARS: 1200, valueUSD: 110, valueARSRaw: 1200, valueUSDRaw: 110, cashARS: 600, cashUSD: 55 }
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      expect(result.annualReturnARS).toBe(20); // (1200 - 1000) / 1000 * 100
      expect(result.annualReturnUSD).toBe(10); // (110 - 100) / 100 * 100
    });

    it('should calculate real returns when inflation data is provided', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 },
        { date: '2024-02-01', valueARS: 1100, valueUSD: 105, valueARSRaw: 1100, valueUSDRaw: 105, cashARS: 550, cashUSD: 52.5 }
      ];
      
      const inflationData: InflationData = {
        argentina: { monthly: 4.2, annual: 142.7 },
        usa: { monthly: 0.3, annual: 3.1 }
      };
      
      const result = calculatePortfolioPerformance(history, inflationData);
      
      // Nominal returns
      expect(result.monthlyReturnARS).toBe(10);
      expect(result.monthlyReturnUSD).toBe(5);
      
      // Real returns (nominal - inflation)
      expect(result.monthlyReturnARSReal).toBeCloseTo(5.57, 2); // (1.1/1.042 - 1) * 100 ≈ 5.57
      expect(result.monthlyReturnUSDReal).toBeCloseTo(4.69, 2); // (1.05/1.003 - 1) * 100 ≈ 4.69
    });

    it('should handle negative returns correctly', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 },
        { date: '2024-02-01', valueARS: 900, valueUSD: 95, valueARSRaw: 900, valueUSDRaw: 95, cashARS: 450, cashUSD: 47.5 }
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      expect(result.monthlyReturnARS).toBe(-10); // (900 - 1000) / 1000 * 100
      expect(result.monthlyReturnUSD).toBe(-5); // (95 - 100) / 100 * 100
    });

    it('should sort history by date before calculations', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-02-01', valueARS: 1100, valueUSD: 105, valueARSRaw: 1100, valueUSDRaw: 105, cashARS: 550, cashUSD: 52.5 }, // Later date first
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 } // Earlier date second
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      expect(result.monthlyReturnARS).toBe(10);
      expect(result.monthlyReturnUSD).toBe(5);
    });

    it('should handle zero values in the past without producing Infinity', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: 0, valueUSD: 0, valueARSRaw: 0, valueUSDRaw: 0, cashARS: 0, cashUSD: 0 }, // Zero starting value
        { date: '2024-02-01', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 } // Current value
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      // Should return 0 instead of Infinity when past value is 0
      expect(result.monthlyReturnARS).toBe(0);
      expect(result.monthlyReturnUSD).toBe(0);
      expect(result.annualReturnARS).toBe(0);
      expect(result.annualReturnUSD).toBe(0);
    });

    it('should handle negative values in the past correctly', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: -1000, valueUSD: -100, valueARSRaw: -1000, valueUSDRaw: -100, cashARS: -500, cashUSD: -50 }, // Negative starting value
        { date: '2024-02-01', valueARS: 900, valueUSD: 95, valueARSRaw: 900, valueUSDRaw: 95, cashARS: 450, cashUSD: 47.5 } // Current value
      ];
      const result = calculatePortfolioPerformance(history);
      // Should return the mathematically correct negative return
      expect(result.monthlyReturnARS).toBe(-190); // (900 - (-1000)) / -1000 * 100 = -190%
      expect(result.monthlyReturnUSD).toBe(-195); // (95 - (-100)) / -100 * 100 = -195%
    });

    it('should use reverse search to find the correct reference point', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 },
        { date: '2024-01-15', valueARS: 1100, valueUSD: 105, valueARSRaw: 1100, valueUSDRaw: 105, cashARS: 550, cashUSD: 52.5 }, // Should be ignored
        { date: '2024-01-31', valueARS: 1200, valueUSD: 110, valueARSRaw: 1200, valueUSDRaw: 110, cashARS: 600, cashUSD: 55 }, // Should be ignored
        { date: '2024-02-01', valueARS: 1300, valueUSD: 115, valueARSRaw: 1300, valueUSDRaw: 115, cashARS: 650, cashUSD: 57.5 } // Current value
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      // Should use 2024-01-01 as reference (not 2024-01-15 or 2024-01-31)
      expect(result.monthlyReturnARS).toBe(30); // (1300 - 1000) / 1000 * 100
      expect(result.monthlyReturnUSD).toBe(15); // (115 - 100) / 100 * 100
    });

    it('should handle sparse data with gaps correctly', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2023-01-01', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 }, // 1 year ago
        { date: '2024-01-01', valueARS: 1200, valueUSD: 110, valueARSRaw: 1200, valueUSDRaw: 110, cashARS: 600, cashUSD: 55 }, // 1 month ago
        { date: '2024-02-01', valueARS: 1300, valueUSD: 115, valueARSRaw: 1300, valueUSDRaw: 115, cashARS: 650, cashUSD: 57.5 } // Current
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      // Should find the correct reference points despite gaps
      expect(result.monthlyReturnARS).toBeCloseTo(8.33, 2); // (1300 - 1200) / 1200 * 100 ≈ 8.33
      expect(result.annualReturnARS).toBe(30); // (1300 - 1000) / 1000 * 100
    });

    it('should fallback to earliest available record if no record exists on or before the reference date', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-10', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 },
        { date: '2024-02-10', valueARS: 1200, valueUSD: 110, valueARSRaw: 1200, valueUSDRaw: 110, cashARS: 600, cashUSD: 55 },
        { date: '2024-03-10', valueARS: 1300, valueUSD: 115, valueARSRaw: 1300, valueUSDRaw: 115, cashARS: 650, cashUSD: 57.5 }
      ];
      // Reference date for 1 month ago from 2024-03-10 is 2024-02-10 (exists),
      // for 1 year ago is 2023-03-10 (does not exist, should fallback to 2024-01-10)
      const result = calculatePortfolioPerformance(history);
      expect(result.monthlyReturnARS).toBeCloseTo((1300-1200)/1200*100, 2);
      expect(result.annualReturnARS).toBeCloseTo((1300-1000)/1000*100, 2);
    });

    it('should fallback to first record if no record exists within the range', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-10', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 },
        { date: '2024-02-10', valueARS: 1200, valueUSD: 110, valueARSRaw: 1200, valueUSDRaw: 110, cashARS: 600, cashUSD: 55 },
        { date: '2024-03-10', valueARS: 1300, valueUSD: 115, valueARSRaw: 1300, valueUSDRaw: 115, cashARS: 650, cashUSD: 57.5 }
      ];
      // If we set current to 2024-03-10, 1 year ago is 2023-03-10 (no record), so fallback to first record 2024-01-10
      const result = calculatePortfolioPerformance(history);
      expect(result.annualReturnARS).toBeCloseTo((1300-1000)/1000*100, 2);
    });

    it('should compute negative returns and not force them to zero', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100, valueARSRaw: 1000, valueUSDRaw: 100, cashARS: 500, cashUSD: 50 },
        { date: '2024-02-01', valueARS: 900, valueUSD: 95, valueARSRaw: 900, valueUSDRaw: 95, cashARS: 450, cashUSD: 47.5 }
      ];
      const result = calculatePortfolioPerformance(history);
      expect(result.monthlyReturnARS).toBe(-10);
      expect(result.monthlyReturnUSD).toBe(-5);
    });
  });

  describe('formatPerformance', () => {
    it('should format positive percentages correctly', () => {
      const result = formatPerformance(5.25);
      
      expect(result.formatted).toBe('+5.25%');
      expect(result.color).toBe('text-green-600');
      expect(result.label).toBe('Nominal');
    });

    it('should format negative percentages correctly', () => {
      const result = formatPerformance(-3.75);
      
      expect(result.formatted).toBe('-3.75%');
      expect(result.color).toBe('text-red-600');
      expect(result.label).toBe('Nominal');
    });

    it('should format zero percentages correctly', () => {
      const result = formatPerformance(0);
      
      expect(result.formatted).toBe('+0.00%');
      expect(result.color).toBe('text-gray-600');
      expect(result.label).toBe('Nominal');
    });

    it('should format real returns correctly', () => {
      const result = formatPerformance(2.5, true);
      
      expect(result.formatted).toBe('+2.50%');
      expect(result.color).toBe('text-green-600');
      expect(result.label).toBe('Real');
    });

    it('should handle decimal precision correctly', () => {
      const result = formatPerformance(3.14159);
      
      expect(result.formatted).toBe('+3.14%');
    });
  });
}); 