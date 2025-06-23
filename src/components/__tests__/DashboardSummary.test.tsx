import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardSummary from '../DashboardSummary';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { calculatePortfolioValueHistory } from '../../utils/calculatePortfolioValue';
import { UserData, PortfolioTransaction, FixedTermDepositCreationTransaction } from '@/types';

// Mock the hooks and utilities
jest.mock('../../contexts/PortfolioContext');
jest.mock('../../utils/calculatePortfolioValue');

const mockUsePortfolio = usePortfolio as jest.Mock;
const mockCalculatePortfolioValueHistory = calculatePortfolioValueHistory as jest.Mock;

describe('DashboardSummary', () => {
  const mockTransactions: PortfolioTransaction[] = [
    { id: '1', type: 'Deposit', amount: 10000, date: '2023-01-01' },
    { id: '2', type: 'Buy', assetType: 'Stock', symbol: 'AAPL', quantity: 10, price: 150, date: '2023-01-02' }, // Invested: 1500
    { id: '3', type: 'Create', assetType: 'FixedTermDeposit', provider: 'Test Bank', amount: 5000, annualRate: 0.03, termDays: 90, date: '2023-01-03', maturityDate: '2023-04-03' } as FixedTermDepositCreationTransaction, // Invested: 5000
    { id: '4', type: 'Sell', assetType: 'Stock', symbol: 'AAPL', quantity: 5, price: 160, date: '2023-01-04' }, // Invested: -800
  ];
  // Total Invested Capital = 1500 + 5000 - 800 = 5700

  const mockPortfolioData: Omit<UserData, 'goals' | 'investmentStrategy' | 'profile'> & { goals?: any[], investmentStrategy?: any, profile?: any } = {
    username: 'testuser',
    createdAt: '2023-01-01',
    profileCompleted: true,
    positions: [],
    transactions: mockTransactions,
    availableCash: 4300, 
  };


  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock the portfolio value history calculation
    // Let's say the current total value is 7000
    mockCalculatePortfolioValueHistory.mockReturnValue([{ date: '2023-03-31', value: 7000 }]);
    
    // Mock API calls made by the component
    global.fetch = jest.fn((url) => {
      if (url.toString().includes('/api/goals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.toString().includes('/api/bonds')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
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
      expect(screen.getByText('Capital Invertido')).toBeInTheDocument();
      expect(screen.getByText('$5,700.00')).toBeInTheDocument();
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
      expect(screen.getByText('Ganancias / Pérdidas')).toBeInTheDocument();
      expect(screen.getByText('+1,300.00')).toBeInTheDocument();
    });
  });
}); 