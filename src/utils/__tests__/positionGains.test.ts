import { computePositionGain, calculateNetGainsByCurrency } from '../positionGains';
import { PortfolioPosition } from '@/types';
import { PriceData } from '@/types/finance';

describe('computePositionGain', () => {
  describe('Stock positions', () => {
    it('should calculate gain for stock with purchasePrice', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: 150,
        currency: 'USD',
        market: 'NASDAQ'
      };
      
      const gain = computePositionGain(position, 160);
      expect(gain).toBe(100); // (160 - 150) * 10
    });

    it('should calculate gain for stock with averagePrice only', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 150,
        currency: 'USD',
        market: 'NASDAQ'
      } as any;
      
      const gain = computePositionGain(position, 160);
      expect(gain).toBe(100); // (160 - 150) * 10
    });

    it('should calculate loss for stock', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: 150,
        currency: 'USD',
        market: 'NASDAQ'
      };
      
      const gain = computePositionGain(position, 140);
      expect(gain).toBe(-100); // (140 - 150) * 10
    });

    it('should return 0 when currentPrice is not provided', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: 150,
        currency: 'USD',
        market: 'NASDAQ'
      };
      
      const gain = computePositionGain(position);
      expect(gain).toBe(0);
    });

    it('should return 0 when currentPrice is not finite', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: 150,
        currency: 'USD',
        market: 'NASDAQ'
      };
      
      const gain = computePositionGain(position, NaN);
      expect(gain).toBe(0);
    });

    it('should return 0 when currentPrice is Infinity', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: 150,
        currency: 'USD',
        market: 'NASDAQ'
      };
      
      const gain = computePositionGain(position, Infinity);
      expect(gain).toBe(0);
    });

    it('should return 0 when purchasePrice is not finite', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: NaN,
        currency: 'USD',
        market: 'NASDAQ'
      };
      
      const gain = computePositionGain(position, 160);
      expect(gain).toBe(0);
    });

    it('should return 0 when averagePrice is not finite', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: Infinity,
        currency: 'USD',
        market: 'NASDAQ'
      } as any;
      
      const gain = computePositionGain(position, 160);
      expect(gain).toBe(0);
    });
  });

  describe('Crypto positions', () => {
    it('should calculate gain for crypto with purchasePrice', () => {
      const position: PortfolioPosition = {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.5,
        purchasePrice: 50000,
        currency: 'USD'
      };
      
      const gain = computePositionGain(position, 52000);
      expect(gain).toBe(1000); // (52000 - 50000) * 0.5
    });

    it('should calculate gain for crypto with averagePrice only', () => {
      const position: PortfolioPosition = {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.5,
        averagePrice: 50000,
        currency: 'USD'
      } as any;
      
      const gain = computePositionGain(position, 52000);
      expect(gain).toBe(1000); // (52000 - 50000) * 0.5
    });

    it('should return 0 when crypto has no valid purchase price', () => {
      const position: PortfolioPosition = {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.5,
        currency: 'USD'
      } as any;
      
      const gain = computePositionGain(position, 52000);
      expect(gain).toBe(0);
    });
  });

  describe('FixedTermDeposit positions', () => {
    it('should calculate gain for matured deposit', () => {
      const position: PortfolioPosition = {
        type: 'FixedTermDeposit',
        id: '1',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5,
        startDate: '2024-01-01',
        maturityDate: '2024-01-31',
        currency: 'ARS'
      };
      
      const today = new Date('2024-02-01'); // After maturity
      const gain = computePositionGain(position, undefined, today);
      
      // Expected: 10000 * (36.5/100) * (30/365) = 300
      expect(gain).toBeCloseTo(300, 0);
    });

    it('should calculate gain for active deposit', () => {
      const position: PortfolioPosition = {
        type: 'FixedTermDeposit',
        id: '1',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5,
        startDate: '2024-01-01',
        maturityDate: '2024-01-31',
        currency: 'ARS'
      };
      
      const today = new Date('2024-01-15'); // Mid-term
      const gain = computePositionGain(position, undefined, today);
      
      // Expected: 10000 * (36.5/100) * (14/365) = 140
      expect(gain).toBeCloseTo(140, 0);
    });

    it('should return 0 for deposit before start date', () => {
      const position: PortfolioPosition = {
        type: 'FixedTermDeposit',
        id: '1',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5,
        startDate: '2024-01-01',
        maturityDate: '2024-01-31',
        currency: 'ARS'
      };
      
      const today = new Date('2023-12-31'); // Before start
      const gain = computePositionGain(position, undefined, today);
      expect(gain).toBe(0);
    });
  });

  describe('Caucion positions', () => {
    it('should calculate gain for matured caucion', () => {
      const position: PortfolioPosition = {
        type: 'Caucion',
        id: '1',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5,
        startDate: '2024-01-01',
        maturityDate: '2024-01-31',
        currency: 'ARS',
        term: 30
      };
      
      const today = new Date('2024-02-01'); // After maturity
      const gain = computePositionGain(position, undefined, today);
      
      // Expected: 10000 * (36.5/100) * (30/365) = 300
      expect(gain).toBeCloseTo(300, 0);
    });

    it('should return 0 for unknown position type', () => {
      const position = {
        type: 'Unknown',
        symbol: 'TEST',
        quantity: 10,
        purchasePrice: 100,
        currency: 'USD'
      } as any;
      
      const gain = computePositionGain(position, 110);
      expect(gain).toBe(0);
    });
  });
});

describe('calculateNetGainsByCurrency', () => {
  const mockPriceHistory: Record<string, PriceData[]> = {
    'AAPL': [{ 
      date: '2024-01-01', 
      open: 150, 
      high: 160, 
      low: 140, 
      close: 160, 
      volume: 1000000 
    }],
    'BTCUSDT': [{ 
      date: '2024-01-01', 
      open: 50000, 
      high: 52000, 
      low: 48000, 
      close: 52000, 
      volume: 1000000 
    }],
    'GGAL': [{ 
      date: '2024-01-01', 
      open: 1000, 
      high: 1100, 
      low: 900, 
      close: 1100, 
      volume: 1000000 
    }]
  };

  it('should calculate net gains for multiple positions', () => {
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
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.5,
        purchasePrice: 50000,
        currency: 'USD'
      }
    ];

    const result = calculateNetGainsByCurrency(positions, mockPriceHistory);
    
    expect(result.USD).toBe(1100); // 100 from AAPL + 1000 from BTC
    expect(result.ARS).toBe(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('should handle positions with averagePrice only', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 150,
        currency: 'USD',
        market: 'NASDAQ'
      } as any
    ];

    const result = calculateNetGainsByCurrency(positions, mockPriceHistory);
    
    expect(result.USD).toBe(100); // (160 - 150) * 10
    expect(result.ARS).toBe(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('should skip positions without valid prices', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'INVALID',
        quantity: 10,
        purchasePrice: 150,
        currency: 'USD',
        market: 'NASDAQ'
      }
    ];

    const result = calculateNetGainsByCurrency(positions, mockPriceHistory);
    
    expect(result.USD).toBe(0);
    expect(result.ARS).toBe(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].position).toMatchObject({ symbol: 'INVALID' });
  });

  it('should handle mixed currency positions', () => {
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

    const result = calculateNetGainsByCurrency(positions, mockPriceHistory);
    
    expect(result.USD).toBe(100); // AAPL gain
    expect(result.ARS).toBe(10000); // GGAL gain: (1100 - 1000) * 100
    expect(result.skipped).toHaveLength(0);
  });

  it('should return 0 for positions with non-finite prices', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: NaN,
        currency: 'USD',
        market: 'NASDAQ'
      }
    ];

    const result = calculateNetGainsByCurrency(positions, mockPriceHistory);
    
    expect(result.USD).toBe(0);
    expect(result.ARS).toBe(0);
    expect(result.skipped).toHaveLength(1);
  });
}); 