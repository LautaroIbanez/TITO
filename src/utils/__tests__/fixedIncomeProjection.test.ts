import { projectFixedIncome } from '../fixedIncomeProjection';
import { PortfolioPosition, InvestmentGoal } from '@/types';
import { Bond } from '@/types/finance';
import dayjs from 'dayjs';

const mockBonds: Bond[] = [
  { id: 'AL30', ticker: 'AL30', name: 'Bonar 2030', issuer: 'Gov', maturityDate: '2030-07-09', couponRate: 1.0, price: 50, currency: 'USD' },
];

describe('projectFixedIncome', () => {
  it('should project value correctly with a fixed term deposit', () => {
    const initialValue = 10000;
    const positions: PortfolioPosition[] = [
      { type: 'FixedTermDeposit', id: 'ftd-1', provider: 'Bank', amount: 10000, annualRate: 10, startDate: '2023-01-01', maturityDate: '2024-01-01', currency: 'ARS' },
    ];
    const goals: InvestmentGoal[] = [
      { id: 'g1', name: 'Goal 1', targetAmount: 12000, targetDate: dayjs().add(1, 'year').format('YYYY-MM-DD'), initialDeposit: 10000, monthlyContribution: 0, currency: 'ARS' },
    ];
    
    const projection = projectFixedIncome(initialValue, positions, [], goals);
    
    // Check projection for 365 days (today + 364 future days)
    expect(projection.length).toBe(365); 
    
    // Check final projected value
    const dailyInterest = (10000 * 0.10) / 365;
    const expectedFinalValue = initialValue + (dailyInterest * 364); // 364 days of interest (excluding today)
    expect(projection[projection.length - 1].value).toBeCloseTo(expectedFinalValue, 0);
  });

  it('should project value correctly with a bond', () => {
    const initialValue = 5000;
    const positions: PortfolioPosition[] = [
      { type: 'Bond', ticker: 'AL30', quantity: 100, averagePrice: 50, currency: 'ARS' },
    ];
    const goals: InvestmentGoal[] = [
      { id: 'g1', name: 'Goal 1', targetAmount: 6000, targetDate: dayjs().add(1, 'year').format('YYYY-MM-DD'), initialDeposit: 5000, monthlyContribution: 0, currency: 'ARS' },
    ];

    const projection = projectFixedIncome(initialValue, positions, mockBonds, goals);
    expect(projection.length).toBe(365);
    
    const bondValue = 100 * 50;
    const dailyInterest = (bondValue * 0.01) / 365;
    const expectedFinalValue = initialValue + (dailyInterest * 364); // 364 days of interest (excluding today)
    expect(projection[projection.length - 1].value).toBeCloseTo(expectedFinalValue, 0);
  });

  it('should handle empty positions', () => {
    const initialValue = 1000;
    const positions: PortfolioPosition[] = [];
    const goals: InvestmentGoal[] = [
      { id: 'g1', name: 'Goal 1', targetAmount: 1200, targetDate: dayjs().add(1, 'year').format('YYYY-MM-DD'), initialDeposit: 1000, monthlyContribution: 0, currency: 'ARS' },
    ];

    const projection = projectFixedIncome(initialValue, positions, [], goals);
    expect(projection.length).toBe(365);
    expect(projection[projection.length - 1].value).toBe(initialValue);
  });
}); 