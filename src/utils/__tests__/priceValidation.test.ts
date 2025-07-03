import { validatePositionPrice, filterPositionsWithValidPrices, getPositionDisplayName } from '../priceValidation';
import { PortfolioPosition } from '@/types';
import { PriceData } from '@/types/finance';

// Mock the getBondPriceFromJson function
jest.mock('../calculatePortfolioValue', () => ({
  getBondPriceFromJson: jest.fn()
}));

const { getBondPriceFromJson } = require('../calculatePortfolioValue');

describe('priceValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePositionPrice', () => {
    it('should validate stock position with valid price data', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      };

      const priceHistory: Record<string, PriceData[]> = {
        'AAPL': [
          { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
          { date: '2024-01-02', open: 102, high: 108, low: 100, close: 105, volume: 1200 }
        ]
      };

      const result = validatePositionPrice(position, priceHistory);
      expect(result.hasValidPrice).toBe(true);
      expect(result.currentPrice).toBe(105);
    });

    it('should reject stock position with no price data', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'INVALID',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      };

      const priceHistory: Record<string, PriceData[]> = {};

      const result = validatePositionPrice(position, priceHistory);
      expect(result.hasValidPrice).toBe(false);
      expect(result.reason).toBe('No hay datos de precio disponibles');
    });

    it('should reject stock position with all zero prices', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'ZERO',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      };

      const priceHistory: Record<string, PriceData[]> = {
        'ZERO': [
          { date: '2024-01-01', open: 0, high: 0, low: 0, close: 0, volume: 0 },
          { date: '2024-01-02', open: 0, high: 0, low: 0, close: 0, volume: 0 }
        ]
      };

      const result = validatePositionPrice(position, priceHistory);
      expect(result.hasValidPrice).toBe(false);
      expect(result.reason).toBe('Precios recientes son cero o inválidos');
    });

    it('should validate bond position with valid price data', () => {
      const position: PortfolioPosition = {
        type: 'Bond',
        ticker: 'GD30',
        quantity: 100,
        averagePrice: 50,
        currency: 'USD'
      };

      const priceHistory: Record<string, PriceData[]> = {
        'GD30': [
          { date: '2024-01-01', open: 50, high: 52, low: 48, close: 51, volume: 1000 },
          { date: '2024-01-02', open: 51, high: 54, low: 50, close: 53, volume: 1200 }
        ]
      };

      const result = validatePositionPrice(position, priceHistory);
      expect(result.hasValidPrice).toBe(true);
      expect(result.currentPrice).toBe(53);
    });

    it('should validate bond position using fallback when no price history', () => {
      const position: PortfolioPosition = {
        type: 'Bond',
        ticker: 'GD30',
        quantity: 100,
        averagePrice: 50,
        currency: 'USD'
      };

      const priceHistory: Record<string, PriceData[]> = {};
      
      (getBondPriceFromJson as jest.Mock).mockReturnValue(55);

      const result = validatePositionPrice(position, priceHistory);
      expect(result.hasValidPrice).toBe(true);
      expect(result.currentPrice).toBe(55);
      expect(getBondPriceFromJson).toHaveBeenCalledWith('GD30', 'USD');
    });

    it('should reject bond position when no price data and no fallback', () => {
      const position: PortfolioPosition = {
        type: 'Bond',
        ticker: 'INVALID',
        quantity: 100,
        averagePrice: 50,
        currency: 'USD'
      };

      const priceHistory: Record<string, PriceData[]> = {};
      
      (getBondPriceFromJson as jest.Mock).mockReturnValue(undefined);

      const result = validatePositionPrice(position, priceHistory);
      expect(result.hasValidPrice).toBe(false);
      expect(result.reason).toBe('No hay datos de precio disponibles');
    });

    it('should validate crypto position with valid price data', () => {
      const position: PortfolioPosition = {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.1,
        averagePrice: 50000,
        currency: 'USD'
      };

      const priceHistory: Record<string, PriceData[]> = {
        'BTCUSDT': [
          { date: '2024-01-01', open: 50000, high: 52000, low: 48000, close: 51000, volume: 1000 },
          { date: '2024-01-02', open: 51000, high: 54000, low: 50000, close: 53000, volume: 1200 }
        ]
      };

      const result = validatePositionPrice(position, priceHistory);
      expect(result.hasValidPrice).toBe(true);
      expect(result.currentPrice).toBe(53000);
    });

    it('should validate fixed-term deposit position', () => {
      const position: PortfolioPosition = {
        type: 'FixedTermDeposit',
        id: '1',
        provider: 'Banco',
        amount: 10000,
        annualRate: 10,
        startDate: '2024-01-01',
        maturityDate: '2024-07-01',
        currency: 'ARS'
      };

      const priceHistory: Record<string, PriceData[]> = {};

      const result = validatePositionPrice(position, priceHistory);
      expect(result.hasValidPrice).toBe(true);
      expect(result.currentPrice).toBe(10000);
    });

    it('should validate caucion position', () => {
      const position: PortfolioPosition = {
        type: 'Caucion',
        id: '1',
        provider: 'Broker',
        amount: 5000,
        annualRate: 8,
        startDate: '2024-01-01',
        maturityDate: '2024-02-01',
        currency: 'ARS',
        term: 30
      };

      const priceHistory: Record<string, PriceData[]> = {};

      const result = validatePositionPrice(position, priceHistory);
      expect(result.hasValidPrice).toBe(true);
      expect(result.currentPrice).toBe(5000);
    });
  });

  describe('filterPositionsWithValidPrices', () => {
    it('should filter positions correctly', () => {
      const positions: PortfolioPosition[] = [
        {
          type: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Stock',
          symbol: 'INVALID',
          quantity: 5,
          averagePrice: 50,
          currency: 'USD',
          market: 'NASDAQ'
        },
        {
          type: 'Crypto',
          symbol: 'BTCUSDT',
          quantity: 0.1,
          averagePrice: 50000,
          currency: 'USD'
        }
      ];

      const priceHistory: Record<string, PriceData[]> = {
        'AAPL': [
          { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 }
        ],
        'BTCUSDT': [
          { date: '2024-01-01', open: 50000, high: 52000, low: 48000, close: 51000, volume: 1000 }
        ]
      };

      const result = filterPositionsWithValidPrices(positions, priceHistory);
      
      expect(result.validPositions).toHaveLength(2);
      expect(result.excludedPositions).toHaveLength(1);
      expect(result.validPositions[0].type).toBe('Stock');
      expect((result.validPositions[0] as any).symbol).toBe('AAPL');
      expect(result.validPositions[1].type).toBe('Crypto');
      expect((result.validPositions[1] as any).symbol).toBe('BTCUSDT');
      expect(result.excludedPositions[0].position.type).toBe('Stock');
      expect((result.excludedPositions[0].position as any).symbol).toBe('INVALID');
      expect(result.excludedPositions[0].reason).toBe('No hay datos de precio disponibles');
    });

    it('should handle empty positions array', () => {
      const positions: PortfolioPosition[] = [];
      const priceHistory: Record<string, PriceData[]> = {};

      const result = filterPositionsWithValidPrices(positions, priceHistory);
      
      expect(result.validPositions).toHaveLength(0);
      expect(result.excludedPositions).toHaveLength(0);
    });
  });

  describe('getPositionDisplayName', () => {
    it('should return correct display name for stock', () => {
      const position: PortfolioPosition = {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      };

      expect(getPositionDisplayName(position)).toBe('AAPL');
    });

    it('should return correct display name for bond', () => {
      const position: PortfolioPosition = {
        type: 'Bond',
        ticker: 'GD30',
        quantity: 100,
        averagePrice: 50,
        currency: 'USD'
      };

      expect(getPositionDisplayName(position)).toBe('GD30');
    });

    it('should return correct display name for crypto', () => {
      const position: PortfolioPosition = {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.1,
        averagePrice: 50000,
        currency: 'USD'
      };

      expect(getPositionDisplayName(position)).toBe('BTCUSDT');
    });

    it('should return correct display name for fixed-term deposit', () => {
      const position: PortfolioPosition = {
        type: 'FixedTermDeposit',
        id: '1',
        provider: 'Banco',
        amount: 10000,
        annualRate: 10,
        startDate: '2024-01-01',
        maturityDate: '2024-07-01',
        currency: 'ARS'
      };

      expect(getPositionDisplayName(position)).toBe('Banco - Plazo Fijo');
    });

    it('should return correct display name for caucion', () => {
      const position: PortfolioPosition = {
        type: 'Caucion',
        id: '1',
        provider: 'Broker',
        amount: 5000,
        annualRate: 8,
        startDate: '2024-01-01',
        maturityDate: '2024-02-01',
        currency: 'ARS',
        term: 30
      };

      expect(getPositionDisplayName(position)).toBe('Broker - Caución');
    });
  });
}); 