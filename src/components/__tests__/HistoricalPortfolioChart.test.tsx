import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import HistoricalPortfolioChart from '../HistoricalPortfolioChart';

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options, ...props }: any) => (
    <div data-testid={props['data-testid'] || 'line-chart'}>
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

  it('should render two charts (ARS and USD) with correct datasets', () => {
    render(<HistoricalPortfolioChart records={[validRecord]} />);
    const arsChart = screen.getByTestId('ars-line-chart');
    const usdChart = screen.getByTestId('usd-line-chart');
    expect(arsChart).toBeInTheDocument();
    expect(usdChart).toBeInTheDocument();
    // ARS chart should have ARS datasets only
    const arsDataDiv = screen.getByTestId('ars-line-chart').querySelector('[data-testid="chart-data"]');
    expect(arsDataDiv).not.toBeNull();
    const arsData = JSON.parse(arsDataDiv!.textContent || '{}');
    expect(arsData.datasets.length).toBe(4);
    expect(arsData.datasets[0].label).toMatch(/ARS/);
    // USD chart should have USD datasets only
    const usdDataDiv = screen.getByTestId('usd-line-chart').querySelector('[data-testid="chart-data"]');
    expect(usdDataDiv).not.toBeNull();
    const usdData = JSON.parse(usdDataDiv!.textContent || '{}');
    expect(usdData.datasets.length).toBe(4);
    expect(usdData.datasets[0].label).toMatch(/USD/);
  });

  it('should filter out records with invalid numeric fields', () => {
    const invalid1 = { ...validRecord, fecha: '2024-01-02', total_portfolio_ars: null } as any;
    const invalid2 = { ...validRecord, fecha: '2024-01-03', efectivo_disponible_ars: NaN } as any;
    const validWithNullGains = { ...validRecord, fecha: '2024-01-04', ganancias_netas_ars: null, ganancias_netas_usd: null };
    render(<HistoricalPortfolioChart records={[validRecord, invalid1, invalid2, validWithNullGains]} />);
    // Only the valid records should be rendered (including the one with null gains)
    const arsDataDiv = screen.getByTestId('ars-line-chart').querySelector('[data-testid="chart-data"]');
    expect(arsDataDiv).not.toBeNull();
    const arsData = JSON.parse(arsDataDiv!.textContent || '{}');
    expect(arsData.labels.length).toBe(2);
    expect(arsData.datasets[0].data).toEqual([10000, 10000]);
    const usdDataDiv = screen.getByTestId('usd-line-chart').querySelector('[data-testid="chart-data"]');
    expect(usdDataDiv).not.toBeNull();
    const usdData = JSON.parse(usdDataDiv!.textContent || '{}');
    expect(usdData.labels.length).toBe(2);
    expect(usdData.datasets[0].data).toEqual([2000, 2000]);
  });

  it('should filter out records with missing or invalid fecha', () => {
    const invalid1 = { ...validRecord, fecha: null } as any;
    const invalid2 = { ...validRecord, fecha: undefined } as any;
    const invalid3 = { ...validRecord, fecha: '' } as any;
    const invalid4 = { ...validRecord, fecha: 123 } as any;
    render(<HistoricalPortfolioChart records={[validRecord, invalid1, invalid2, invalid3, invalid4]} />);
    // Only the valid record should be rendered
    const arsDataDiv = screen.getByTestId('ars-line-chart').querySelector('[data-testid="chart-data"]');
    expect(arsDataDiv).not.toBeNull();
    const arsData = JSON.parse(arsDataDiv!.textContent || '{}');
    expect(arsData.labels.length).toBe(1);
    expect(arsData.datasets[0].data).toEqual([10000]);
    const usdDataDiv = screen.getByTestId('usd-line-chart').querySelector('[data-testid="chart-data"]');
    expect(usdDataDiv).not.toBeNull();
    const usdData = JSON.parse(usdDataDiv!.textContent || '{}');
    expect(usdData.labels.length).toBe(1);
    expect(usdData.datasets[0].data).toEqual([2000]);
  });

  it('should sort records by fecha before rendering', () => {
    const record1 = { ...validRecord, fecha: '2024-01-03', total_portfolio_ars: 30000, total_portfolio_usd: 6000 };
    const record2 = { ...validRecord, fecha: '2024-01-01', total_portfolio_ars: 10000, total_portfolio_usd: 2000 };
    const record3 = { ...validRecord, fecha: '2024-01-02', total_portfolio_ars: 20000, total_portfolio_usd: 4000 };
    render(<HistoricalPortfolioChart records={[record1, record2, record3]} />);
    const arsDataDiv = screen.getByTestId('ars-line-chart').querySelector('[data-testid="chart-data"]');
    expect(arsDataDiv).not.toBeNull();
    const arsData = JSON.parse(arsDataDiv!.textContent || '{}');
    expect(arsData.labels.length).toBe(3);
    expect(arsData.datasets[0].data).toEqual([10000, 20000, 30000]); // Sorted by date
    const usdDataDiv = screen.getByTestId('usd-line-chart').querySelector('[data-testid="chart-data"]');
    expect(usdDataDiv).not.toBeNull();
    const usdData = JSON.parse(usdDataDiv!.textContent || '{}');
    expect(usdData.datasets[0].data).toEqual([2000, 4000, 6000]);
  });

  it('should handle empty records array', () => {
    render(<HistoricalPortfolioChart records={[]} />);
    expect(screen.getByText('No hay datos históricos disponibles')).toBeInTheDocument();
  });

  it('should handle null/undefined records', () => {
    render(<HistoricalPortfolioChart records={null as any} />);
    expect(screen.getByText('No hay datos históricos disponibles')).toBeInTheDocument();
  });

  it('should calculate cumulative gains correctly from daily differences', () => {
    const records = [
      {
        ...validRecord,
        fecha: '2024-01-01',
        total_portfolio_ars: 1000,
        total_portfolio_usd: 100,
        capital_invertido_ars: 800,
        capital_invertido_usd: 80,
      },
      {
        ...validRecord,
        fecha: '2024-01-02',
        total_portfolio_ars: 1050, // +50 ARS gain
        total_portfolio_usd: 105,  // +5 USD gain
        capital_invertido_ars: 800,
        capital_invertido_usd: 80,
      },
      {
        ...validRecord,
        fecha: '2024-01-03',
        total_portfolio_ars: 1100, // +50 ARS gain (total: +100)
        total_portfolio_usd: 110,  // +5 USD gain (total: +10)
        capital_invertido_ars: 800,
        capital_invertido_usd: 80,
      }
    ];

    render(<HistoricalPortfolioChart records={records} />);
    
    // Get the chart data to verify cumulative gains
    const arsDataDiv = screen.getByTestId('ars-line-chart').querySelector('[data-testid="chart-data"]');
    expect(arsDataDiv).not.toBeNull();
    const arsData = JSON.parse(arsDataDiv!.textContent || '{}');
    
    // Find the Ganancia Neta ARS dataset (index 2)
    const gananciaNetaARS = arsData.datasets.find((ds: any) => ds.label === 'Ganancia Neta ARS');
    expect(gananciaNetaARS).toBeDefined();
    expect(gananciaNetaARS.data).toEqual([0, 50, 100]); // Cumulative gains: 0, 50, 100

    const usdDataDiv = screen.getByTestId('usd-line-chart').querySelector('[data-testid="chart-data"]');
    expect(usdDataDiv).not.toBeNull();
    const usdData = JSON.parse(usdDataDiv!.textContent || '{}');
    
    // Find the Ganancia Neta USD dataset (index 2)
    const gananciaNetaUSD = usdData.datasets.find((ds: any) => ds.label === 'Ganancia Neta USD');
    expect(gananciaNetaUSD).toBeDefined();
    expect(gananciaNetaUSD.data).toEqual([0, 5, 10]); // Cumulative gains: 0, 5, 10
  });

  it('should handle negative daily gains in cumulative calculation', () => {
    const records = [
      {
        ...validRecord,
        fecha: '2024-01-01',
        total_portfolio_ars: 1000,
        total_portfolio_usd: 100,
        capital_invertido_ars: 800,
        capital_invertido_usd: 80,
      },
      {
        ...validRecord,
        fecha: '2024-01-02',
        total_portfolio_ars: 950,  // -50 ARS loss
        total_portfolio_usd: 95,   // -5 USD loss
        capital_invertido_ars: 800,
        capital_invertido_usd: 80,
      },
      {
        ...validRecord,
        fecha: '2024-01-03',
        total_portfolio_ars: 1000, // +50 ARS gain (total: 0)
        total_portfolio_usd: 100,  // +5 USD gain (total: 0)
        capital_invertido_ars: 800,
        capital_invertido_usd: 80,
      }
    ];

    render(<HistoricalPortfolioChart records={records} />);
    
    const arsDataDiv = screen.getByTestId('ars-line-chart').querySelector('[data-testid="chart-data"]');
    expect(arsDataDiv).not.toBeNull();
    const arsData = JSON.parse(arsDataDiv!.textContent || '{}');
    
    const gananciaNetaARS = arsData.datasets.find((ds: any) => ds.label === 'Ganancia Neta ARS');
    expect(gananciaNetaARS).toBeDefined();
    expect(gananciaNetaARS.data).toEqual([0, -50, 0]); // Cumulative gains: 0, -50, 0

    const usdDataDiv = screen.getByTestId('usd-line-chart').querySelector('[data-testid="chart-data"]');
    expect(usdDataDiv).not.toBeNull();
    const usdData = JSON.parse(usdDataDiv!.textContent || '{}');
    
    const gananciaNetaUSD = usdData.datasets.find((ds: any) => ds.label === 'Ganancia Neta USD');
    expect(gananciaNetaUSD).toBeDefined();
    expect(gananciaNetaUSD.data).toEqual([0, -5, 0]); // Cumulative gains: 0, -5, 0
  });

  it('should use calculated totals instead of record totals when they differ', () => {
    // Create a record where total_portfolio_ars and total_portfolio_usd are intentionally wrong
    // but the component fields form a correct total
    const recordWithWrongTotals = {
      fecha: '2024-01-01',
      // Wrong totals in the record
      total_portfolio_ars: 5000, // Wrong value
      total_portfolio_usd: 500,  // Wrong value
      // Correct component values that should sum to the right total
      capital_invertido_ars: 8000,
      capital_invertido_usd: 800,
      ganancias_netas_ars: 2000,
      ganancias_netas_usd: 200,
      efectivo_disponible_ars: 1000,
      efectivo_disponible_usd: 100,
    };

    render(<HistoricalPortfolioChart records={[recordWithWrongTotals]} />);
    
    // Parse the chart data to verify that the component uses calculated totals
    const arsDataDiv = screen.getByTestId('ars-line-chart').querySelector('[data-testid="chart-data"]');
    expect(arsDataDiv).not.toBeNull();
    const arsData = JSON.parse(arsDataDiv!.textContent || '{}');
    
    // Find the Total ARS dataset (index 0)
    const totalARS = arsData.datasets.find((ds: any) => ds.label === 'Total ARS');
    expect(totalARS).toBeDefined();
    
    // Should use calculated total: 8000 + 2000 + 1000 = 11000, not the wrong 5000
    const expectedTotalARS = 8000 + 2000 + 1000; // capital + gains + cash
    expect(totalARS.data).toEqual([expectedTotalARS]);

    const usdDataDiv = screen.getByTestId('usd-line-chart').querySelector('[data-testid="chart-data"]');
    expect(usdDataDiv).not.toBeNull();
    const usdData = JSON.parse(usdDataDiv!.textContent || '{}');
    
    // Find the Total USD dataset (index 0)
    const totalUSD = usdData.datasets.find((ds: any) => ds.label === 'Total USD');
    expect(totalUSD).toBeDefined();
    
    // Should use calculated total: 800 + 200 + 100 = 1100, not the wrong 500
    const expectedTotalUSD = 800 + 200 + 100; // capital + gains + cash
    expect(totalUSD.data).toEqual([expectedTotalUSD]);
  });

  it('should show warning when all computed gains are zero', () => {
    const recordWithZeroGains = {
      fecha: '2024-01-01',
      total_portfolio_ars: 10000,
      total_portfolio_usd: 2000,
      capital_invertido_ars: 10000, // Same as total, so gain is 0
      capital_invertido_usd: 2000,  // Same as total, so gain is 0
      ganancias_netas_ars: null,
      ganancias_netas_usd: null,
      efectivo_disponible_ars: 0,
      efectivo_disponible_usd: 0,
    };
    render(<HistoricalPortfolioChart records={[recordWithZeroGains]} />);
    expect(screen.getByText(/No se detectaron ganancias en este período/)).toBeInTheDocument();
  });
}); 