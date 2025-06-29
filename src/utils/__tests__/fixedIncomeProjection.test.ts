import { calculateDailyInterest, projectFixedIncome, projectFixedIncomeForGoal } from '../fixedIncomeProjection';
import { PortfolioPosition, InvestmentGoal } from '@/types';
import { Bond } from '@/types/finance';
import dayjs from 'dayjs';

describe('fixedIncomeProjection', () => {
  const mockBonds: Bond[] = [
    {
      id: 'bond1',
      ticker: 'BOND1',
      name: 'Test Bond 1',
      issuer: 'Test Issuer',
      maturityDate: '2025-12-31',
      couponRate: 10, // 10% annual rate
      price: 100,
      currency: 'ARS',
    },
    {
      id: 'bond2',
      ticker: 'BOND2',
      name: 'Test Bond 2',
      issuer: 'Test Issuer',
      maturityDate: '2025-12-31',
      couponRate: 5, // 5% annual rate
      price: 100,
      currency: 'USD',
    },
  ];

  const mockPositions: PortfolioPosition[] = [
    {
      type: 'FixedTermDeposit',
      id: 'fd1',
      provider: 'Test Bank',
      amount: 10000,
      annualRate: 60, // 60% annual rate
      startDate: '2024-01-01',
      maturityDate: '2024-12-31',
      currency: 'ARS',
    },
    {
      type: 'FixedTermDeposit',
      id: 'fd2',
      provider: 'Test Bank',
      amount: 1000,
      annualRate: 4, // 4% annual rate
      startDate: '2024-01-01',
      maturityDate: '2024-12-31',
      currency: 'USD',
    },
    {
      type: 'Bond',
      ticker: 'BOND1',
      quantity: 100,
      averagePrice: 100,
      currency: 'ARS',
    },
    {
      type: 'Bond',
      ticker: 'BOND2',
      quantity: 10,
      averagePrice: 100,
      currency: 'USD',
    },
  ];

  const mockGoals: InvestmentGoal[] = [
    {
      id: 'goal1',
      name: 'Test Goal 1',
      targetAmount: 50000,
      targetDate: '2024-12-31',
      initialDeposit: 10000,
      monthlyContribution: 1000,
      currency: 'ARS',
    },
    {
      id: 'goal2',
      name: 'Test Goal 2',
      targetAmount: 5000,
      targetDate: '2024-12-31',
      initialDeposit: 1000,
      monthlyContribution: 100,
      currency: 'USD',
    },
  ];

  describe('calculateDailyInterest', () => {
    it('should calculate daily interest for ARS positions in ARS', () => {
      const arsPositions = mockPositions.filter(p => p.currency === 'ARS');
      const dailyInterest = calculateDailyInterest(arsPositions, mockBonds, 'ARS');
      
      // ARS FixedTermDeposit: 10000 * 60% / 100 / 365 = 16.44
      // ARS Bond: 100 * 100 * 10% / 100 / 365 = 2.74
      // Total: 19.18
      expect(dailyInterest).toBeCloseTo(19.18, 2);
    });

    it('should calculate daily interest for USD positions in USD', () => {
      const usdPositions = mockPositions.filter(p => p.currency === 'USD');
      const dailyInterest = calculateDailyInterest(usdPositions, mockBonds, 'USD');
      
      // USD FixedTermDeposit: 1000 * 4% / 100 / 365 = 0.11
      // USD Bond: 10 * 100 * 5% / 100 / 365 = 0.14
      // Total: 0.25
      expect(dailyInterest).toBeCloseTo(0.25, 2);
    });

    it('should convert USD positions to ARS when target currency is ARS', () => {
      const usdPositions = mockPositions.filter(p => p.currency === 'USD');
      const dailyInterest = calculateDailyInterest(usdPositions, mockBonds, 'ARS');
      
      // USD FixedTermDeposit: 1000 * 4% / 100 / 365 = 0.11 USD
      // USD Bond: 10 * 100 * 5% / 100 / 365 = 0.14 USD
      // Total: 0.25 USD
      // Convert to ARS: 0.25 * 1000 = 250 ARS (actual: 246.58)
      expect(dailyInterest).toBeCloseTo(246.58, 1);
    });

    it('should convert ARS positions to USD when target currency is USD', () => {
      const arsPositions = mockPositions.filter(p => p.currency === 'ARS');
      const dailyInterest = calculateDailyInterest(arsPositions, mockBonds, 'USD');
      
      // ARS FixedTermDeposit: 10000 * 60% / 100 / 365 = 16.44 ARS
      // ARS Bond: 100 * 100 * 10% / 100 / 365 = 2.74 ARS
      // Total: 19.18 ARS
      // Convert to USD: 19.18 / 1000 = 0.019 USD
      expect(dailyInterest).toBeCloseTo(0.019, 3);
    });

    it('should calculate total daily interest for all positions in ARS', () => {
      const dailyInterest = calculateDailyInterest(mockPositions, mockBonds, 'ARS');
      
      // ARS positions: 19.18 ARS
      // USD positions converted: 246.58 ARS
      // Total: 265.76 ARS
      expect(dailyInterest).toBeCloseTo(265.76, 1);
    });

    it('should calculate total daily interest for all positions in USD', () => {
      const dailyInterest = calculateDailyInterest(mockPositions, mockBonds, 'USD');
      
      // ARS positions converted: 0.019 USD
      // USD positions: 0.25 USD
      // Total: 0.27 USD
      expect(dailyInterest).toBeCloseTo(0.27, 2);
    });

    it('should return 0 for empty positions', () => {
      const dailyInterest = calculateDailyInterest([], mockBonds, 'ARS');
      expect(dailyInterest).toBe(0);
    });

    it('should handle positions without matching bonds', () => {
      const positionsWithUnknownBond: PortfolioPosition[] = [
        {
          type: 'Bond',
          ticker: 'UNKNOWN',
          quantity: 100,
          averagePrice: 100,
          currency: 'ARS',
        },
      ];
      const dailyInterest = calculateDailyInterest(positionsWithUnknownBond, mockBonds, 'ARS');
      expect(dailyInterest).toBe(0);
    });

    it('should handle mixed currency positions with proper conversion', () => {
      const mixedPositions: PortfolioPosition[] = [
        {
          type: 'FixedTermDeposit',
          id: 'fd1',
          provider: 'Test Bank',
          amount: 5000,
          annualRate: 50, // 50% annual rate
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'ARS',
        },
        {
          type: 'FixedTermDeposit',
          id: 'fd2',
          provider: 'Test Bank',
          amount: 500,
          annualRate: 3, // 3% annual rate
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'USD',
        },
      ];
      
      const dailyInterestARS = calculateDailyInterest(mixedPositions, mockBonds, 'ARS');
      const dailyInterestUSD = calculateDailyInterest(mixedPositions, mockBonds, 'USD');
      
      // ARS: 5000 * 50% / 100 / 365 = 6.85 ARS
      // USD: 500 * 3% / 100 / 365 = 0.041 USD
      // Convert USD to ARS: 0.041 * 1000 = 41 ARS
      // Total in ARS: 6.85 + 41 = 47.95 ARS
      expect(dailyInterestARS).toBeCloseTo(47.95, 1);
      
      // Convert ARS to USD: 6.85 / 1000 = 0.00685 USD
      // Total in USD: 0.00685 + 0.041 = 0.048 USD
      expect(dailyInterestUSD).toBeCloseTo(0.048, 2);
    });
  });

  describe('projectFixedIncome', () => {
    it('should project fixed income for ARS goal', () => {
      const arsGoal = mockGoals[0];
      const projection = projectFixedIncome(10000, mockPositions, mockBonds, [arsGoal]);
      
      expect(Array.isArray(projection)).toBe(true);
      expect(projection.length).toBeGreaterThan(0);
      expect(projection[0]).toEqual({
        date: expect.any(String),
        value: 10000,
      });
      
      // Check that values increase over time
      for (let i = 1; i < projection.length; i++) {
        expect(projection[i].value).toBeGreaterThan(projection[i - 1].value);
      }
    });

    it('should project fixed income for USD goal', () => {
      const usdGoal = mockGoals[1];
      const projection = projectFixedIncome(1000, mockPositions, mockBonds, [usdGoal]);
      
      expect(Array.isArray(projection)).toBe(true);
      expect(projection.length).toBeGreaterThan(0);
      expect(projection[0]).toEqual({
        date: expect.any(String),
        value: 1000,
      });
      
      // Check that values increase over time
      for (let i = 1; i < projection.length; i++) {
        expect(projection[i].value).toBeGreaterThan(projection[i - 1].value);
      }
    });

    it('should project fixed income for multiple goals using ARS as default', () => {
      const projection = projectFixedIncome(10000, mockPositions, mockBonds, mockGoals);
      
      expect(Array.isArray(projection)).toBe(true);
      expect(projection.length).toBeGreaterThan(0);
      expect(projection[0]).toEqual({
        date: expect.any(String),
        value: 10000,
      });
    });

    it('should handle empty goals array', () => {
      const projection = projectFixedIncome(10000, mockPositions, mockBonds, []);
      
      expect(Array.isArray(projection)).toBe(true);
      expect(projection.length).toBe(2); // Today and tomorrow
      expect(projection[0]).toEqual({
        date: expect.any(String),
        value: 10000,
      });
    });

    it('should handle positions with no daily interest', () => {
      const noInterestPositions: PortfolioPosition[] = [
        {
          type: 'FixedTermDeposit',
          id: 'fd1',
          provider: 'Test Bank',
          amount: 10000,
          annualRate: 0, // 0% rate
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'ARS',
        },
      ];
      const projection = projectFixedIncome(10000, noInterestPositions, mockBonds, mockGoals);
      
      expect(Array.isArray(projection)).toBe(true);
      expect(projection.length).toBeGreaterThan(0);
      // All values should be the same since there's no interest
      projection.forEach(point => {
        expect(point.value).toBe(10000);
      });
    });

    it('should project with mixed currency positions for USD goal', () => {
      const usdGoal = mockGoals[1];
      const mixedPositions: PortfolioPosition[] = [
        {
          type: 'FixedTermDeposit',
          id: 'fd1',
          provider: 'Test Bank',
          amount: 5000,
          annualRate: 50, // 50% annual rate
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'ARS',
        },
        {
          type: 'FixedTermDeposit',
          id: 'fd2',
          provider: 'Test Bank',
          amount: 500,
          annualRate: 3, // 3% annual rate
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'USD',
        },
      ];
      
      const projection = projectFixedIncome(1000, mixedPositions, mockBonds, [usdGoal]);
      
      expect(Array.isArray(projection)).toBe(true);
      expect(projection.length).toBeGreaterThan(0);
      expect(projection[0]).toEqual({
        date: expect.any(String),
        value: 1000,
      });
      
      // Values should increase over time
      for (let i = 1; i < projection.length; i++) {
        expect(projection[i].value).toBeGreaterThan(projection[i - 1].value);
      }
    });

    it('should continue projection beyond goal date until target amount is reached', () => {
      const highTargetGoal: InvestmentGoal = {
        id: 'highTarget',
        name: 'High Target Goal',
        targetAmount: 100000, // High target amount
        targetDate: '2024-06-30', // Near future goal date
        initialDeposit: 10000,
        monthlyContribution: 1000,
        currency: 'ARS',
      };

      const lowInterestPositions: PortfolioPosition[] = [
        {
          type: 'FixedTermDeposit',
          id: 'fd1',
          provider: 'Test Bank',
          amount: 10000,
          annualRate: 10, // Low interest rate
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'ARS',
        },
      ];

      const projection = projectFixedIncome(10000, lowInterestPositions, mockBonds, [highTargetGoal]);
      
      expect(Array.isArray(projection)).toBe(true);
      expect(projection.length).toBeGreaterThan(365); // Should exceed 1 year
      
      // The projection should continue until the target amount is reached
      const finalValue = projection[projection.length - 1].value;
      expect(finalValue).toBeGreaterThanOrEqual(100000);
      
      // Check that the projection goes beyond the goal date
      const goalDate = dayjs('2024-06-30');
      const finalDate = dayjs(projection[projection.length - 1].date);
      expect(finalDate.isAfter(goalDate)).toBe(true);
    });

    it('should stop at goal date when target amount is reached before goal date', () => {
      const lowTargetGoal: InvestmentGoal = {
        id: 'lowTarget',
        name: 'Low Target Goal',
        targetAmount: 15000, // Low target amount
        targetDate: '2024-12-31', // Far future goal date
        initialDeposit: 10000,
        monthlyContribution: 1000,
        currency: 'ARS',
      };

      const highInterestPositions: PortfolioPosition[] = [
        {
          type: 'FixedTermDeposit',
          id: 'fd1',
          provider: 'Test Bank',
          amount: 10000,
          annualRate: 100, // High interest rate
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'ARS',
        },
      ];

      const projection = projectFixedIncome(10000, highInterestPositions, mockBonds, [lowTargetGoal]);
      
      expect(Array.isArray(projection)).toBe(true);
      
      // The projection should stop when target amount is reached
      const finalValue = projection[projection.length - 1].value;
      expect(finalValue).toBeGreaterThanOrEqual(15000);
      
      // Should not exceed 365 days since target is reached quickly
      expect(projection.length).toBeLessThanOrEqual(366); // Today + up to 365 days
    });

    it('should handle multiple goals with different target amounts and dates', () => {
      const goals: InvestmentGoal[] = [
        {
          id: 'goal1',
          name: 'Short Term Goal',
          targetAmount: 20000,
          targetDate: '2024-06-30',
          initialDeposit: 10000,
          monthlyContribution: 1000,
          currency: 'ARS',
        },
        {
          id: 'goal2',
          name: 'Long Term Goal',
          targetAmount: 100000, // Higher target amount
          targetDate: '2024-12-31', // Later date
          initialDeposit: 10000,
          monthlyContribution: 1000,
          currency: 'ARS',
        },
      ];

      const positions: PortfolioPosition[] = [
        {
          type: 'FixedTermDeposit',
          id: 'fd1',
          provider: 'Test Bank',
          amount: 10000,
          annualRate: 20, // Moderate interest rate
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'ARS',
        },
      ];

      const projection = projectFixedIncome(10000, positions, mockBonds, goals);
      
      expect(Array.isArray(projection)).toBe(true);
      
      // Should continue until the farthest goal date (2024-12-31) AND max target amount (100000) is reached
      const finalValue = projection[projection.length - 1].value;
      expect(finalValue).toBeGreaterThanOrEqual(100000); // Max target amount
      
      // Should go beyond the earlier goal date
      const earlyGoalDate = dayjs('2024-06-30');
      const finalDate = dayjs(projection[projection.length - 1].date);
      expect(finalDate.isAfter(earlyGoalDate)).toBe(true);
    });

    it('should stop at goal date when no daily interest is generated', () => {
      const goal: InvestmentGoal = {
        id: 'noInterest',
        name: 'No Interest Goal',
        targetAmount: 50000,
        targetDate: '2024-12-31',
        initialDeposit: 10000,
        monthlyContribution: 1000,
        currency: 'ARS',
      };

      const noInterestPositions: PortfolioPosition[] = [
        {
          type: 'FixedTermDeposit',
          id: 'fd1',
          provider: 'Test Bank',
          amount: 10000,
          annualRate: 0, // No interest
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'ARS',
        },
      ];

      const projection = projectFixedIncome(10000, noInterestPositions, mockBonds, [goal]);
      
      expect(Array.isArray(projection)).toBe(true);
      
      // Should stop at goal date since no interest is generated
      const goalDate = dayjs('2024-12-31');
      const finalDate = dayjs(projection[projection.length - 1].date);
      expect(finalDate.isSameOrBefore(goalDate)).toBe(true);
      
      // All values should be the same since there's no interest
      projection.forEach(point => {
        expect(point.value).toBe(10000);
      });
    });
  });

  describe('projectFixedIncomeForGoal', () => {
    it('should project fixed income for a specific ARS goal', () => {
      const arsGoal = mockGoals[0];
      const projection = projectFixedIncomeForGoal(mockPositions, mockBonds, arsGoal, 10000);
      
      expect(Array.isArray(projection)).toBe(true);
      expect(projection.length).toBeGreaterThan(0);
      expect(projection[0]).toEqual({
        date: expect.any(String),
        value: 10000,
      });
    });

    it('should project fixed income for a specific USD goal', () => {
      const usdGoal = mockGoals[1];
      const projection = projectFixedIncomeForGoal(mockPositions, mockBonds, usdGoal, 1000);
      
      expect(Array.isArray(projection)).toBe(true);
      expect(projection.length).toBeGreaterThan(0);
      expect(projection[0]).toEqual({
        date: expect.any(String),
        value: 1000,
      });
    });

    it('should handle mixed currency positions for USD goal', () => {
      const usdGoal = mockGoals[1];
      const mixedPositions: PortfolioPosition[] = [
        {
          type: 'FixedTermDeposit',
          id: 'fd1',
          provider: 'Test Bank',
          amount: 5000,
          annualRate: 50, // 50% annual rate
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'ARS',
        },
        {
          type: 'FixedTermDeposit',
          id: 'fd2',
          provider: 'Test Bank',
          amount: 500,
          annualRate: 3, // 3% annual rate
          startDate: '2024-01-01',
          maturityDate: '2024-12-31',
          currency: 'USD',
        },
      ];
      
      const projection = projectFixedIncomeForGoal(mixedPositions, mockBonds, usdGoal, 1000);
      
      expect(Array.isArray(projection)).toBe(true);
      expect(projection.length).toBeGreaterThan(0);
      expect(projection[0]).toEqual({
        date: expect.any(String),
        value: 1000,
      });
    });
  });
}); 