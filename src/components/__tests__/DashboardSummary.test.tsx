import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardSummary from '../DashboardSummary';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { calculatePortfolioValueHistory, calculateCurrentValueByCurrency } from '../../utils/calculatePortfolioValue';
import { calculatePortfolioPerformance, fetchInflationData } from '../../utils/portfolioPerformance';
import { UserData, PortfolioTransaction, FixedTermDepositCreationTransaction } from '@/types';

// Mock the hooks and utilities
jest.mock('../../contexts/PortfolioContext');
jest.mock('../../utils/calculatePortfolioValue');
jest.mock('../../utils/portfolioPerformance');

const mockUsePortfolio = usePortfolio as jest.Mock;
const mockCalculatePortfolioValueHistory = calculatePortfolioValueHistory as jest.Mock;
const mockCalculateCurrentValueByCurrency = calculateCurrentValueByCurrency as jest.Mock;
const mockCalculatePortfolioPerformance = calculatePortfolioPerformance as jest.Mock;
const mockFetchInflationData = fetchInflationData as jest.Mock;

describe('DashboardSummary', () => {
  const mockTransactions: PortfolioTransaction[] = [
    { id: '1', type: 'Deposit', amount: 10000, date: '2023-01-01', currency: 'ARS' },
    { id: '2', type: 'Buy', assetType: 'Stock', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-02', currency: 'ARS', market: 'BCBA' }, // Invested: 1500
    { id: '3', type: 'Create', assetType: 'FixedTermDeposit', provider: 'Test Bank', amount: 5000, annualRate: 0.03, termDays: 90, date: '2023-01-03', maturityDate: '2023-04-03', currency: 'ARS' } as FixedTermDepositCreationTransaction, // Invested: 5000
    { id: '4', type: 'Sell', assetType: 'Stock', symbol: 'AAPL', quantity: 5, price: 160, date: '2023-01-04', currency: 'ARS', market: 'BCBA' }, // Invested: -800
  ];
  // Total Invested Capital = 1500 + 5000 - 800 = 5700

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

  const mockPortfolioData: Omit<UserData, 'goals' | 'investmentStrategy' | 'profile'> & { goals?: any[], investmentStrategy?: any, profile?: any } = {
    username: 'testuser',
    createdAt: '2023-01-01',
    profileCompleted: true,
    positions: [maturedDeposit],
    transactions: mockTransactions,
    cash: { ARS: 4300, USD: 0 },
  };


  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock the current value by currency calculation
    mockCalculateCurrentValueByCurrency.mockReturnValue({ ARS: 7000, USD: 0 });
    
    // Mock the portfolio value history calculation
    // Let's say the current total value is 7000
    mockCalculatePortfolioValueHistory.mockReturnValue([{ date: '2023-03-31', value: 7000 }]);
    
    // Mock performance calculations
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
    
    // Mock inflation data fetch
    mockFetchInflationData.mockResolvedValue({
      argentina: { monthly: 4.2, annual: 142.7 },
      usa: { monthly: 0.3, annual: 3.1 }
    });
    
    // Mock API calls made by the component
    global.fetch = jest.fn((url) => {
      if (url.toString().includes('/api/goals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.toString().includes('/api/bonds')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.toString().includes('/api/inflation')) {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve({
            argentina: { monthly: 4.2, annual: 142.7 },
            usa: { monthly: 0.3, annual: 3.1 }
          })
        });
      }
      return Promise.resolve({ ok: false });
    }) as jest.Mock;

    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => JSON.stringify({ username: 'testuser' }));
  });

  it('should correctly calculate and display Invested Capital based on transactions', async () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      loading: false,
      error: null,
    });

    render(<DashboardSummary />);

    // Wait for the component to process data
    await waitFor(() => {
      // Invested capital should be 5700 from our manual calculation
      expect(screen.getByText('Capital Invertido (ARS)')).toBeInTheDocument();
      expect(screen.getByText('$5,700.00')).toBeInTheDocument();
      // USD section should also be present
      expect(screen.getByText('Capital Invertido (USD)')).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  it('should correctly calculate and display Net Gains', async () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      loading: false,
      error: null,
    });

    render(<DashboardSummary />);

    // Wait for the component to process data
    await waitFor(() => {
      // Portfolio Value (7000) - Invested Capital (5700) = 1300
      expect(screen.getByText('Ganancias / Pérdidas (ARS)')).toBeInTheDocument();
      expect(screen.getByText('+1,300.00')).toBeInTheDocument();
      // USD section should also be present
      expect(screen.getByText('Ganancias / Pérdidas (USD)')).toBeInTheDocument();
      expect(screen.getByText('+0.00')).toBeInTheDocument();
    });
  });

  it('should display performance metrics when available', async () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      loading: false,
      error: null,
    });

    render(<DashboardSummary />);

    await waitFor(() => {
      // Check for performance section headers
      expect(screen.getByText('Rendimiento Mensual (ARS)')).toBeInTheDocument();
      expect(screen.getByText('Rendimiento Mensual (USD)')).toBeInTheDocument();
      expect(screen.getByText('Rendimiento Anual (ARS)')).toBeInTheDocument();
      expect(screen.getByText('Rendimiento Anual (USD)')).toBeInTheDocument();
      
      // Check for performance values
      expect(screen.getByText('+5.20%')).toBeInTheDocument();
      expect(screen.getByText('+3.10%')).toBeInTheDocument();
      expect(screen.getByText('+15.80%')).toBeInTheDocument();
      expect(screen.getByText('+12.40%')).toBeInTheDocument();
    });
  });

  it('should display real returns when inflation data is available', async () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      loading: false,
      error: null,
    });

    render(<DashboardSummary />);

    await waitFor(() => {
      // Check for real return values
      expect(screen.getByText('Real: +1.00%')).toBeInTheDocument();
      expect(screen.getByText('Real: +2.80%')).toBeInTheDocument();
      expect(screen.getByText('Real: -126.90%')).toBeInTheDocument();
      expect(screen.getByText('Real: +9.30%')).toBeInTheDocument();
    });
  });

  it('should display inflation data when available', async () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      loading: false,
      error: null,
    });

    render(<DashboardSummary />);

    await waitFor(() => {
      // Check for inflation section headers
      expect(screen.getByText('Inflación Argentina')).toBeInTheDocument();
      expect(screen.getByText('Inflación EE.UU.')).toBeInTheDocument();
      
      // Check for inflation values
      expect(screen.getByText('+4.2%')).toBeInTheDocument(); // Argentina monthly
      expect(screen.getByText('+142.7%')).toBeInTheDocument(); // Argentina annual
      expect(screen.getByText('+0.3%')).toBeInTheDocument(); // USA monthly
      expect(screen.getByText('+3.1%')).toBeInTheDocument(); // USA annual
    });
  });

  it('should not display performance metrics when portfolio data is not available', () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: null,
      loading: false,
      error: null,
    });

    render(<DashboardSummary />);

    expect(screen.queryByText('Rendimiento Mensual (ARS)')).not.toBeInTheDocument();
    expect(screen.queryByText('Inflación Argentina')).not.toBeInTheDocument();
  });

  it('should include principal + interest for matured fixed-term deposits in portfolio value', async () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      loading: false,
      error: null,
    });

    // Calculate expected payout
    const startDate = new Date(maturedDeposit.startDate);
    const maturityDate = new Date(maturedDeposit.maturityDate);
    const days = Math.round((maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = maturedDeposit.annualRate / 100 / 365;
    const interest = maturedDeposit.amount * dailyRate * days;
    const expectedValue = maturedDeposit.amount + interest + 4300; // plus cash

    render(<DashboardSummary />);

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`\\$${expectedValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`))).toBeInTheDocument();
    });
  });
}); 