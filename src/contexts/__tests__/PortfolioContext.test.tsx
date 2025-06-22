import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PortfolioProvider, usePortfolio } from '../PortfolioContext';

// Mock fetch globally
global.fetch = jest.fn();

// Test component that uses the portfolio context
function TestComponent() {
  const { portfolioData, loading, error, portfolioVersion, refreshPortfolio, triggerPortfolioUpdate } = usePortfolio();
  
  return (
    <div>
      <span data-testid="version">Version: {portfolioVersion}</span>
      <span data-testid="loading">Loading: {loading.toString()}</span>
      <span data-testid="error">Error: {error || 'none'}</span>
      <span data-testid="data">Data: {portfolioData ? 'loaded' : 'null'}</span>
      <button data-testid="refresh" onClick={refreshPortfolio}>
        Refresh Portfolio
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
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: 'testuser', positions: [], transactions: [] }),
    });

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    // Wait for the initial fetch to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading: false');
    });

    expect(screen.getByTestId('version')).toHaveTextContent('Version: 0');
    expect(screen.getByTestId('error')).toHaveTextContent('Error: none');
    expect(screen.getByTestId('data')).toHaveTextContent('Data: loaded');
  });

  it('should increment portfolio version when triggerPortfolioUpdate is called', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: 'testuser', positions: [], transactions: [] }),
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
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ username: 'testuser', positions: [], transactions: [] }),
      })
      .mockResolvedValueOnce({
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

    // Verify that fetch was called for the refresh
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <PortfolioProvider>
        <TestComponent />
      </PortfolioProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Error: Network error');
    });
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