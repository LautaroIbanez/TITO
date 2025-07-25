import { render, screen } from '@testing-library/react';
import AvailableCapitalIndicator from '../AvailableCapitalIndicator';
import { usePortfolio } from '../../contexts/PortfolioContext';

// Mock the context
jest.mock('../../contexts/PortfolioContext');

const mockUsePortfolio = require('../../contexts/PortfolioContext').usePortfolio;

describe('AvailableCapitalIndicator', () => {
  const mockPortfolioData = {
    cash: { ARS: 100000, USD: 50000 },
    positions: [],
    transactions: []
  };

  const mockStrategy = {
    targetAllocation: {
      stocks: 30,
      bonds: 20,
      deposits: 25,
      cash: 25
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders mutualFunds allocation using deposits allocation', () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      strategy: mockStrategy
    });

    render(<AvailableCapitalIndicator assetClass="mutualFunds" currency="ARS" />);

    // Should show 25% of 100000 ARS = 25000 ARS (es-AR locale uses dots for thousands)
    expect(screen.getByText('Capital disponible (ARS): $25.000,00')).toBeInTheDocument();
  });

  it('renders mutualFunds allocation in USD', () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      strategy: mockStrategy
    });

    render(<AvailableCapitalIndicator assetClass="mutualFunds" currency="USD" />);

    // Should show 25% of 50000 USD = 12500 USD (en-US locale uses commas for thousands)
    expect(screen.getByText('Capital disponible (USD): US$12,500.00')).toBeInTheDocument();
  });

  it('returns null when portfolio data is missing', () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: null,
      strategy: mockStrategy
    });

    const { container } = render(<AvailableCapitalIndicator assetClass="mutualFunds" currency="ARS" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when strategy is missing', () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      strategy: null
    });

    const { container } = render(<AvailableCapitalIndicator assetClass="mutualFunds" currency="ARS" />);
    expect(container.firstChild).toBeNull();
  });
}); 