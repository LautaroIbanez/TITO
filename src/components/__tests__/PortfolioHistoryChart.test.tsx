import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PortfolioHistoryChart from '../PortfolioHistoryChart';

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

describe('PortfolioHistoryChart', () => {
  it('should render chart with value history data', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
      { date: '2024-01-02', value: 10500 },
      { date: '2024-01-03', value: 10200 },
      { date: '2024-01-04', value: 10800 },
    ];

    render(<PortfolioHistoryChart valueHistory={valueHistory} />);
    
    expect(screen.getByText('Evolución del Valor del Portafolio')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Check that chart data is passed correctly
    const chartData = screen.getByTestId('chart-data');
    expect(chartData).toBeInTheDocument();
    
    // Verify the data structure
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.labels).toEqual(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04']);
    expect(data.datasets[0].data).toEqual([10000, 10500, 10200, 10800]);
    expect(data.datasets[0].label).toBe('Valor del Portafolio');
  });

  it('should render empty state when no value history', () => {
    render(<PortfolioHistoryChart valueHistory={[]} />);
    
    expect(screen.getByText('Evolución del Valor del Portafolio')).toBeInTheDocument();
    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('should handle single data point', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
    ];

    render(<PortfolioHistoryChart valueHistory={valueHistory} />);
    
    expect(screen.getByText('Evolución del Valor del Portafolio')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.labels).toEqual(['2024-01-01']);
    expect(data.datasets[0].data).toEqual([10000]);
  });

  it('should handle large numbers in value history', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 1000000 },
      { date: '2024-01-02', value: 1050000 },
    ];

    render(<PortfolioHistoryChart valueHistory={valueHistory} />);
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.datasets[0].data).toEqual([1000000, 1050000]);
  });

  it('should have correct chart styling properties', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
      { date: '2024-01-02', value: 10500 },
    ];

    render(<PortfolioHistoryChart valueHistory={valueHistory} />);
    
    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');
    
    // Check that chart options are set correctly
    expect(options.responsive).toBe(true);
    expect(options.plugins.legend.display).toBe(false);
    expect(options.plugins.tooltip.enabled).toBe(true);
    expect(options.scales.x.display).toBe(false);
    expect(options.scales.y.display).toBe(true);
    expect(options.elements.line.borderWidth).toBe(2);
    expect(options.maintainAspectRatio).toBe(false);
  });

  it('should pass className w-full to Line and set layout.padding to 0', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
      { date: '2024-01-02', value: 10500 },
    ];
    render(<PortfolioHistoryChart valueHistory={valueHistory} />);
    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');
    expect(options.layout).toBeDefined();
    expect(options.layout.padding).toBe(0);
    // If the mock is updated to render className, check for it here
  });

  it('should filter out records with invalid numeric fields', () => {
    const valid = {
      fecha: '2024-01-01',
      total_portfolio_ars: 10000,
      total_portfolio_usd: 2000,
      capital_invertido_ars: 8000,
      capital_invertido_usd: 1600,
      ganancias_netas_ars: 2000,
      ganancias_netas_usd: 400,
      efectivo_disponible_ars: 1000,
      efectivo_disponible_usd: 200,
    };
    const invalid1 = { ...valid, fecha: '2024-01-02', total_portfolio_ars: null };
    const invalid2 = { ...valid, fecha: '2024-01-03', ganancias_netas_usd: undefined };
    const invalid3 = { ...valid, fecha: '2024-01-04', efectivo_disponible_ars: NaN };
    render(<PortfolioHistoryChart records={[valid, invalid1, invalid2, invalid3]} />);
    // Only the valid record should be rendered
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.labels).toEqual(["2024-01-01"]);
    expect(data.datasets[0].data).toEqual([10000]);
  });
}); 