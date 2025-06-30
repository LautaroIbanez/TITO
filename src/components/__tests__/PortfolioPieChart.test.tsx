import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PortfolioPieChart from '../PortfolioPieChart';
import { PortfolioPosition } from '@/types';

jest.mock('react-chartjs-2', () => ({
  Pie: ({ data }: any) => (
    <div data-testid="pie-chart-mock">
      {JSON.stringify(data)}
    </div>
  ),
}));

describe('PortfolioPieChart', () => {
  it('should include all asset types with correct values and labels', () => {
    const positions: PortfolioPosition[] = [
      { type: 'Stock', symbol: 'AAPL', quantity: 2, averagePrice: 150, currency: 'ARS', market: 'BCBA' },
      { type: 'Bond', ticker: 'BOND1', quantity: 3, averagePrice: 1000, currency: 'USD' },
      { type: 'FixedTermDeposit', id: 'FTD-1', provider: 'Bank X', amount: 5000, annualRate: 5, startDate: '2024-01-01', maturityDate: '2025-01-01', currency: 'ARS' },
      { type: 'Caucion', id: 'CAU-1', provider: 'Broker Y', amount: 3000, annualRate: 7, startDate: '2024-01-01', maturityDate: '2024-02-01', currency: 'ARS', term: 30 },
    ];
    const prices = {
      AAPL: [ { close: 200 } ],
    };
    render(
      <PortfolioPieChart positions={positions} prices={prices} />
    );
    const chart = screen.getByTestId('pie-chart-mock');
    const chartData = JSON.parse(chart.textContent!);
    // Should have 4 slices: AAPL, BOND1, Bank X, Broker Y
    expect(chartData.labels).toEqual(['AAPL', 'BOND1', 'Bank X', 'Broker Y']);
    // Stock: 2 * 200 = 400, Bond: 3 * 1000 = 3000, FTD: 5000, Caucion: 3000
    expect(chartData.datasets[0].data).toEqual([400, 3000, 5000, 3000]);
  });

  it('should show 0 value for stocks with no price data', () => {
    const positions: PortfolioPosition[] = [
      { type: 'Stock', symbol: 'MSFT', quantity: 1, averagePrice: 100, currency: 'USD', market: 'NASDAQ' },
    ];
    const prices = {};
    render(
      <PortfolioPieChart positions={positions} prices={prices} />
    );
    // Should show the no data message
    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument();
  });

  it('should include Caucion positions with correct provider labels', () => {
    const positions: PortfolioPosition[] = [
      { type: 'Caucion', id: 'CAU-1', provider: 'Test Broker', amount: 10000, annualRate: 8, startDate: '2024-01-01', maturityDate: '2024-03-01', currency: 'ARS', term: 60 },
      { type: 'Caucion', id: 'CAU-2', provider: 'Another Broker', amount: 5000, annualRate: 6, startDate: '2024-01-15', maturityDate: '2024-02-15', currency: 'USD', term: 30 },
    ];
    const prices = {};
    render(
      <PortfolioPieChart positions={positions} prices={prices} />
    );
    const chart = screen.getByTestId('pie-chart-mock');
    const chartData = JSON.parse(chart.textContent!);
    // Should have 2 slices with caucion provider names
    expect(chartData.labels).toEqual(['Test Broker', 'Another Broker']);
    // Caucion amounts: 10000, 5000
    expect(chartData.datasets[0].data).toEqual([10000, 5000]);
  });

  it('should handle mixed portfolio with Caucion and other assets', () => {
    const positions: PortfolioPosition[] = [
      { type: 'Stock', symbol: 'GOOGL', quantity: 1, averagePrice: 2500, currency: 'USD', market: 'NASDAQ' },
      { type: 'Caucion', id: 'CAU-1', provider: 'Local Broker', amount: 15000, annualRate: 9, startDate: '2024-01-01', maturityDate: '2024-04-01', currency: 'ARS', term: 90 },
      { type: 'Crypto', symbol: 'BTCUSDT', quantity: 0.1, averagePrice: 50000, currency: 'USD' },
    ];
    const prices = {
      GOOGL: [ { close: 2800 } ],
      BTCUSDT: [ { close: 52000 } ],
    };
    render(
      <PortfolioPieChart positions={positions} prices={prices} />
    );
    const chart = screen.getByTestId('pie-chart-mock');
    const chartData = JSON.parse(chart.textContent!);
    // Should have 3 slices: GOOGL, Local Broker, Cripto
    expect(chartData.labels).toEqual(['GOOGL', 'Local Broker', 'Cripto']);
    // Stock: 1 * 2800 = 2800, Caucion: 15000, Crypto: 0.1 * 52000 = 5200
    expect(chartData.datasets[0].data).toEqual([2800, 15000, 5200]);
  });
}); 