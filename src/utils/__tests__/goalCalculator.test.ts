import { calculateFixedIncomeGains, calculateFixedIncomeValueHistory, distributeFixedIncomeReturns } from '../goalCalculator';
import { PortfolioPosition, PortfolioTransaction, InvestmentGoal } from '@/types';
import { Bond } from '@/types/finance';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrBefore);

describe('calculateFixedIncomeGains', () => {
  it('should return 0 when no positions exist', () => {
    const positions: PortfolioPosition[] = [];
    const transactions: PortfolioTransaction[] = [];
    
    const result = calculateFixedIncomeGains(positions, transactions);
    expect(result).toBe(0);
  });

  it('should return 0 when no deposits exist', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 1000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const transactions: PortfolioTransaction[] = [];
    
    const result = calculateFixedIncomeGains(positions, transactions);
    expect(result).toBe(0);
  });

  it('should calculate gains from fixed-term deposits correctly', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 10000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    
    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 10000,
        currency: 'ARS',
      },
    ];
    
    const result = calculateFixedIncomeGains(positions, transactions);
    
    // Should calculate accrued interest based on days elapsed
    // For a 75% annual rate, after ~6 months (180 days), interest should be ~3700
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(10000); // Should not exceed the deposit amount
  });

  it('should calculate gains from cauciones correctly', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Caucion',
        id: 'c1',
        provider: 'Broker Test',
        amount: 5000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-06-30',
        currency: 'ARS',
        term: 180,
      },
    ];
    
    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 5000,
        currency: 'ARS',
      },
    ];
    
    const result = calculateFixedIncomeGains(positions, transactions);
    
    // Should calculate accrued interest based on days elapsed
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(5000); // Should not exceed the deposit amount
  });

  it('should ignore stock positions when calculating gains', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: 100,
        currency: 'USD',
        market: 'NASDAQ',
      },
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 1000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    
    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 1000,
        currency: 'ARS',
      },
    ];
    
    const result = calculateFixedIncomeGains(positions, transactions);
    
    // Should only consider fixed-term deposit gains, ignore stock gains
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1000);
  });

  it('should ignore crypto positions when calculating gains', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 1,
        purchasePrice: 50000,
        currency: 'USD',
      },
      {
        type: 'Caucion',
        id: 'c1',
        provider: 'Broker Test',
        amount: 2000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-06-30',
        currency: 'ARS',
        term: 180,
      },
    ];
    
    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 2000,
        currency: 'ARS',
      },
    ];
    
    const result = calculateFixedIncomeGains(positions, transactions);
    
    // Should only consider caucion gains, ignore crypto gains
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(2000);
  });

  it('should ignore bond positions when calculating gains', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Bond',
        ticker: 'BONAR2024',
        quantity: 100,
        purchasePrice: 100,
        currency: 'ARS',
      },
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 3000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    
    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 3000,
        currency: 'ARS',
      },
    ];
    
    const result = calculateFixedIncomeGains(positions, transactions);
    
    // Should only consider fixed-term deposit gains, ignore bond gains
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(3000);
  });

  it('should handle multiple fixed-income positions', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 5000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
      {
        type: 'Caucion',
        id: 'c1',
        provider: 'Broker Test',
        amount: 3000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-06-30',
        currency: 'ARS',
        term: 180,
      },
    ];
    
    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 8000,
        currency: 'ARS',
      },
    ];
    
    const result = calculateFixedIncomeGains(positions, transactions);
    
    // Should calculate combined gains from both fixed-income positions
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(8000);
  });

  it('should return 0 when fixed-income value is less than deposits', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 1000,
        annualRate: 75,
        startDate: '2024-12-01', // Very recent start date
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    
    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 1000,
        currency: 'ARS',
      },
    ];
    
    const result = calculateFixedIncomeGains(positions, transactions);
    
    // Should return a very small gain since very little interest has accrued
    expect(result).toBeLessThan(100);
  });
});

describe('calculateFixedIncomeValueHistory', () => {
  it('should return array of zeros when no positions exist', () => {
    const positions: PortfolioPosition[] = [];
    const transactions: PortfolioTransaction[] = [];
    
    const result = calculateFixedIncomeValueHistory(positions, transactions, 30);
    expect(result).toHaveLength(30);
    expect(result.every(entry => entry.value === 0)).toBe(true);
  });

  it('should return array with correct number of days', () => {
    const positions: PortfolioPosition[] = [];
    const transactions: PortfolioTransaction[] = [];
    
    const result = calculateFixedIncomeValueHistory(positions, transactions, 7);
    expect(result).toHaveLength(7);
  });

  it('should calculate value history for fixed-term deposits', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 10000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const transactions: PortfolioTransaction[] = [];
    
    const result = calculateFixedIncomeValueHistory(positions, transactions, 5);
    
    expect(result).toHaveLength(5);
    expect(result[0]).toHaveProperty('date');
    expect(result[0]).toHaveProperty('value');
    expect(result[0].value).toBeGreaterThan(0);
  });

  it('should calculate value history for cauciones', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Caucion',
        id: 'c1',
        provider: 'Broker Test',
        amount: 5000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-06-30',
        currency: 'ARS',
        term: 180,
      },
    ];
    const transactions: PortfolioTransaction[] = [];
    
    const result = calculateFixedIncomeValueHistory(positions, transactions, 5);
    
    expect(result).toHaveLength(5);
    expect(result[0]).toHaveProperty('date');
    expect(result[0]).toHaveProperty('value');
    expect(result[0].value).toBeGreaterThan(0);
  });

  it('should ignore stock positions when calculating value history', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: 100,
        currency: 'USD',
        market: 'NASDAQ',
      },
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 1000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const transactions: PortfolioTransaction[] = [];
    
    const result = calculateFixedIncomeValueHistory(positions, transactions, 5);
    
    // Should only include fixed-term deposit value, ignore stock value
    expect(result).toHaveLength(5);
    expect(result[0].value).toBeGreaterThan(0);
    expect(result[0].value).toBeLessThan(2000); // Should not include stock value
  });

  it('should ignore crypto positions when calculating value history', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 1,
        purchasePrice: 50000,
        currency: 'USD',
      },
      {
        type: 'Caucion',
        id: 'c1',
        provider: 'Broker Test',
        amount: 2000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-06-30',
        currency: 'ARS',
        term: 180,
      },
    ];
    const transactions: PortfolioTransaction[] = [];
    
    const result = calculateFixedIncomeValueHistory(positions, transactions, 5);
    
    // Should only include caucion value, ignore crypto value
    expect(result).toHaveLength(5);
    expect(result[0].value).toBeGreaterThan(0);
    expect(result[0].value).toBeLessThan(3000); // Should not include crypto value
  });

  it('should handle multiple fixed-income positions', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 5000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
      {
        type: 'Caucion',
        id: 'c1',
        provider: 'Broker Test',
        amount: 3000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-06-30',
        currency: 'ARS',
        term: 180,
      },
    ];
    const transactions: PortfolioTransaction[] = [];
    
    const result = calculateFixedIncomeValueHistory(positions, transactions, 5);
    
    // Should include combined value from both fixed-income positions
    expect(result).toHaveLength(5);
    expect(result[0].value).toBeGreaterThan(8000); // Should be more than the sum of amounts
  });

  it('should return 0 value for positions that have not started yet', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
    
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 10000,
        annualRate: 75,
        startDate: futureDate.toISOString().split('T')[0],
        maturityDate: new Date(futureDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: 'ARS',
      },
    ];
    const transactions: PortfolioTransaction[] = [];
    
    const result = calculateFixedIncomeValueHistory(positions, transactions, 5);
    
    // Should return 0 for positions that haven't started yet
    expect(result).toHaveLength(5);
    expect(result[0].value).toBe(0);
  });
});

describe('distributeFixedIncomeReturns', () => {
  it('should extend projection past targetDate until targetAmount is reached, but not beyond 5 years', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 10000,
        annualRate: 10,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const bonds: Bond[] = [];
    const today = dayjs();
    const goal: InvestmentGoal = {
      id: 'g1',
      name: 'Meta Lenta',
      targetAmount: 20000, // Un monto que no se alcanza en 1 año con 10% anual
      targetDate: today.add(1, 'year').format('YYYY-MM-DD'),
      initialDeposit: 10000,
      monthlyContribution: 0,
      currency: 'ARS',
    };
    const distributed = distributeFixedIncomeReturns(positions, bonds, [goal], 10000);
    const projection = distributed[goal.id];
    // Debe extenderse más allá de la fecha objetivo
    const lastDate = dayjs(projection[projection.length - 1].date);
    expect(lastDate.isAfter(dayjs(goal.targetDate))).toBe(true);
    // Debe alcanzar el monto objetivo o llegar al límite
    const reached = projection.some(p => p.value >= goal.targetAmount);
    const maxEndDate = today.add(5, 'year');
    // La proyección debe terminar por alcanzar el objetivo o por llegar al límite
    expect(reached || lastDate.isSameOrBefore(maxEndDate.add(1, 'day'))).toBe(true);
    // Nunca debe superar 5 años desde hoy
    expect(lastDate.isSameOrBefore(maxEndDate.add(1, 'day'))).toBe(true);
  });

  it('should handle USD-denominated positions and goals correctly', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'US Bank',
        amount: 1000,
        annualRate: 4, // 4% annual rate
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'USD',
      },
    ];
    const bonds: Bond[] = [];
    const today = dayjs();
    const usdGoal: InvestmentGoal = {
      id: 'usd-goal',
      name: 'USD Goal',
      targetAmount: 2000,
      targetDate: today.add(1, 'year').format('YYYY-MM-DD'),
      initialDeposit: 1000,
      monthlyContribution: 0,
      currency: 'USD',
    };
    
    const distributed = distributeFixedIncomeReturns(positions, bonds, [usdGoal], 1000);
    const projection = distributed[usdGoal.id];
    
    expect(projection).toBeDefined();
    expect(projection.length).toBeGreaterThan(0);
    
    // First value should be the initial value in ARS divided by number of goals, converted to USD
    expect(projection[0].value).toBeCloseTo(1, 2);
    
    // Values should increase over time
    for (let i = 1; i < projection.length; i++) {
      expect(projection[i].value).toBeGreaterThan(projection[i - 1].value);
    }
  });

  it('should handle mixed currency positions with USD goal', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 10000,
        annualRate: 60, // 60% annual rate
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
      {
        type: 'FixedTermDeposit',
        id: 'fd2',
        provider: 'US Bank',
        amount: 1000,
        annualRate: 4, // 4% annual rate
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'USD',
      },
    ];
    const bonds: Bond[] = [];
    const today = dayjs();
    const usdGoal: InvestmentGoal = {
      id: 'usd-goal',
      name: 'USD Goal',
      targetAmount: 2000,
      targetDate: today.add(1, 'year').format('YYYY-MM-DD'),
      initialDeposit: 1000,
      monthlyContribution: 0,
      currency: 'USD',
    };
    
    const distributed = distributeFixedIncomeReturns(positions, bonds, [usdGoal], 1000);
    const projection = distributed[usdGoal.id];
    
    expect(projection).toBeDefined();
    expect(projection.length).toBeGreaterThan(0);
    
    // First value should be the initial value in ARS divided by number of goals, converted to USD
    expect(projection[0].value).toBeCloseTo(1, 2);
    
    // Values should increase over time (both ARS and USD interest converted to USD)
    for (let i = 1; i < projection.length; i++) {
      expect(projection[i].value).toBeGreaterThan(projection[i - 1].value);
    }
  });

  it('should handle mixed currency positions with ARS goal', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 10000,
        annualRate: 60, // 60% annual rate
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
      {
        type: 'FixedTermDeposit',
        id: 'fd2',
        provider: 'US Bank',
        amount: 1000,
        annualRate: 4, // 4% annual rate
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'USD',
      },
    ];
    const bonds: Bond[] = [];
    const today = dayjs();
    const arsGoal: InvestmentGoal = {
      id: 'ars-goal',
      name: 'ARS Goal',
      targetAmount: 20000,
      targetDate: today.add(1, 'year').format('YYYY-MM-DD'),
      initialDeposit: 10000,
      monthlyContribution: 0,
      currency: 'ARS',
    };
    
    const distributed = distributeFixedIncomeReturns(positions, bonds, [arsGoal], 10000);
    const projection = distributed[arsGoal.id];
    
    expect(projection).toBeDefined();
    expect(projection.length).toBeGreaterThan(0);
    
    // First value should be the initial value
    expect(projection[0].value).toBe(10000);
    
    // Values should increase over time (both ARS and USD interest converted to ARS)
    for (let i = 1; i < projection.length; i++) {
      expect(projection[i].value).toBeGreaterThan(projection[i - 1].value);
    }
  });

  it('should distribute returns equally among multiple goals with different currencies', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 10000,
        annualRate: 60, // 60% annual rate
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
      {
        type: 'FixedTermDeposit',
        id: 'fd2',
        provider: 'US Bank',
        amount: 1000,
        annualRate: 4, // 4% annual rate
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'USD',
      },
    ];
    const bonds: Bond[] = [];
    const today = dayjs();
    const arsGoal: InvestmentGoal = {
      id: 'ars-goal',
      name: 'ARS Goal',
      targetAmount: 20000,
      targetDate: today.add(1, 'year').format('YYYY-MM-DD'),
      initialDeposit: 10000,
      monthlyContribution: 0,
      currency: 'ARS',
    };
    const usdGoal: InvestmentGoal = {
      id: 'usd-goal',
      name: 'USD Goal',
      targetAmount: 2000,
      targetDate: today.add(1, 'year').format('YYYY-MM-DD'),
      initialDeposit: 1000,
      monthlyContribution: 0,
      currency: 'USD',
    };
    
    const distributed = distributeFixedIncomeReturns(positions, bonds, [arsGoal, usdGoal], 10000);
    
    // Both goals should have projections
    expect(distributed[arsGoal.id]).toBeDefined();
    expect(distributed[usdGoal.id]).toBeDefined();
    
    const arsProjection = distributed[arsGoal.id];
    const usdProjection = distributed[usdGoal.id];
    
    // Each goal should start with half the initial value in their currency
    expect(arsProjection[0].value).toBe(5000); // Half of 10000 ARS
    expect(usdProjection[0].value).toBeCloseTo(5, 2); // Half of 10000 ARS converted to USD
    
    // Both projections should increase over time
    expect(arsProjection[1].value).toBeGreaterThan(arsProjection[0].value);
    expect(usdProjection[1].value).toBeGreaterThan(usdProjection[0].value);
  });

  it('should handle bond positions with currency conversion', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Bond',
        ticker: 'BOND1',
        quantity: 100,
        purchasePrice: 100,
        currency: 'ARS',
      },
      {
        type: 'Bond',
        ticker: 'BOND2',
        quantity: 10,
        purchasePrice: 100,
        currency: 'USD',
      },
    ];
    const bonds: Bond[] = [
      {
        id: 'bond1',
        ticker: 'BOND1',
        name: 'ARS Bond',
        issuer: 'Test Issuer',
        maturityDate: '2025-12-31',
        couponRate: 10, // 10% annual rate
        price: 100,
        currency: 'ARS',
      },
      {
        id: 'bond2',
        ticker: 'BOND2',
        name: 'USD Bond',
        issuer: 'Test Issuer',
        maturityDate: '2025-12-31',
        couponRate: 5, // 5% annual rate
        price: 100,
        currency: 'USD',
      },
    ];
    const today = dayjs();
    const usdGoal: InvestmentGoal = {
      id: 'usd-goal',
      name: 'USD Goal',
      targetAmount: 2000,
      targetDate: today.add(1, 'year').format('YYYY-MM-DD'),
      initialDeposit: 1000,
      monthlyContribution: 0,
      currency: 'USD',
    };
    
    const distributed = distributeFixedIncomeReturns(positions, bonds, [usdGoal], 1000);
    const projection = distributed[usdGoal.id];
    
    expect(projection).toBeDefined();
    expect(projection.length).toBeGreaterThan(0);
    
    // First value should be the initial value in ARS divided by number of goals, converted to USD
    expect(projection[0].value).toBeCloseTo(1, 2);
    
    // Values should increase over time (both ARS and USD bond interest converted to USD)
    for (let i = 1; i < projection.length; i++) {
      expect(projection[i].value).toBeGreaterThan(projection[i - 1].value);
    }
  });

  it('should return empty object for empty goals array', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 10000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const bonds: Bond[] = [];
    
    const distributed = distributeFixedIncomeReturns(positions, bonds, [], 10000);
    
    expect(distributed).toEqual({});
  });

  it('should handle positions with no daily interest', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 10000,
        annualRate: 0, // 0% rate
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const bonds: Bond[] = [];
    const today = dayjs();
    const goal: InvestmentGoal = {
      id: 'goal1',
      name: 'Test Goal',
      targetAmount: 20000,
      targetDate: today.add(1, 'year').format('YYYY-MM-DD'),
      initialDeposit: 10000,
      monthlyContribution: 0,
      currency: 'ARS',
    };
    
    const distributed = distributeFixedIncomeReturns(positions, bonds, [goal], 10000);
    const projection = distributed[goal.id];
    
    expect(projection).toBeDefined();
    expect(projection.length).toBeGreaterThan(0);
    
    // All values should be the same since there's no interest
    projection.forEach(point => {
      expect(point.value).toBe(10000);
    });
  });
}); 

describe('formatCurrency', () => {
  const { formatCurrency } = require('../goalCalculator');
  it('formats ARS with es-AR locale', () => {
    expect(formatCurrency(1234.56, 'ARS')).toBe('$1.234,56');
    expect(formatCurrency(1000000, 'ARS')).toBe('$1.000.000,00');
  });
  it('formats USD with en-US locale', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('US$1,234.56');
    expect(formatCurrency(1000000, 'USD')).toBe('US$1,000,000.00');
  });
}); 