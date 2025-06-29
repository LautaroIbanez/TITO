import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PortfolioValueChart from '../PortfolioValueChart';

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

describe('PortfolioValueChart', () => {
  it('should render chart with value history data using time scale', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
      { date: '2024-01-02', value: 10500 },
      { date: '2024-01-03', value: 10200 },
      { date: '2024-01-04', value: 10800 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    
    expect(screen.getByText('Evolución del Valor del Portafolio')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Check that chart data is passed correctly with time scale format
    const chartData = screen.getByTestId('chart-data');
    expect(chartData).toBeInTheDocument();
    
    // Verify the data structure uses time scale format
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.datasets[0].data).toHaveLength(4);
    expect(data.datasets[0].data[0]).toHaveProperty('x');
    expect(data.datasets[0].data[0]).toHaveProperty('y');
    expect(data.datasets[0].label).toBe('Valor del Portafolio (ARS)');
  });

  it('should render empty state when no value history', () => {
    render(<PortfolioValueChart valueHistory={[]} currency="USD" />);
    
    expect(screen.getByText('Evolución del Valor del Portafolio')).toBeInTheDocument();
    expect(screen.getByText('No hay datos históricos disponibles')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('should handle single data point with time scale', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    
    expect(screen.getByText('Evolución del Valor del Portafolio')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.datasets[0].data).toHaveLength(1);
    expect(data.datasets[0].data[0]).toHaveProperty('x');
    expect(data.datasets[0].data[0]).toHaveProperty('y');
    expect(data.datasets[0].data[0].y).toBe(10000);
  });

  it('should have correct time scale configuration', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
      { date: '2024-01-02', value: 10500 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="USD" />);
    
    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');
    
    // Check that time scale is configured correctly
    expect(options.scales.x.type).toBe('time');
    expect(options.scales.x.time.parser).toBe('YYYY-MM-DD');
    expect(options.scales.x.time.unit).toBe('day');
    expect(options.scales.x.time.displayFormats.day).toBe('YYYY-MM-DD');
    expect(options.scales.x.ticks.source).toBe('auto');
    expect(options.scales.x.ticks.maxTicksLimit).toBe(10);
  });

  it('should format tooltip with currency', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
      { date: '2024-01-02', value: 10500 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    
    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');
    
    // Check that tooltip callback is configured
    expect(options.plugins.tooltip.callbacks).toBeDefined();
    // Note: The callback function is not serialized in the mock, so we just check it exists
    expect(options.plugins.tooltip.enabled).toBe(true);
  });

  it('should display correct currency in dataset label', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="USD" />);
    
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.datasets[0].label).toBe('Valor del Portafolio (USD)');
  });

  it('should display custom title when provided', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" title="Custom Title" />);
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should calculate and display change percentage correctly', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
      { date: '2024-01-02', value: 11000 }, // 10% increase
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    
    // Should show current value (no space after $)
    expect(screen.getByText('$11.000,00')).toBeInTheDocument();
    // Should show change amount (match substring)
    expect(screen.getByText((content) => content.includes('+$1.000,00'))).toBeInTheDocument();
    // Should show percentage (match substring)
    expect(screen.getByText((content) => content.includes('+10.00') && content.includes('%'))).toBeInTheDocument();
  });

  it('should handle negative change correctly', () => {
    const valueHistory = [
      { date: '2024-01-01', value: 10000 },
      { date: '2024-01-02', value: 9000 }, // 10% decrease
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    
    // Should show current value (no space after $)
    expect(screen.getByText('$9.000,00')).toBeInTheDocument();
    // Should show negative change amount (match substring)
    expect(screen.getByText((content) => content.includes('$-1.000,00'))).toBeInTheDocument();
    // Should show negative percentage (match substring)
    expect(screen.getByText((content) => content.includes('-10.00') && content.includes('%'))).toBeInTheDocument();
  });
}); 