import { calculatePortfolioSummaryHistory, PortfolioSummaryEntry } from '../portfolioSummaryHistory';
import { PortfolioTransaction } from '@/types';
import { PriceData } from '@/types/finance';

// Mock the dependencies
jest.mock('../calculatePortfolioValue', () => ({
  calculatePortfolioValueHistory: jest.fn(),
}));

jest.mock('../investedCapital', () => ({
  calculateDailyInvestedCapital: jest.fn(),
}));

const mockCalculatePortfolioValueHistory = require('../calculatePortfolioValue').calculatePortfolioValueHistory;
const mockCalculateDailyInvestedCapital = require('../investedCapital').calculateDailyInvestedCapital;

describe('calculatePortfolioSummaryHistory', () => {
  const mockTransactions: PortfolioTransaction[] = [
    {
      id: '1',
      type: 'Buy',
      date: '2024-01-01',
      symbol: 'AAPL',
      quantity: 10,
      price: 100,
      currency: 'USD',
      assetType: 'Stock',
      market: 'NASDAQ',
    },
    {
      id: '2',
      type: 'Deposit',
      date: '2024-01-02',
      amount: 1000,
      currency: 'USD',
    },
  ];

  const mockPriceHistory: Record<string, PriceData[]> = {
    AAPL: [
      { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { date: '2024-01-02', open: 102, high: 108, low: 100, close: 105, volume: 1200 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when no transactions provided', async () => {
    const result = await calculatePortfolioSummaryHistory([], mockPriceHistory);
    expect(result).toEqual([]);
  });

  it('calculates portfolio summary history correctly', async () => {
    // Mock portfolio value history
    mockCalculatePortfolioValueHistory.mockResolvedValue([
      {
        date: '2024-01-01',
        valueARS: 0,
        valueUSD: 1020,
        valueARSRaw: 0,
        valueUSDRaw: 1020,
        cashARS: 0,
        cashUSD: 0,
      },
      {
        date: '2024-01-02',
        valueARS: 0,
        valueUSD: 2050,
        valueARSRaw: 0,
        valueUSDRaw: 2050,
        cashARS: 0,
        cashUSD: 1000,
      },
    ]);

    // Mock invested capital history
    mockCalculateDailyInvestedCapital.mockReturnValue([
      {
        date: '2024-01-01',
        investedARS: 0,
        investedUSD: 1000,
      },
      {
        date: '2024-01-02',
        investedARS: 0,
        investedUSD: 1000,
      },
    ]);

    const result = await calculatePortfolioSummaryHistory(mockTransactions, mockPriceHistory);

    expect(result).toEqual([
      {
        date: '2024-01-01',
        totalARS: 0,
        totalUSD: 1020,
        investedARS: 0,
        investedUSD: 1000,
        cashARS: 0, // igual al mock
        cashUSD: 0, // igual al mock
      },
      {
        date: '2024-01-02',
        totalARS: 0,
        totalUSD: 2050,
        investedARS: 0,
        investedUSD: 1000,
        cashARS: 0, // igual al mock
        cashUSD: 1000, // igual al mock
      },
    ]);
  });

  it('handles options with custom date range', async () => {
    mockCalculatePortfolioValueHistory.mockResolvedValue([
      {
        date: '2024-01-15',
        valueARS: 50000,
        valueUSD: 1000,
        valueARSRaw: 50000,
        valueUSDRaw: 1000,
        cashARS: 10000,
        cashUSD: 200,
      },
    ]);

    mockCalculateDailyInvestedCapital.mockReturnValue([
      {
        date: '2024-01-15',
        investedARS: 40000,
        investedUSD: 800,
      },
    ]);

    const result = await calculatePortfolioSummaryHistory(mockTransactions, mockPriceHistory, {
      startDate: '2024-01-15',
      endDate: '2024-01-15',
    });

    expect(result).toEqual([
      {
        date: '2024-01-15',
        totalARS: 50000,
        totalUSD: 1000,
        investedARS: 40000,
        investedUSD: 800,
        cashARS: 10000,
        cashUSD: 200,
      },
    ]);

    expect(mockCalculateDailyInvestedCapital).toHaveBeenCalledWith(
      mockTransactions,
      '2024-01-15',
      '2024-01-15'
    );
  });

  it('handles options with days parameter', async () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29); // 30 days ago

    mockCalculatePortfolioValueHistory.mockResolvedValue([
      {
        date: startDate.toISOString().split('T')[0],
        valueARS: 100000,
        valueUSD: 2000,
        valueARSRaw: 100000,
        valueUSDRaw: 2000,
        cashARS: 20000,
        cashUSD: 400,
      },
    ]);

    mockCalculateDailyInvestedCapital.mockReturnValue([
      {
        date: startDate.toISOString().split('T')[0],
        investedARS: 80000,
        investedUSD: 1600,
      },
    ]);

    await calculatePortfolioSummaryHistory(mockTransactions, mockPriceHistory, {
      days: 30,
    });

    expect(mockCalculateDailyInvestedCapital).toHaveBeenCalledWith(
      mockTransactions,
      expect.any(String), // startDate
      expect.any(String)  // endDate
    );
  });

  it('uses cash values from portfolio value history', async () => {
    mockCalculatePortfolioValueHistory.mockResolvedValue([
      {
        date: '2024-01-01',
        valueARS: 100000,
        valueUSD: 2000,
        valueARSRaw: 100000,
        valueUSDRaw: 2000,
        cashARS: 20000,
        cashUSD: 400,
      },
    ]);

    mockCalculateDailyInvestedCapital.mockReturnValue([
      {
        date: '2024-01-01',
        investedARS: 80000,
        investedUSD: 1600,
      },
    ]);

    const result = await calculatePortfolioSummaryHistory(mockTransactions, mockPriceHistory);

    expect(result[0].cashARS).toBe(20000); // igual al mock
    expect(result[0].cashUSD).toBe(400);   // igual al mock
  });

  it('handles missing invested capital data gracefully', async () => {
    mockCalculatePortfolioValueHistory.mockResolvedValue([
      {
        date: '2024-01-01',
        valueARS: 100000,
        valueUSD: 2000,
        valueARSRaw: 100000,
        valueUSDRaw: 2000,
        cashARS: 20000,
        cashUSD: 400,
      },
    ]);

    mockCalculateDailyInvestedCapital.mockReturnValue([]);

    const result = await calculatePortfolioSummaryHistory(mockTransactions, mockPriceHistory);

    expect(result).toEqual([
      {
        date: '2024-01-01',
        totalARS: 100000,
        totalUSD: 2000,
        investedARS: 0,
        investedUSD: 0,
        cashARS: 20000,
        cashUSD: 400,
      },
    ]);
  });
}); 