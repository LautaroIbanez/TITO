import { CaucionPosition } from '@/types';
import { Bond } from '@/types/finance';
import { calculateEffectiveYield } from '../goalCalculator';
import { projectFixedIncome } from '../fixedIncomeProjection';

describe('Caución Calculations', () => {
  const mockBonds: Bond[] = [
    {
      id: 'bond-1',
      ticker: 'TEST-BOND',
      name: 'Test Bond',
      issuer: 'Test Issuer',
      maturityDate: '2025-12-31',
      couponRate: 15.5,
      price: 1000,
      currency: 'ARS'
    }
  ];

  describe('calculateEffectiveYield', () => {
    it('should include cauciones in effective yield calculation', () => {
      const positions = [
        {
          type: 'Caucion' as const,
          id: 'caucion-1',
          provider: 'BYMA',
          amount: 100000,
          annualRate: 120.5,
          startDate: '2024-01-01',
          maturityDate: '2024-02-01',
          currency: 'ARS' as const,
          term: 30
        } as CaucionPosition
      ];

      const effectiveYield = calculateEffectiveYield(positions, mockBonds);
      
      // Expected: (100000 * 120.5%) / 100000 = 120.5%
      expect(effectiveYield).toBe(120.5);
    });

    it('should calculate weighted average yield with multiple cauciones', () => {
      const positions = [
        {
          type: 'Caucion' as const,
          id: 'caucion-1',
          provider: 'BYMA',
          amount: 50000,
          annualRate: 120.0,
          startDate: '2024-01-01',
          maturityDate: '2024-02-01',
          currency: 'ARS' as const,
          term: 30
        } as CaucionPosition,
        {
          type: 'Caucion' as const,
          id: 'caucion-2',
          provider: 'BYMA',
          amount: 50000,
          annualRate: 125.0,
          startDate: '2024-01-01',
          maturityDate: '2024-03-01',
          currency: 'ARS' as const,
          term: 60
        } as CaucionPosition
      ];

      const effectiveYield = calculateEffectiveYield(positions, mockBonds);
      
      // Expected: (50000 * 120% + 50000 * 125%) / 100000 = 122.5%
      expect(effectiveYield).toBeCloseTo(122.5, 1);
    });

    it('should handle mixed positions (cauciones, deposits, bonds)', () => {
      const positions = [
        {
          type: 'Caucion' as const,
          id: 'caucion-1',
          provider: 'BYMA',
          amount: 50000,
          annualRate: 120.0,
          startDate: '2024-01-01',
          maturityDate: '2024-02-01',
          currency: 'ARS' as const,
          term: 30
        } as CaucionPosition,
        {
          type: 'FixedTermDeposit' as const,
          id: 'deposit-1',
          provider: 'Bank',
          amount: 50000,
          annualRate: 110.0,
          startDate: '2024-01-01',
          maturityDate: '2024-07-01',
          currency: 'ARS' as const
        },
        {
          type: 'Bond' as const,
          ticker: 'TEST-BOND',
          quantity: 100,
          averagePrice: 1000,
          currency: 'ARS' as const
        }
      ];

      const effectiveYield = calculateEffectiveYield(positions, mockBonds);
      
      // Expected: (50000 * 120% + 50000 * 110% + 100000 * 15.5%) / 200000 = 65.25%
      expect(effectiveYield).toBeCloseTo(65.25, 1);
    });

    it('should return default yield when no fixed income positions exist', () => {
      const positions: any[] = [];
      const effectiveYield = calculateEffectiveYield(positions, mockBonds);
      expect(effectiveYield).toBe(8);
    });
  });

  describe('projectFixedIncome', () => {
    it('should include cauciones in daily interest calculation', () => {
      const positions = [
        {
          type: 'Caucion' as const,
          id: 'caucion-1',
          provider: 'BYMA',
          amount: 100000,
          annualRate: 120.0,
          startDate: '2024-01-01',
          maturityDate: '2024-02-01',
          currency: 'ARS' as const,
          term: 30
        } as CaucionPosition
      ];

      const goals = [
        {
          id: 'goal-1',
          name: 'Test Goal',
          targetAmount: 1000000,
          targetDate: '2024-12-31',
          initialDeposit: 0,
          monthlyContribution: 0,
          currency: 'ARS' as const
        }
      ];

      const projection = projectFixedIncome(100000, positions, mockBonds, goals);
      
      // Should have projection data with at least 2 entries (today and tomorrow)
      expect(projection.length).toBeGreaterThanOrEqual(2);
      expect(projection[0]).toHaveProperty('date');
      expect(projection[0]).toHaveProperty('value');
      
      // Value should increase over time due to daily interest
      const firstValue = projection[0].value;
      const lastValue = projection[projection.length - 1].value;
      expect(lastValue).toBeGreaterThan(firstValue);
    });

    it('should handle multiple cauciones with different rates', () => {
      const positions = [
        {
          type: 'Caucion' as const,
          id: 'caucion-1',
          provider: 'BYMA',
          amount: 50000,
          annualRate: 120.0,
          startDate: '2024-01-01',
          maturityDate: '2024-02-01',
          currency: 'ARS' as const,
          term: 30
        } as CaucionPosition,
        {
          type: 'Caucion' as const,
          id: 'caucion-2',
          provider: 'BYMA',
          amount: 50000,
          annualRate: 125.0,
          startDate: '2024-01-01',
          maturityDate: '2024-03-01',
          currency: 'ARS' as const,
          term: 60
        } as CaucionPosition
      ];

      const goals = [
        {
          id: 'goal-1',
          name: 'Test Goal',
          targetAmount: 1000000,
          targetDate: '2024-12-31',
          initialDeposit: 0,
          monthlyContribution: 0,
          currency: 'ARS' as const
        }
      ];

      const projection = projectFixedIncome(100000, positions, mockBonds, goals);
      
      // Should have projection data with at least 2 entries
      expect(projection.length).toBeGreaterThanOrEqual(2);
      
      // Value should increase over time
      const firstValue = projection[0].value;
      const lastValue = projection[projection.length - 1].value;
      expect(lastValue).toBeGreaterThan(firstValue);
    });

    it('should return at least two dates even with no goals', () => {
      const positions = [
        {
          type: 'Caucion' as const,
          id: 'caucion-1',
          provider: 'BYMA',
          amount: 100000,
          annualRate: 120.0,
          startDate: '2024-01-01',
          maturityDate: '2024-02-01',
          currency: 'ARS' as const,
          term: 30
        } as CaucionPosition
      ];

      const projection = projectFixedIncome(100000, positions, mockBonds, []);
      
      // Should have exactly 2 entries (today and tomorrow)
      expect(projection.length).toBe(2);
      expect(projection[0]).toHaveProperty('date');
      expect(projection[0]).toHaveProperty('value');
      expect(projection[1]).toHaveProperty('date');
      expect(projection[1]).toHaveProperty('value');
      
      // Tomorrow's value should be greater than today's due to daily interest
      const todayValue = projection[0].value;
      const tomorrowValue = projection[1].value;
      expect(tomorrowValue).toBeGreaterThan(todayValue);
    });
  });
}); 