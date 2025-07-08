import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import HistoricalPortfolioChart from '../HistoricalPortfolioChart';

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

describe('HistoricalPortfolioChart', () => {
  const validRecord = {
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

  it('should filter out records with invalid numeric fields', () => {
    const invalid1 = { ...validRecord, fecha: '2024-01-02', total_portfolio_ars: null } as any;
    const invalid2 = { ...validRecord, fecha: '2024-01-03', ganancias_netas_usd: undefined } as any;
    const invalid3 = { ...validRecord, fecha: '2024-01-04', efectivo_disponible_ars: NaN } as any;
    
    render(<HistoricalPortfolioChart records={[validRecord, invalid1, invalid2, invalid3]} />);
    
    // Only the valid record should be rendered
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.labels.length).toBe(1);
    expect(data.labels[0]).toBeDefined();
    expect(data.datasets[0].data).toEqual([10000]);
  });

  it('should filter out records with missing or invalid fecha', () => {
    const invalid1 = { ...validRecord, fecha: null } as any;
    const invalid2 = { ...validRecord, fecha: undefined } as any;
    const invalid3 = { ...validRecord, fecha: '' } as any;
    const invalid4 = { ...validRecord, fecha: 123 } as any;
    
    render(<HistoricalPortfolioChart records={[validRecord, invalid1, invalid2, invalid3, invalid4]} />);
    
    // Only the valid record should be rendered
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    expect(data.labels.length).toBe(1);
    expect(data.datasets[0].data).toEqual([10000]);
  });

  it('should sort records by fecha before rendering', () => {
    const record1 = { ...validRecord, fecha: '2024-01-03', total_portfolio_ars: 30000 };
    const record2 = { ...validRecord, fecha: '2024-01-01', total_portfolio_ars: 10000 };
    const record3 = { ...validRecord, fecha: '2024-01-02', total_portfolio_ars: 20000 };
    
    // Pass records in unsorted order
    render(<HistoricalPortfolioChart records={[record1, record2, record3]} />);
    
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    
    // Should have 3 records
    expect(data.labels.length).toBe(3);
    expect(data.datasets[0].data).toEqual([10000, 20000, 30000]); // Sorted by date
  });

  it('should use the final record as the current snapshot', () => {
    const record1 = { ...validRecord, fecha: '2024-01-01', total_portfolio_ars: 10000 };
    const record2 = { ...validRecord, fecha: '2024-01-02', total_portfolio_ars: 20000 };
    const record3 = { ...validRecord, fecha: '2024-01-03', total_portfolio_ars: 30000 };
    
    render(<HistoricalPortfolioChart records={[record1, record2, record3]} />);
    
    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');
    
    // The final record (30000) should be the last data point
    expect(data.datasets[0].data).toEqual([10000, 20000, 30000]);
    expect(data.datasets[0].data[data.datasets[0].data.length - 1]).toBe(30000);
  });

  it('should handle empty records array', () => {
    render(<HistoricalPortfolioChart records={[]} />);
    
    expect(screen.getByText('No hay datos históricos disponibles')).toBeInTheDocument();
  });

  it('should handle null/undefined records', () => {
    render(<HistoricalPortfolioChart records={null as any} />);
    
    expect(screen.getByText('No hay datos históricos disponibles')).toBeInTheDocument();
  });
}); 