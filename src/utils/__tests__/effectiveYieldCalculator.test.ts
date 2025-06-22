import { calculateEffectiveYield } from '../goalCalculator';
import { PortfolioPosition } from '@/types';
import { Bond } from '@/types/finance';

const mockBonds: Bond[] = [
  { id: 'BOND1', ticker: 'BOND1', name: 'Test Bond 1', issuer: 'Gov', maturityDate: '2030-01-01', couponRate: 5, price: 100, currency: 'USD' },
  { id: 'BOND2', ticker: 'BOND2', name: 'Test Bond 2', issuer: 'Corp', maturityDate: '2028-01-01', couponRate: 8, price: 100, currency: 'USD' },
];

describe('calculateEffectiveYield', () => {
  it('should return the default yield if there are no positions', () => {
    const positions: PortfolioPosition[] = [];
    const yieldRate = calculateEffectiveYield(positions, mockBonds);
    expect(yieldRate).toBe(8);
  });

  it('should calculate the yield from a single fixed-term deposit', () => {
    const positions: PortfolioPosition[] = [
      { type: 'FixedTermDeposit', id: 'ftd-1', provider: 'Bank', amount: 10000, annualRate: 10, startDate: '2023-01-01', maturityDate: '2024-01-01' },
    ];
    const yieldRate = calculateEffectiveYield(positions, mockBonds);
    expect(yieldRate).toBeCloseTo(10);
  });

  it('should calculate the weighted average yield from multiple positions', () => {
    const positions: PortfolioPosition[] = [
      { type: 'FixedTermDeposit', id: 'ftd-1', provider: 'Bank', amount: 10000, annualRate: 10, startDate: '2023-01-01', maturityDate: '2024-01-01' }, // 10% on 10k
      { type: 'Bond', ticker: 'BOND1', quantity: 50, averagePrice: 100 }, // 5% on 5k
    ];
    
    const yieldRate = calculateEffectiveYield(positions, mockBonds);
    
    const totalValue = 10000 + (50 * 100);
    const weightedYield = (10000 * 0.10) + (5000 * 0.05);
    const expectedYield = (weightedYield / totalValue) * 100;

    expect(yieldRate).toBeCloseTo(expectedYield); // (1000 + 250) / 15000 * 100 = 8.33%
  });

  it('should ignore non-fixed-income positions', () => {
    const positions: PortfolioPosition[] = [
      { type: 'Stock', symbol: 'AAPL', quantity: 10, averagePrice: 150 },
      { type: 'FixedTermDeposit', id: 'ftd-1', provider: 'Bank', amount: 5000, annualRate: 5, startDate: '2023-01-01', maturityDate: '2024-01-01' },
    ];
    const yieldRate = calculateEffectiveYield(positions, mockBonds);
    expect(yieldRate).toBeCloseTo(5);
  });
}); 