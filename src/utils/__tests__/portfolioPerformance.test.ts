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
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100 }
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      expect(result.monthlyReturnARS).toBe(0);
      expect(result.annualReturnARS).toBe(0);
      expect(result.monthlyReturnUSD).toBe(0);
      expect(result.annualReturnUSD).toBe(0);
    });

    it('should calculate monthly returns correctly', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100 },
        { date: '2024-02-01', valueARS: 1100, valueUSD: 105 }
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      expect(result.monthlyReturnARS).toBe(10); // (1100 - 1000) / 1000 * 100
      expect(result.monthlyReturnUSD).toBe(5); // (105 - 100) / 100 * 100
    });

    it('should calculate annual returns correctly', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2023-01-01', valueARS: 1000, valueUSD: 100 },
        { date: '2024-01-01', valueARS: 1200, valueUSD: 110 }
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      expect(result.annualReturnARS).toBe(20); // (1200 - 1000) / 1000 * 100
      expect(result.annualReturnUSD).toBe(10); // (110 - 100) / 100 * 100
    });

    it('should calculate real returns when inflation data is provided', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100 },
        { date: '2024-02-01', valueARS: 1100, valueUSD: 105 }
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
      expect(result.monthlyReturnARSReal).toBe(5.8); // 10 - 4.2
      expect(result.monthlyReturnUSDReal).toBe(4.7); // 5 - 0.3
    });

    it('should handle negative returns correctly', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100 },
        { date: '2024-02-01', valueARS: 900, valueUSD: 95 }
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      expect(result.monthlyReturnARS).toBe(-10); // (900 - 1000) / 1000 * 100
      expect(result.monthlyReturnUSD).toBe(-5); // (95 - 100) / 100 * 100
    });

    it('should sort history by date before calculations', () => {
      const history: PortfolioValueHistory[] = [
        { date: '2024-02-01', valueARS: 1100, valueUSD: 105 }, // Later date first
        { date: '2024-01-01', valueARS: 1000, valueUSD: 100 } // Earlier date second
      ];
      
      const result = calculatePortfolioPerformance(history);
      
      expect(result.monthlyReturnARS).toBe(10);
      expect(result.monthlyReturnUSD).toBe(5);
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