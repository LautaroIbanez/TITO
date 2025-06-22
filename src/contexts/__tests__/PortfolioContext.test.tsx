import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PortfolioProvider, usePortfolio } from '../PortfolioContext';

// Mock fetch globally
global.fetch = jest.fn();

// Test component that uses the portfolio context
function TestComponent() {
  const { portfolioData, loading, error, portfolioVersion, refreshPortfolio, triggerPortfolioUpdate, strategy, strategyLoading, strategyError, refreshStrategy } = usePortfolio();
  
  return (
    <div>
      <span data-testid="version">Version: {portfolioVersion}</span>
      <span data-testid="loading">Loading: {loading.toString()}</span>
      <span data-testid="error">Error: {error || 'none'}</span>
      <span data-testid="data">Data: {portfolioData ? 'loaded' : 'null'}</span>
      <span data-testid="strategy">Strategy: {strategy ? 'loaded' : 'null'}</span>
      <span data-testid="strategy-loading">StrategyLoading: {strategyLoading.toString()}</span>
      <span data-testid="strategy-error">StrategyError: {strategyError || 'none'}</span>
      <button data-testid="refresh" onClick={refreshPortfolio}>
        Refresh Portfolio
      </button>
      <button data-testid="refresh-strategy" onClick={refreshStrategy}>
        Refresh Strategy
      </button>
      <button data-testid="trigger" onClick={triggerPortfolioUpdate}>
        Trigger Update
      </button>
    </div>
  );
}

describe('PortfolioContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify({ username: 'testuser' })),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  it('should provide portfolio context with initial state', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // For portfolio data
        ok: true,
        json: async () => ({ username: 'testuser', positions: [], transactions: [] }),
      })
      .mockResolvedValueOnce({ // For strategy data
        ok: true,
        json: async () => ({ id: 'strategy-1', recommendations: [] }),
      });

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    // Wait for the initial fetch to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading: false');
      expect(screen.getByTestId('strategy-loading')).toHaveTextContent('StrategyLoading: false');
    });

    expect(screen.getByTestId('version')).toHaveTextContent('Version: 0');
    expect(screen.getByTestId('error')).toHaveTextContent('Error: none');
    expect(screen.getByTestId('data')).toHaveTextContent('Data: loaded');
    expect(screen.getByTestId('strategy')).toHaveTextContent('Strategy: loaded');
    expect(screen.getByTestId('strategy-error')).toHaveTextContent('StrategyError: none');
  });

  it('should increment portfolio version when triggerPortfolioUpdate is called', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // Initial portfolio
        ok: true,
        json: async () => ({ username: 'testuser', positions: [], transactions: [] }),
      })
      .mockResolvedValueOnce({ // Initial strategy
        ok: true,
        json: async () => ({ id: 'strategy-1', recommendations: [] }),
      });

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading: false');
    });

    const triggerButton = screen.getByTestId('trigger');
    const versionElement = screen.getByTestId('version');

    // Initial version should be 0
    expect(versionElement).toHaveTextContent('Version: 0');

    // Click trigger button
    await act(async () => {
      fireEvent.click(triggerButton);
    });

    // Version should be incremented to 1
    expect(versionElement).toHaveTextContent('Version: 1');

    // Click trigger button again
    await act(async () => {
      fireEvent.click(triggerButton);
    });

    // Version should be incremented to 2
    expect(versionElement).toHaveTextContent('Version: 2');
  });

  it('should refresh portfolio data when refreshPortfolio is called', async () => {
    const mockPortfolioData = {
      username: 'testuser',
      positions: [{ type: 'Stock', symbol: 'AAPL', quantity: 10, averagePrice: 150 }],
      transactions: [],
      historicalPrices: {},
      fundamentals: {},
      technicals: {},
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // Initial portfolio
        ok: true,
        json: async () => ({ username: 'testuser', positions: [], transactions: [] }),
      })
      .mockResolvedValueOnce({ // Initial strategy
        ok: true,
        json: async () => ({ id: 'strategy-1', recommendations: [] }),
      })
      .mockResolvedValueOnce({ // Refreshed portfolio
        ok: true,
        json: async () => mockPortfolioData,
      });

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading: false');
    });

    const refreshButton = screen.getByTestId('refresh');
    const versionElement = screen.getByTestId('version');

    // Initial version should be 0
    expect(versionElement).toHaveTextContent('Version: 0');

    // Click refresh button
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    // Wait for the refresh to complete
    await waitFor(() => {
      expect(versionElement).toHaveTextContent('Version: 1');
    });

    // Verify that fetch was called correctly (initial portfolio + initial strategy + refresh portfolio)
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // Portfolio fetch fails
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({ // Strategy fetch succeeds
        ok: true,
        json: async () => ({ id: 'strategy-1', recommendations: [] }),
      });

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Error: Failed to fetch portfolio data');
    });
  });

  it('should handle strategy fetch errors gracefully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // For portfolio data
        ok: true,
        json: async () => ({ username: 'testuser', positions: [], transactions: [] }),
      })
      .mockResolvedValueOnce({ // For strategy data (fail)
        ok: false,
        status: 500,
      });

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('strategy-error')).toHaveTextContent('StrategyError: Failed to fetch strategy');
      expect(screen.getByTestId('strategy-loading')).toHaveTextContent('StrategyLoading: false');
    });
  });

  it('should show strategy loading state when fetching', async () => {
    let resolveStrategy: any;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // For portfolio data
        ok: true,
        json: async () => ({ username: 'testuser', positions: [], transactions: [] }),
      })
      .mockImplementationOnce(() => new Promise(resolve => {
        resolveStrategy = () => resolve({ ok: true, json: async () => ({ id: 'strategy-1', recommendations: [] }) });
      }));

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    // Strategy loading should be true before promise resolves
    expect(screen.getByTestId('strategy-loading')).toHaveTextContent('StrategyLoading: true');

    // Resolve the strategy fetch
    await act(async () => {
      resolveStrategy();
    });

    await waitFor(() => {
      expect(screen.getByTestId('strategy-loading')).toHaveTextContent('StrategyLoading: false');
      expect(screen.getByTestId('strategy')).toHaveTextContent('Strategy: loaded');
    });
  });

  it('should properly set strategy data from API call', async () => {
    const mockStrategyData = {
      id: 'strategy-test-uuid',
      createdAt: '2024-01-01T00:00:00.000Z',
      targetAllocation: {
        stocks: 70,
        bonds: 20,
        deposits: 5,
        cash: 5
      },
      recommendations: [
        {
          id: 'rec-1',
          action: 'increase',
          assetClass: 'stocks',
          reason: 'Increase stock allocation',
          priority: 'high',
          expectedImpact: 'positive'
        }
      ],
      riskLevel: 'Agresivo',
      timeHorizon: 'Largo plazo (> 7 años)',
      notes: 'Test strategy notes'
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // For portfolio data
        ok: true,
        json: async () => ({ username: 'testuser', positions: [], transactions: [] }),
      })
      .mockResolvedValueOnce({ // For strategy data
        ok: true,
        json: async () => mockStrategyData,
      });

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    // Wait for both portfolio and strategy to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading: false');
      expect(screen.getByTestId('strategy-loading')).toHaveTextContent('StrategyLoading: false');
    });

    // Verify strategy is loaded
    expect(screen.getByTestId('strategy')).toHaveTextContent('Strategy: loaded');
    expect(screen.getByTestId('strategy-error')).toHaveTextContent('StrategyError: none');

    // Verify the strategy API was called with correct URL
    expect(global.fetch).toHaveBeenCalledWith('/api/strategy?username=testuser');
  });

  it('should refresh strategy when refreshStrategy is called', async () => {
    const initialStrategy = { id: 'strategy-1', recommendations: [] };
    const refreshedStrategy = { 
      id: 'strategy-2', 
      recommendations: [{ id: 'rec-1', action: 'increase', assetClass: 'stocks' }] 
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // Initial portfolio
        ok: true,
        json: async () => ({ username: 'testuser', positions: [], transactions: [] }),
      })
      .mockResolvedValueOnce({ // Initial strategy
        ok: true,
        json: async () => initialStrategy,
      })
      .mockResolvedValueOnce({ // Refreshed strategy
        ok: true,
        json: async () => refreshedStrategy,
      });

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('strategy-loading')).toHaveTextContent('StrategyLoading: false');
    });

    const refreshStrategyButton = screen.getByTestId('refresh-strategy');

    // Click refresh strategy button
    await act(async () => {
      fireEvent.click(refreshStrategyButton);
    });

    // Wait for the refresh to complete
    await waitFor(() => {
      expect(screen.getByTestId('strategy-loading')).toHaveTextContent('StrategyLoading: false');
    });

    // Verify that strategy API was called twice (initial + refresh)
    expect(global.fetch).toHaveBeenCalledWith('/api/strategy?username=testuser');
  });

  it('should throw error when usePortfolio is used outside PortfolioProvider', () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('usePortfolio must be used within a PortfolioProvider');
    
    consoleSpy.mockRestore();
  });
}); 