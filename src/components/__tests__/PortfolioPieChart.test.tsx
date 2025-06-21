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
      { type: 'Stock', symbol: 'AAPL', quantity: 2, averagePrice: 150 },
      { type: 'Bond', ticker: 'BOND1', quantity: 3, averagePrice: 1000 },
      { type: 'FixedTermDeposit', id: 'FTD-1', provider: 'Bank X', amount: 5000, annualRate: 5, startDate: '2024-01-01', maturityDate: '2025-01-01' },
    ];
    const prices = {
      AAPL: [ { close: 200 } ],
    };
    render(
      <PortfolioPieChart positions={positions} prices={prices} />
    );
    const chart = screen.getByTestId('pie-chart-mock');
    const chartData = JSON.parse(chart.textContent!);
    // Should have 3 slices
    expect(chartData.labels).toEqual(['AAPL', 'BOND1', 'Bank X']);
    // Stock: 2 * 200 = 400, Bond: 3 * 1000 = 3000, FTD: 5000
    expect(chartData.datasets[0].data).toEqual([400, 3000, 5000]);
  });

  it('should show 0 value for stocks with no price data', () => {
    const positions: PortfolioPosition[] = [
      { type: 'Stock', symbol: 'MSFT', quantity: 1, averagePrice: 100 },
    ];
    const prices = {};
    render(
      <PortfolioPieChart positions={positions} prices={prices} />
    );
    // Should show the no data message
    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument();
  });
}); 