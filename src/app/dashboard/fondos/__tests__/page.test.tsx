import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FondosPage from '../page';

// Mock the context
jest.mock('../../../../contexts/PortfolioContext');
jest.mock('../../../../components/TradeModal', () => {
  return function MockTradeModal({ isOpen, onClose, onSubmit, assetName }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="trade-modal">
        <div>Modal for {assetName}</div>
        <button onClick={() => onSubmit(1000, 'MutualFund', 'test-fund', 'ARS')}>
          Submit
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});
jest.mock('../../../../components/AvailableCapitalIndicator', () => {
  return function MockAvailableCapitalIndicator() {
    return <div data-testid="available-capital">Available Capital</div>;
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockUsePortfolio = require('../../../../contexts/PortfolioContext').usePortfolio;

describe('FondosPage', () => {
  const mockPortfolioData = {
    cash: { ARS: 100000, USD: 50000 },
    positions: [],
    transactions: []
  };

  const mockMutualFundsData = {
    moneyMarket: [
      {
        fondo: 'MAF Liquidez - Clase A',
        tna: 38.1358,
        rendimiento_mensual: 1.7762,
        categoria: 'Money Market'
      }
    ],
    rentaFija: [
      {
        fondo: 'MAF Ahorro Plus - Clase C',
        tna: 103.6435,
        rendimiento_mensual: 43.6277,
        categoria: 'Renta Fija'
      }
    ],
    rentaVariable: [
      {
        fondo: 'Alpha Latam - Clase A',
        tna: 25.2159,
        rendimiento_mensual: -3.4227,
        categoria: 'Renta Variable'
      }
    ],
    rentaMixta: [
      {
        fondo: 'Schroder Retorno Absoluto Dólares - Clase B',
        tna: 6.2266,
        rendimiento_mensual: -4.3686,
        categoria: 'Renta Mixta'
      }
    ],
    otros: [
      {
        fondo: 'SUPERVIELLE',
        tna: 0.32,
        rendimiento_mensual: 0,
        categoria: 'Otros'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      loading: false,
      refreshPortfolio: jest.fn()
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify({ username: 'testuser' }))
      },
      writable: true
    });
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    render(<FondosPage />);
    expect(screen.getByText('Cargando fondos mutuos...')).toBeInTheDocument();
  });

  it('renders mutual funds data correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMutualFundsData
    });

    render(<FondosPage />);

    await waitFor(() => {
      expect(screen.getByText('MAF Liquidez - Clase A')).toBeInTheDocument();
    });

    expect(screen.getByText('MAF Ahorro Plus - Clase C')).toBeInTheDocument();
    expect(screen.getByText('Alpha Latam - Clase A')).toBeInTheDocument();
    expect(screen.getByText('Schroder Retorno Absoluto Dólares - Clase B')).toBeInTheDocument();
    expect(screen.getByText('SUPERVIELLE')).toBeInTheDocument();
  });

  it('renders category sections correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMutualFundsData
    });

    render(<FondosPage />);

    await waitFor(() => {
      expect(screen.getByText('Money Market')).toBeInTheDocument();
      expect(screen.getByText('Renta Fija')).toBeInTheDocument();
      expect(screen.getByText('Renta Variable')).toBeInTheDocument();
      expect(screen.getByText('Renta Mixta')).toBeInTheDocument();
      expect(screen.getByText('Otros')).toBeInTheDocument();
    });
  });

  it('displays fund information correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMutualFundsData
    });

    render(<FondosPage />);

    await waitFor(() => {
      expect(screen.getByText('38.14%')).toBeInTheDocument();
      expect(screen.getAllByText('TNA')).toHaveLength(5); // 5 funds total
      expect(screen.getByText('Rendimiento mensual: 1.78%')).toBeInTheDocument();
    });
  });

  it('opens modal when clicking Comprar button', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMutualFundsData
    });

    render(<FondosPage />);

    await waitFor(() => {
      const buyButtons = screen.getAllByText('Comprar');
      fireEvent.click(buyButtons[0]);
    });

    expect(screen.getByTestId('trade-modal')).toBeInTheDocument();
    expect(screen.getByText('Modal for MAF Liquidez - Clase A')).toBeInTheDocument();
  });

  it('handles API error correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch data' })
    });

    render(<FondosPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('handles network error correctly', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<FondosPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('submits mutual fund purchase correctly', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMutualFundsData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    const mockRefreshPortfolio = jest.fn();
    mockUsePortfolio.mockReturnValue({
      portfolioData: mockPortfolioData,
      loading: false,
      refreshPortfolio: mockRefreshPortfolio
    });

    render(<FondosPage />);

    await waitFor(() => {
      const buyButtons = screen.getAllByText('Comprar');
      fireEvent.click(buyButtons[0]);
    });

    await waitFor(() => {
      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/portfolio/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          assetType: 'MutualFund',
          name: 'MAF Liquidez - Clase A',
          category: 'Money Market',
          amount: 1000,
          annualRate: 38.1358,
          currency: 'ARS'
        })
      });
    });

    expect(mockRefreshPortfolio).toHaveBeenCalled();
  });

  it('disables buy button when insufficient funds', async () => {
    mockUsePortfolio.mockReturnValue({
      portfolioData: { ...mockPortfolioData, cash: { ARS: 0, USD: 0 } },
      loading: false,
      refreshPortfolio: jest.fn()
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMutualFundsData
    });

    render(<FondosPage />);

    await waitFor(() => {
      const buyButtons = screen.getAllByText('Comprar');
      expect(buyButtons[0]).toBeDisabled();
    });
  });
}); 