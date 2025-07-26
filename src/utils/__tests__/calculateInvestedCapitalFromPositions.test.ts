import { calculateInvestedCapitalFromPositions } from '../calculateInvestedCapitalFromPositions';
import { PortfolioPosition } from '@/types';

describe('calculateInvestedCapitalFromPositions', () => {
  it('should calculate invested capital for stocks correctly', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: 150,
        currency: 'USD',
        market: 'NASDAQ'
      },
      {
        type: 'Stock',
        symbol: 'GGAL',
        quantity: 100,
        purchasePrice: 1000,
        currency: 'ARS',
        market: 'BCBA'
      }
    ];

    const result = calculateInvestedCapitalFromPositions(positions);
    
    expect(result.USD).toBe(1500); // 10 * 150
    expect(result.ARS).toBe(100000); // 100 * 1000
  });

  it('should calculate invested capital for crypto correctly', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.5,
        purchasePrice: 50000,
        currency: 'USD'
      }
    ];

    const result = calculateInvestedCapitalFromPositions(positions);
    
    expect(result.USD).toBe(25000); // 0.5 * 50000
    expect(result.ARS).toBe(0);
  });

  it('should calculate invested capital for bonds correctly', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Bond',
        ticker: 'GGAL24',
        quantity: 1000,
        purchasePrice: 95.5,
        currency: 'ARS'
      }
    ];

    const result = calculateInvestedCapitalFromPositions(positions);
    
    expect(result.ARS).toBe(95500); // 1000 * 95.5
    expect(result.USD).toBe(0);
  });

  it('should calculate invested capital for fixed-term deposits correctly', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'deposit1',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5,
        startDate: '2024-01-01',
        maturityDate: '2024-01-31',
        currency: 'ARS',
        termDays: 30
      }
    ];

    const result = calculateInvestedCapitalFromPositions(positions);
    
    expect(result.ARS).toBe(10000); // amount
    expect(result.USD).toBe(0);
  });

  it('should calculate invested capital for cauciones correctly', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Caucion',
        id: 'caucion1',
        provider: 'Test Bank',
        amount: 5000,
        annualRate: 36.5,
        startDate: '2024-01-01',
        maturityDate: '2024-01-31',
        currency: 'ARS',
        term: 30
      }
    ];

    const result = calculateInvestedCapitalFromPositions(positions);
    
    expect(result.ARS).toBe(5000); // amount
    expect(result.USD).toBe(0);
  });

  it('should handle mixed position types correctly', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 5,
        purchasePrice: 150,
        currency: 'USD',
        market: 'NASDAQ'
      },
      {
        type: 'FixedTermDeposit',
        id: 'deposit1',
        provider: 'Test Bank',
        amount: 20000,
        annualRate: 36.5,
        startDate: '2024-01-01',
        maturityDate: '2024-01-31',
        currency: 'ARS',
        termDays: 30
      },
      {
        type: 'Crypto',
        symbol: 'ETHUSDT',
        quantity: 2,
        purchasePrice: 3000,
        currency: 'USD'
      }
    ];

    const result = calculateInvestedCapitalFromPositions(positions);
    
    expect(result.USD).toBe(750 + 6000); // (5 * 150) + (2 * 3000)
    expect(result.ARS).toBe(20000); // amount
  });

  it('should handle positions with non-finite values', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: NaN,
        currency: 'USD',
        market: 'NASDAQ'
      },
      {
        type: 'Stock',
        symbol: 'GGAL',
        quantity: Infinity,
        purchasePrice: 1000,
        currency: 'ARS',
        market: 'BCBA'
      },
      {
        type: 'FixedTermDeposit',
        id: 'deposit1',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5,
        startDate: '2024-01-01',
        maturityDate: '2024-01-31',
        currency: 'ARS',
        termDays: 30
      }
    ];

    const result = calculateInvestedCapitalFromPositions(positions);
    
    expect(result.USD).toBe(0); // NaN * 10 = NaN, filtered out
    expect(result.ARS).toBe(10000); // Only the deposit amount is valid
  });

  it('should return zero for empty positions array', () => {
    const positions: PortfolioPosition[] = [];

    const result = calculateInvestedCapitalFromPositions(positions);
    
    expect(result.ARS).toBe(0);
    expect(result.USD).toBe(0);
  });

  it('should handle positions with missing purchasePrice but valid averagePrice', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 150, // Using averagePrice instead of purchasePrice
        currency: 'USD',
        market: 'NASDAQ'
      }
    ];

    const result = calculateInvestedCapitalFromPositions(positions);
    
    expect(result.USD).toBe(1500); // 10 * 150
    expect(result.ARS).toBe(0);
  });
}); 