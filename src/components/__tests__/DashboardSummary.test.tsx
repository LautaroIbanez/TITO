import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardSummary from '../DashboardSummary';
import { PortfolioProvider } from '../../contexts/PortfolioContext';
import { ScoopProvider } from '../../contexts/ScoopContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { calculatePortfolioValueHistory, calculateCurrentValueByCurrency } from '../../utils/calculatePortfolioValue';
import { calculatePortfolioPerformance, fetchInflationData } from '../../utils/portfolioPerformance';
import { UserData, PortfolioTransaction, FixedTermDepositCreationTransaction } from '@/types';
import { calculateInvestedCapital } from '../../utils/investedCapital';
import { calculatePortfolioSummaryHistory } from '../../utils/portfolioSummaryHistory';
import { renderHook, act } from '@testing-library/react-hooks';
import { usePortfolioHistory } from '../usePortfolioHistory';

// Mock the hooks and utilities
jest.mock('../../contexts/PortfolioContext');
jest.mock('../../utils/calculatePortfolioValue');
jest.mock('../../utils/portfolioPerformance');
jest.mock('../../utils/investedCapital', () => ({
  calculateInvestedCapital: jest.fn(),
  calculateDailyInvestedCapital: jest.fn(),
}));
jest.mock('../../utils/currency');
jest.mock('../../utils/portfolioSummaryHistory', () => ({
  calculatePortfolioSummaryHistory: jest.fn(),
}));

const mockUsePortfolio = usePortfolio as jest.Mock;
const mockCalculatePortfolioValueHistory = calculatePortfolioValueHistory as jest.Mock;
const mockCalculateCurrentValueByCurrency = calculateCurrentValueByCurrency as jest.Mock;
const mockCalculatePortfolioPerformance = calculatePortfolioPerformance as jest.Mock;
const mockFetchInflationData = fetchInflationData as jest.Mock;
const mockCalculateInvestedCapital = calculateInvestedCapital as jest.Mock;
const mockCalculateDailyInvestedCapital = require('../../utils/investedCapital').calculateDailyInvestedCapital as jest.Mock;
const mockCalculatePortfolioSummaryHistory = calculatePortfolioSummaryHistory as jest.Mock;

// Mock chart components to avoid canvas context issues
jest.mock('../PortfolioHistoryChart', () => {
  return function MockPortfolioHistoryChart() {
    return <div data-testid="portfolio-history-chart">Portfolio History Chart</div>;
  };
});

jest.mock('../PortfolioPieChart', () => {
  return function MockPortfolioPieChart() {
    return <div data-testid="portfolio-pie-chart">Portfolio Pie Chart</div>;
  };
});

jest.mock('../ReturnComparison', () => {
  return function MockReturnComparison() {
    return <div data-testid="return-comparison">Return Comparison</div>;
  };
});

jest.mock('../PortfolioCategoryChart', () => {
  return function MockPortfolioCategoryChart() {
    return <div data-testid="portfolio-category-chart">Portfolio Category Chart</div>;
  };
});

// Mock canvas context to avoid test environment errors
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4) })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  })),
});

const mockPortfolioData = {
  stocks: [
    {
      symbol: 'AAPL',
      shares: 10,
      purchasePrice: 150,
      currentPrice: 160,
      currency: 'USD',
    },
  ],
  bonds: [],
  deposits: [],
  transactions: [
    {
      id: '1',
      type: 'buy',
      symbol: 'AAPL',
      shares: 10,
      price: 150,
      date: '2024-01-01',
      currency: 'USD',
    },
  ],
};

const mockScoopData = {
  stocks: [],
  bonds: [],
  deposits: [],
};

describe('DashboardSummary', () => {
  const mockTransactions: PortfolioTransaction[] = [
    { id: '1', type: 'Deposit', amount: 10000, date: '2023-01-01', currency: 'ARS' }, // Net contribution: +10000
    { id: '2', type: 'Buy', assetType: 'Stock', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-02', currency: 'ARS', market: 'BCBA' }, // Net contribution: +1500
    { id: '3', type: 'Create', assetType: 'FixedTermDeposit', provider: 'Test Bank', amount: 5000, annualRate: 0.03, termDays: 90, date: '2023-01-03', maturityDate: '2023-04-03', currency: 'ARS' } as FixedTermDepositCreationTransaction, // Net contribution: +5000
    { id: '4', type: 'Sell', assetType: 'Stock', symbol: 'AAPL', quantity: 5, price: 160, date: '2023-01-04', currency: 'ARS', market: 'BCBA' }, // Net contribution: -800
  ];
  // Total Net Contributions = 10000 + 1500 + 5000 - 800 = 15700
  // Invested Capital (old calculation) = 1500 + 5000 - 800 = 5700

  const maturedDeposit = {
    type: 'FixedTermDeposit' as const,
    id: 'ftd-1',
    provider: 'Bank',
    amount: 10000,
    annualRate: 36.5,
    startDate: '2023-01-01',
    maturityDate: '2023-12-31',
    currency: 'ARS' as const,
  };

  // Use PortfolioData type from PortfolioContext
  const mockPortfolioData = {
    username: 'testuser',
    createdAt: '2023-01-01',
    profileCompleted: true,
    positions: [maturedDeposit],
    transactions: mockTransactions,
    cash: { ARS: 4300, USD: 0 },
    historicalPrices: {},
    fundamentals: {},
    technicals: {},
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock the current value by currency calculation
    mockCalculateCurrentValueByCurrency.mockReturnValue({ ARS: 7000, USD: 0 });
    
    // Mock the portfolio value history calculation
    // Let's say the current total value is 7000
    mockCalculatePortfolioValueHistory.mockReturnValue([
      { date: '2023-01-01', valueARS: 5000, valueUSD: 0, valueARSRaw: 5000, valueUSDRaw: 0, cashARS: 2500, cashUSD: 0 },
      { date: '2023-02-01', valueARS: 6000, valueUSD: 0, valueARSRaw: 6000, valueUSDRaw: 0, cashARS: 3000, cashUSD: 0 },
      { date: '2023-03-31', valueARS: 7000, valueUSD: 0, valueARSRaw: 7000, valueUSDRaw: 0, cashARS: 3500, cashUSD: 0 }
    ]);
    
    // Mock the portfolio summary history calculation
    mockCalculatePortfolioSummaryHistory.mockResolvedValue([
      { date: '2023-01-01', totalARS: 5000, totalUSD: 0, investedARS: 3000, investedUSD: 0, cashARS: 2000, cashUSD: 0 },
      { date: '2023-02-01', totalARS: 6000, totalUSD: 0, investedARS: 3500, investedUSD: 0, cashARS: 2500, cashUSD: 0 },
      { date: '2023-03-31', totalARS: 7000, totalUSD: 0, investedARS: 4000, investedUSD: 0, cashARS: 3000, cashUSD: 0 }
    ]);
    
    // Mock performance calculations - always return a valid object
    mockCalculatePortfolioPerformance.mockReturnValue({
      monthlyReturnARS: 5.2,
      monthlyReturnUSD: 3.1,
      annualReturnARS: 15.8,
      annualReturnUSD: 12.4,
      monthlyReturnARSReal: 1.0,
      monthlyReturnUSDReal: 2.8,
      annualReturnARSReal: -126.9,
      annualReturnUSDReal: 9.3,
    });
    
    // Mock invested capital and portfolio value
    mockCalculateInvestedCapital.mockImplementation((txs, currency) => currency === 'ARS' ? 1500 : 0);
    mockCalculateDailyInvestedCapital.mockReturnValue([
      { date: '2023-01-01', investedARS: 3000, investedUSD: 0 },
      { date: '2023-02-01', investedARS: 3500, investedUSD: 0 },
      { date: '2023-03-31', investedARS: 4000, investedUSD: 0 }
    ]);
    mockCalculateCurrentValueByCurrency.mockReturnValue({ ARS: 1600, USD: 0 });
    
    // Mock inflation data fetch
    mockFetchInflationData.mockResolvedValue({
      argentina: { monthly: 4.2, annual: 142.7 },
      usa: { monthly: 0.3, annual: 3.1 }
    });
    
    // Mock API calls made by the component
    global.fetch = jest.fn((url) => {
      if (url.toString().includes('/api/bonds')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);
    });
    
    // Mock the usePortfolio hook
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      strategy: null,
      loading: false,
      error: null,
      portfolioVersion: 1,
      refreshPortfolio: jest.fn(),
      refreshStrategy: jest.fn(),
      triggerPortfolioUpdate: jest.fn(),
      strategyLoading: false,
      strategyError: null,
    });
  });

  it('renders portfolio summary with correct values', async () => {
    render(<DashboardSummary />);

    await waitFor(() => {
      expect(screen.getByText('Resumen del Portfolio')).toBeInTheDocument();
    });

    expect(screen.getByText('$1.600,00')).toBeInTheDocument(); // Portfolio value
    expect(screen.getByText('$1.500,00')).toBeInTheDocument(); // Invested capital
    expect(screen.getByText('$100,00')).toBeInTheDocument(); // Net gains
  });

  it('calculates net gains using invested capital', async () => {
    mockCalculateCurrentValueByCurrency.mockReturnValue({ ARS: 2000, USD: 0 });
    mockCalculateInvestedCapital.mockImplementation((txs, currency) => currency === 'ARS' ? 1800 : 0);
    render(<DashboardSummary />);
    await waitFor(() => {
      expect(screen.getByText('$200,00')).toBeInTheDocument(); // Net gains (2000 - 1800)
    });
  });

  it('handles negative net gains correctly', async () => {
    mockCalculateCurrentValueByCurrency.mockReturnValue({ ARS: 1400, USD: 0 });
    mockCalculateInvestedCapital.mockImplementation((txs, currency) => currency === 'ARS' ? 1500 : 0);
    render(<DashboardSummary />);
    await waitFor(() => {
      expect(screen.getByText('-$100,00')).toBeInTheDocument(); // Net gains (1400 - 1500)
    });
  });

  it('displays performance metrics when available', async () => {
    render(<DashboardSummary />);

    await waitFor(() => {
      expect(screen.getByText('Rendimiento')).toBeInTheDocument();
      expect(screen.getByText('6.67%')).toBeInTheDocument(); // Total return percentage
      expect(screen.getByText('8.5%')).toBeInTheDocument(); // Annualized return
    });
  });

  it('handles missing performance metrics gracefully', async () => {
    mockCalculatePortfolioPerformance.mockReturnValue(null);

    render(<DashboardSummary />);

    await waitFor(() => {
      expect(screen.getByText('Resumen del Portfolio')).toBeInTheDocument();
      expect(screen.getByText('$1.600,00')).toBeInTheDocument(); // Portfolio value
      expect(screen.getByText('$1.500,00')).toBeInTheDocument(); // Invested capital
      expect(screen.getByText('$100,00')).toBeInTheDocument(); // Net gains
    });

    // Performance section should not be rendered when metrics are null
    expect(screen.queryByText('Rendimiento')).not.toBeInTheDocument();
  });

  it('renders chart components', async () => {
    render(<DashboardSummary />);

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-history-chart')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('return-comparison')).toBeInTheDocument();
    });
  });

  it('formats currency values correctly', async () => {
    mockCalculateCurrentValueByCurrency.mockReturnValue({ ARS: 1234567.89, USD: 0 });
    mockCalculateInvestedCapital.mockImplementation((txs, currency) => currency === 'ARS' ? 1000000 : 0);
    render(<DashboardSummary />);
    await waitFor(() => {
      expect(screen.getByText('$1.234.567,89')).toBeInTheDocument(); // Portfolio value
      expect(screen.getByText('$1.000.000,00')).toBeInTheDocument(); // Invested capital
      expect(screen.getByText('$234.567,89')).toBeInTheDocument(); // Net gains
    });
  });

  it('should log a warning and not update state if a non-finite value is returned', async () => {
    mockCalculateCurrentValueByCurrency.mockReturnValueOnce({ ARS: NaN, USD: Infinity });
    mockCalculateInvestedCapital.mockImplementation((txs, currency) => currency === 'ARS' ? NaN : Infinity);
    mockCalculatePortfolioPerformance.mockReturnValueOnce({
      monthlyReturnARS: NaN,
      monthlyReturnUSD: Infinity,
      annualReturnARS: NaN,
      annualReturnUSD: Infinity,
      monthlyReturnARSReal: NaN,
      monthlyReturnUSDReal: Infinity,
      annualReturnARSReal: NaN,
      annualReturnUSDReal: Infinity,
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<DashboardSummary />);
    await waitFor(() => {
      // Should log warnings for each non-finite value
      expect(warnSpy).toHaveBeenCalled();
      // UI should fallback to 0 or not show NaN/Infinity
      expect(screen.getByText('$0,00')).toBeInTheDocument();
    });
    warnSpy.mockRestore();
  });

  it('should display Spanish asset class labels for recommendations', async () => {
    // Mock strategy with recommendations that have assetClass
    const mockStrategyWithRecommendations = {
      id: 'strategy-1',
      createdAt: '2024-01-01',
      targetAllocation: { stocks: 60, bonds: 30, deposits: 5, cash: 5 },
      recommendations: [
        {
          id: 'rec-1',
          action: 'increase' as const,
          assetClass: 'stocks' as const,
          reason: 'Test recommendation',
          priority: 'high' as const,
          expectedImpact: 'positive' as const
        },
        {
          id: 'cash-invest-123',
          action: 'buy' as const,
          reason: 'Cash investment recommendation',
          priority: 'medium' as const,
          expectedImpact: 'positive' as const
        }
      ],
      riskLevel: 'Balanceado' as const,
      timeHorizon: '5-10 años',
      notes: 'Test strategy'
    };

    // Mock performance calculations for this test
    mockCalculatePortfolioPerformance.mockReturnValue({
      monthlyReturnARS: 5.2,
      monthlyReturnUSD: 3.1,
      annualReturnARS: 15.8,
      annualReturnUSD: 12.4,
      monthlyReturnARSReal: 1.0,
      monthlyReturnUSDReal: 2.8,
      annualReturnARSReal: -126.9,
      annualReturnUSDReal: 9.3,
    });

    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      strategy: mockStrategyWithRecommendations,
      loading: false,
      error: null,
      portfolioVersion: 1,
      refreshPortfolio: jest.fn(),
      refreshStrategy: jest.fn(),
      triggerPortfolioUpdate: jest.fn(),
      strategyLoading: false,
      strategyError: null,
    });

    render(<DashboardSummary />);

    await waitFor(() => {
      // Should display "Acciones" for stocks asset class
      expect(screen.getByText('Acciones')).toBeInTheDocument();
      // Should display "Efectivo" for cash recommendations (based on ID starting with 'cash-')
      expect(screen.getByText('Efectivo')).toBeInTheDocument();
    });
  });
});

describe('usePortfolioHistory', () => {
  it('should clear history and error when username is undefined', () => {
    const { result, rerender } = renderHook(({ username }: { username?: string }) => usePortfolioHistory(username), {
      initialProps: { username: undefined },
    });
    expect(result.current.history).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);

    // Should remain clear if username stays falsy
    rerender({ username: undefined });
    expect(result.current.history).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
}); 