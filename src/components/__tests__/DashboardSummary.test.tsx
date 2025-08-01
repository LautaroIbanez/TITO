import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardSummary from '../DashboardSummary';
import { PortfolioProvider } from '../../contexts/PortfolioContext';
import { ScoopProvider } from '../../contexts/ScoopContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { calculatePortfolioValueHistory, calculateCurrentValueByCurrency } from '../../utils/calculatePortfolioValue';
import { calculatePortfolioPerformance, fetchInflationData, formatPerformance } from '../../utils/portfolioPerformance';
import { UserData, PortfolioTransaction, FixedTermDepositCreationTransaction } from '@/types';
import { calculateInvestedCapitalFromPositions } from '../../utils/calculateInvestedCapitalFromPositions';
import { formatCurrency } from '../../utils/goalCalculator';
import { calculatePortfolioSummaryHistory } from '../../utils/portfolioSummaryHistory';
import { renderHook, act } from '@testing-library/react-hooks';
import { usePortfolioHistory } from '../usePortfolioHistory';
import { getLatestPortfolioSnapshot } from '../../utils/portfolioHistoryClient';

// Mock the hooks and utilities
jest.mock('../../contexts/PortfolioContext');
jest.mock('../../utils/calculatePortfolioValue');
jest.mock('../../utils/portfolioPerformance', () => ({
  calculatePortfolioPerformance: jest.fn(),
  fetchInflationData: jest.fn(),
  formatPerformance: jest.fn((value) => ({
    color: value >= 0 ? 'text-green-600' : 'text-red-600',
    formatted: `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }))
}));
jest.mock('../../utils/calculateInvestedCapitalFromPositions', () => ({
  calculateInvestedCapitalFromPositions: jest.fn(),
}));
jest.mock('../../utils/currency');
jest.mock('../../utils/goalCalculator', () => ({
  formatCurrency: jest.fn((value, currency) => {
    if (currency === 'ARS') {
      return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `US$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }),
}));
jest.mock('../../utils/portfolioSummaryHistory', () => ({
  calculatePortfolioSummaryHistory: jest.fn(),
}));
jest.mock('../../utils/portfolioHistoryClient', () => ({
  getLatestPortfolioSnapshot: jest.fn(),
}));

jest.mock('../../utils/positionGains', () => ({
  getPortfolioNetGains: jest.fn(() => ({
    positionGains: new Map(),
    totals: { ARS: 0, USD: 0 },
    excludedPositions: []
  }))
}));

jest.mock('../../utils/netGainsCalculator', () => ({
  getLatestCumulativeNetGains: jest.fn(() => ({
    cumulativeARS: 0,
    cumulativeUSD: 0
  }))
}));

const mockUsePortfolio = usePortfolio as jest.Mock;
const mockCalculatePortfolioValueHistory = calculatePortfolioValueHistory as jest.Mock;
const mockCalculateCurrentValueByCurrency = calculateCurrentValueByCurrency as jest.Mock;
const mockCalculatePortfolioPerformance = calculatePortfolioPerformance as jest.Mock;
const mockFetchInflationData = fetchInflationData as jest.Mock;
const mockCalculateInvestedCapitalFromPositions = calculateInvestedCapitalFromPositions as jest.Mock;
const mockCalculatePortfolioSummaryHistory = calculatePortfolioSummaryHistory as jest.Mock;
const mockGetLatestPortfolioSnapshot = getLatestPortfolioSnapshot as jest.Mock;

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

jest.mock('../EconomicIndicators', () => {
  return function MockEconomicIndicators() {
    return <div data-testid="economic-indicators">Economic Indicators</div>;
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
    mockCalculateInvestedCapitalFromPositions.mockImplementation(() => ({ ARS: 1500, USD: 0 }));
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
      expect(screen.getByText('$5.800,00')).toBeInTheDocument(); // Portfolio value (1500 + 0 + 4300)
      expect(screen.getByText('$1.500,00')).toBeInTheDocument(); // Invested capital from positions
      expect(screen.getByText('+$0,00')).toBeInTheDocument(); // Net gains (no gains calculated for deposit)
    });
  });

  it('calculates net gains using position-based calculation', async () => {
    // Mock a stock position with gains
    const mockPortfolioDataWithGains = {
      ...mockPortfolioData,
      positions: [
        {
          type: 'Stock' as const,
          symbol: 'AAPL',
          quantity: 10,
          purchasePrice: 150,
          currency: 'USD' as const,
          market: 'NASDAQ' as const
        }
      ],
      historicalPrices: {
        'AAPL': [{ date: '2024-01-01', close: 160, open: 150, high: 165, low: 145, volume: 1000000 }]
      }
    };

    // Mock getPortfolioNetGains to return expected gains
    const { getPortfolioNetGains } = require('../../utils/positionGains');
    const mockGetPortfolioNetGains = getPortfolioNetGains as jest.Mock;
    mockGetPortfolioNetGains.mockReturnValue({
      positionGains: new Map([['AAPL-USD', 100]]),
      totals: { ARS: 0, USD: 100 },
      excludedPositions: []
    });

    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioDataWithGains,
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

    render(<DashboardSummary />);
    await waitFor(() => {
      expect(screen.getByText('US$100.00')).toBeInTheDocument(); // Net gains (160 - 150) * 10 in USD
    });
  });

  it('handles negative net gains correctly', async () => {
    // Mock a stock position with losses
    const mockPortfolioDataWithLosses = {
      ...mockPortfolioData,
      positions: [
        {
          type: 'Stock' as const,
          symbol: 'AAPL',
          quantity: 10,
          purchasePrice: 150,
          currency: 'USD' as const,
          market: 'NASDAQ' as const
        }
      ],
      historicalPrices: {
        'AAPL': [{ date: '2024-01-01', close: 140, open: 150, high: 155, low: 135, volume: 1000000 }]
      }
    };

    // Mock getPortfolioNetGains to return expected losses
    const { getPortfolioNetGains } = require('../../utils/positionGains');
    const mockGetPortfolioNetGains = getPortfolioNetGains as jest.Mock;
    mockGetPortfolioNetGains.mockReturnValue({
      positionGains: new Map([['AAPL-USD', -100]]),
      totals: { ARS: 0, USD: -100 },
      excludedPositions: []
    });

    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioDataWithLosses,
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

    render(<DashboardSummary />);
    await waitFor(() => {
      expect(screen.getAllByText('US$-100.00')).toHaveLength(2); // Net gains appears in both portfolio total and gains
    });
  });

  it('displays performance metrics when available', async () => {
    render(<DashboardSummary />);

    await waitFor(() => {
      expect(screen.getByText('Rendimiento Mensual (ARS)')).toBeInTheDocument();
      expect(screen.getByText('+5.20%')).toBeInTheDocument(); // Monthly return
      expect(screen.getByText('+15.80%')).toBeInTheDocument(); // Annual return
    });
  });

  it('handles missing performance metrics gracefully', async () => {
    mockCalculatePortfolioPerformance.mockReturnValue(null);

    render(<DashboardSummary />);

    await waitFor(() => {
      expect(screen.getByText('$5.800,00')).toBeInTheDocument(); // Portfolio value (1500 + 0 + 4300)
      expect(screen.getByText('$1.500,00')).toBeInTheDocument(); // Invested capital from positions
      expect(screen.getByText('+$0,00')).toBeInTheDocument(); // Net gains (no gains calculated for deposit)
    });

    // Performance section should not be rendered when metrics are null
    expect(screen.queryByText('Rendimiento')).not.toBeInTheDocument();
  });

  it('renders economic indicators', async () => {
    render(<DashboardSummary />);

    await waitFor(() => {
      expect(screen.getByTestId('economic-indicators')).toBeInTheDocument();
    });
  });

  it('formats currency values correctly', async () => {
    // Mock a stock position with large values
    const mockPortfolioDataWithLargeValues = {
      ...mockPortfolioData,
      positions: [
        {
          type: 'Stock' as const,
          symbol: 'AAPL',
          quantity: 1000,
          purchasePrice: 1000,
          currency: 'ARS' as const,
          market: 'BCBA' as const
        }
      ],
      historicalPrices: {
        'AAPL': [{ date: '2024-01-01', close: 1234.57, open: 1000, high: 1250, low: 950, volume: 1000000 }]
      }
    };

    // Mock calculateInvestedCapitalFromPositions to return expected values
    mockCalculateInvestedCapitalFromPositions.mockImplementation(() => ({ ARS: 1000000, USD: 0 }));

    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioDataWithLargeValues,
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

    render(<DashboardSummary />);
    await waitFor(() => {
      expect(screen.getByText('$1.004.300,00')).toBeInTheDocument(); // Portfolio value (1000000 + 0 + 4300)
      expect(screen.getByText('$1.000.000,00')).toBeInTheDocument(); // Invested capital
      expect(screen.getByText('+$0,00')).toBeInTheDocument(); // Net gains (no gains calculated)
    });
  });

  it('should log a warning and not update state if a non-finite value is returned', async () => {
    // Mock portfolio data with non-finite values
    const mockPortfolioDataWithNaN = {
      ...mockPortfolioData,
      positions: [
        {
          type: 'Stock' as const,
          symbol: 'AAPL',
          quantity: 10,
          purchasePrice: NaN,
          currency: 'USD' as const,
          market: 'NASDAQ' as const
        }
      ],
      historicalPrices: {}
    };

    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioDataWithNaN,
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

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<DashboardSummary />);
    await waitFor(() => {
      // Should log warnings for non-finite values
      expect(warnSpy).toHaveBeenCalled();
      // UI should fallback to 0 or not show NaN/Infinity
      expect(screen.getAllByText('$4.300,00')).toHaveLength(1); // Cash only
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

  it('calculates net gains using position-based formula', async () => {
    // This test verifies that the component uses position-based calculation
    // for calculating net gains
    render(<DashboardSummary />);

    await waitFor(() => {
      // Should display calculated values using position-based calculation
      expect(screen.getByText('$5.800,00')).toBeInTheDocument(); // Portfolio value (1500 + 0 + 4300)
      expect(screen.getByText('$1.500,00')).toBeInTheDocument(); // Invested capital from positions
      expect(screen.getByText('+$0,00')).toBeInTheDocument(); // Net gains (no gains calculated for deposit)
    });
  });

  it('uses getPortfolioNetGains for position-based calculations', async () => {
    // This test verifies that getPortfolioNetGains is called for position-based calculations
    const { getPortfolioNetGains } = require('../../utils/positionGains');
    const mockGetPortfolioNetGains = getPortfolioNetGains as jest.Mock;
    
    render(<DashboardSummary />);

    await waitFor(() => {
      // Should display calculated values using position-based calculation
      expect(screen.getByText('$5.800,00')).toBeInTheDocument(); // Portfolio value (1500 + 0 + 4300)
      expect(screen.getByText('$1.500,00')).toBeInTheDocument(); // Invested capital from positions
      expect(screen.getByText('+$0,00')).toBeInTheDocument(); // Net gains (no gains calculated for deposit)
    });

    // Verify that getPortfolioNetGains was called for position-based calculations
    expect(mockGetPortfolioNetGains).toHaveBeenCalledWith(
      mockPortfolioData.positions || [],
      mockPortfolioData.historicalPrices || {}
    );
  });

  it('verifies net gains come from getPortfolioNetGains and logs excluded positions', async () => {
    const { getPortfolioNetGains } = require('../../utils/positionGains');
    const mockGetPortfolioNetGains = getPortfolioNetGains as jest.Mock;
    
    // Mock getPortfolioNetGains to return excluded positions
    mockGetPortfolioNetGains.mockReturnValue({
      positionGains: new Map(),
      totals: { ARS: 0, USD: 0 },
      excludedPositions: [
        {
          position: {
            type: 'Stock',
            symbol: 'INVALID',
            quantity: 10,
            purchasePrice: 150,
            currency: 'USD',
            market: 'NASDAQ'
          },
          reason: 'No hay datos de precio disponibles'
        }
      ]
    });

    render(<DashboardSummary />);

    await waitFor(() => {
      // Should display warning for excluded positions
      expect(screen.getByText('Advertencia:')).toBeInTheDocument();
      expect(screen.getByText(/Stock INVALID: No hay datos de precio disponibles/)).toBeInTheDocument();
    });

    // Verify that getPortfolioNetGains was called
    expect(mockGetPortfolioNetGains).toHaveBeenCalledWith(
      mockPortfolioData.positions || [],
      mockPortfolioData.historicalPrices || {}
    );
  });

  it('shows warning for excluded positions', async () => {
    const mockPortfolioDataWithExcluded = {
      ...mockPortfolioData,
      positions: [
        {
          type: 'Stock' as const,
          symbol: 'INVALID',
          quantity: 10,
          purchasePrice: 150,
          currency: 'USD' as const,
          market: 'NASDAQ' as const
        }
      ],
      historicalPrices: {} // Empty prices will cause position to be excluded
    };

    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioDataWithExcluded,
      strategy: null,
      loading: false,
      error: null,
      portfolioVersion: 1,
    });

    render(<DashboardSummary />);

    await waitFor(() => {
      expect(screen.getByText('Advertencia:')).toBeInTheDocument();
      expect(screen.getByText(/Stock INVALID: No hay datos de precio disponibles/)).toBeInTheDocument();
    });
  });

  it('validates portfolio total calculation formula', async () => {
    // Test that validates the exact formula: valorTotal = capitalInvertido + gananciaNeta + efectivoDisponible
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    render(<DashboardSummary />);

    await waitFor(() => {
      // Verify that the portfolio total is calculated correctly
      // Expected: $1.500,00 (capital) + $0,00 (gains) + $4.300,00 (cash) = $5.800,00
      expect(screen.getByText('$5.800,00')).toBeInTheDocument(); // Valor Total del Portafolio (ARS)
      expect(screen.getByText('$1.500,00')).toBeInTheDocument(); // Capital Invertido (ARS)
      expect(screen.getByText('+$0,00')).toBeInTheDocument(); // Ganancias Netas (ARS)
      expect(screen.getByText('$4.300,00')).toBeInTheDocument(); // Efectivo Disponible (ARS)
    });

    // Verify that no calculation mismatch warnings were logged
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('PORTFOLIO TOTAL CALCULATION MISMATCH')
    );

    consoleSpy.mockRestore();
  });
});

 