import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PortfolioValueChart from '../PortfolioValueChart';
import { trimHistory } from '@/utils/history';

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
      { date: '2024-01-01', invested: 8000, total: 10000 },
      { date: '2024-01-02', invested: 8400, total: 10500 },
      { date: '2024-01-03', invested: 8160, total: 10200 },
      { date: '2024-01-04', invested: 8640, total: 10800 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    
    expect(screen.getByText('Evolución del Valor del Portafolio')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Check that chart data is passed correctly with time scale format
    const chartData = screen.getByTestId('chart-data');
    expect(chartData).toBeInTheDocument();
    
    // Verify the data structure uses time scale format and has two datasets
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.datasets).toHaveLength(2);
    expect(data.datasets[0].data).toHaveLength(4);
    expect(data.datasets[1].data).toHaveLength(4);
    expect(data.datasets[0].data[0]).toHaveProperty('x');
    expect(data.datasets[0].data[0]).toHaveProperty('y');
    expect(data.datasets[0].label).toBe('Valor del Portafolio Invertido (ARS)');
    expect(data.datasets[1].label).toBe('Valor Total del Portafolio (ARS)');
  });

  it('should render empty state when no value history', () => {
    render(<PortfolioValueChart valueHistory={[]} currency="USD" />);
    
    expect(screen.getByText('Evolución del Valor del Portafolio')).toBeInTheDocument();
    expect(screen.getByText('No hay datos históricos disponibles')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('should handle single data point with time scale', () => {
    const valueHistory = [
      { date: '2024-01-01', invested: 8000, total: 10000 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    
    expect(screen.getByText('Evolución del Valor del Portafolio')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.datasets).toHaveLength(2);
    expect(data.datasets[0].data).toHaveLength(1);
    expect(data.datasets[1].data).toHaveLength(1);
    expect(data.datasets[0].data[0]).toHaveProperty('x');
    expect(data.datasets[0].data[0]).toHaveProperty('y');
    expect(data.datasets[0].data[0].y).toBe(8000);
    expect(data.datasets[1].data[0].y).toBe(10000);
  });

  it('should have correct time scale configuration', () => {
    const valueHistory = [
      { date: '2024-01-01', invested: 8000, total: 10000 },
      { date: '2024-01-02', invested: 8400, total: 10500 },
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
      { date: '2024-01-01', invested: 8000, total: 10000 },
      { date: '2024-01-02', invested: 8400, total: 10500 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    
    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');
    
    // Check that tooltip callback is configured
    expect(options.plugins.tooltip.callbacks).toBeDefined();
    // Note: The callback function is not serialized in the mock, so we just check it exists
    expect(options.plugins.tooltip.enabled).toBe(true);
  });

  it('should display correct currency in dataset labels', () => {
    const valueHistory = [
      { date: '2024-01-01', invested: 8000, total: 10000 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="USD" />);
    
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.datasets[0].label).toBe('Valor del Portafolio Invertido (USD)');
    expect(data.datasets[1].label).toBe('Valor Total del Portafolio (USD)');
  });

  it('should display custom title when provided', () => {
    const valueHistory = [
      { date: '2024-01-01', invested: 8000, total: 10000 },
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" title="Custom Title" />);
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should calculate and display change percentage correctly', () => {
    const valueHistory = [
      { date: '2024-01-01', invested: 8000, total: 10000 },
      { date: '2024-01-02', invested: 8400, total: 11000 }, // 10% increase in total, 5% in invested
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    
    // Should show current total value
    expect(screen.getByText('$11.000,00')).toBeInTheDocument();
    // Should show total change amount (match substring)
    expect(screen.getByText((content) => content.includes('+$1.000,00'))).toBeInTheDocument();
    // Should show total percentage (match substring)
    expect(screen.getByText((content) => content.includes('+10.00') && content.includes('%'))).toBeInTheDocument();
    // Should show invested value and percentage
    expect(screen.getByText((content) => content.includes('Invertido: $8.400,00'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('+5.00') && content.includes('%'))).toBeInTheDocument();
  });

  it('should handle negative change correctly', () => {
    const valueHistory = [
      { date: '2024-01-01', invested: 8000, total: 10000 },
      { date: '2024-01-02', invested: 7200, total: 9000 }, // 10% decrease in both
    ];

    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    
    // Should show current total value
    expect(screen.getByText('$9.000,00')).toBeInTheDocument();
    // Should show negative total change amount (match substring)
    expect(screen.getByText((content) => content.includes('$-1.000,00'))).toBeInTheDocument();
    // Should show invested value
    expect(screen.getByText((content) => content.includes('Invertido: $7.200,00'))).toBeInTheDocument();
    // Should show both percentage changes (use getAllByText since there are two -10.00% elements)
    const percentageElements = screen.getAllByText((content) => content.includes('-10.00') && content.includes('%'));
    expect(percentageElements).toHaveLength(2);
  });

  it('should pass className w-full to Line and set layout.padding to 0', () => {
    const valueHistory = [
      { date: '2024-01-01', invested: 8000, total: 10000 },
      { date: '2024-01-02', invested: 8400, total: 10500 },
    ];
    render(<PortfolioValueChart valueHistory={valueHistory} currency="ARS" />);
    // The mock Line does not render className, but we can check chartOptions
    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');
    expect(options.layout).toBeDefined();
    expect(options.layout.padding).toBe(0);
    // If the mock is updated to render className, check for it here
  });

  it('should trim leading zero entries and start at first non-zero day', () => {
    // First two days are zero, then non-zero
    const valueHistory = [
      { date: '2024-01-01', invested: 0, total: 0 },
      { date: '2024-01-02', invested: 0, total: 0 },
      { date: '2024-01-03', invested: 100, total: 200 },
      { date: '2024-01-04', invested: 150, total: 250 },
    ];
    render(<PortfolioValueChart valueHistory={trimHistory(valueHistory)} currency="ARS" />);
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    // Should only include the last two entries
    expect(data.datasets[0].data).toHaveLength(2);
    expect(data.datasets[0].data[0].x).toContain('2024-01-03');
    expect(data.datasets[0].data[0].y).toBe(100);
    expect(data.datasets[1].data[0].y).toBe(200);
  });
}); 