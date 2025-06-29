import { calculateFixedIncomeGains, calculateFixedIncomeValueHistory } from '../goalCalculator';
import { PortfolioPosition, PortfolioTransaction } from '@/types';

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
        averagePrice: 100,
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
        averagePrice: 50000,
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
        averagePrice: 100,
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
        averagePrice: 100,
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
        averagePrice: 50000,
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