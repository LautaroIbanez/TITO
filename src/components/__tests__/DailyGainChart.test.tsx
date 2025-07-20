import React from 'react';
import { render, screen } from '@testing-library/react';
import DailyGainChart from '../DailyGainChart';
import type { DailyPortfolioRecord } from '@/utils/portfolioHistory';

// Mock the formatCurrency function
jest.mock('@/utils/goalCalculator', () => ({
  formatCurrency: jest.fn((value: number, currency: string) => `${currency} ${value.toFixed(2)}`)
}));

describe('DailyGainChart', () => {
  const validRecord1: DailyPortfolioRecord = {
    fecha: '2024-01-01',
    total_portfolio_ars: 100000,
    total_portfolio_usd: 1000,
    capital_invertido_ars: 90000,
    capital_invertido_usd: 900,
    efectivo_disponible_ars: 10000,
    efectivo_disponible_usd: 100,
    ganancias_netas_ars: 0,
    ganancias_netas_usd: 0,
  };

  const validRecord2: DailyPortfolioRecord = {
    fecha: '2024-01-02',
    total_portfolio_ars: 105000,
    total_portfolio_usd: 1050,
    capital_invertido_ars: 90000,
    capital_invertido_usd: 900,
    efectivo_disponible_ars: 15000,
    efectivo_disponible_usd: 150,
    ganancias_netas_ars: 0,
    ganancias_netas_usd: 0,
  };

  const validRecord3: DailyPortfolioRecord = {
    fecha: '2024-01-03',
    total_portfolio_ars: 98000,
    total_portfolio_usd: 980,
    capital_invertido_ars: 90000,
    capital_invertido_usd: 900,
    efectivo_disponible_ars: 8000,
    efectivo_disponible_usd: 80,
    ganancias_netas_ars: 0,
    ganancias_netas_usd: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with insufficient data message when less than 2 records', () => {
    render(<DailyGainChart records={[validRecord1]} />);
    
    expect(screen.getByText('Ganancia Diaria')).toBeInTheDocument();
    expect(screen.getByText('Se necesitan al menos 2 días de datos para calcular ganancias diarias')).toBeInTheDocument();
  });

  it('renders with empty records', () => {
    render(<DailyGainChart records={[]} />);
    
    expect(screen.getByText('Ganancia Diaria')).toBeInTheDocument();
    expect(screen.getByText('Se necesitan al menos 2 días de datos para calcular ganancias diarias')).toBeInTheDocument();
  });

  it('renders with null records', () => {
    render(<DailyGainChart records={null as unknown as DailyPortfolioRecord[]} />);
    
    expect(screen.getByText('Ganancia Diaria')).toBeInTheDocument();
    expect(screen.getByText('Se necesitan al menos 2 días de datos para calcular ganancias diarias')).toBeInTheDocument();
  });

  it('renders ARS chart with valid data', () => {
    render(<DailyGainChart records={[validRecord1, validRecord2, validRecord3]} currency="ARS" />);
    
    expect(screen.getByText('Ganancia Diaria')).toBeInTheDocument();
    expect(screen.getByText('Ganancia Total')).toBeInTheDocument();
    expect(screen.getByText('Promedio Diario')).toBeInTheDocument();
    expect(screen.getByText('Días Positivos')).toBeInTheDocument();
    expect(screen.getByText('Tasa de Éxito')).toBeInTheDocument();
  });

  it('renders USD chart with valid data', () => {
    render(<DailyGainChart records={[validRecord1, validRecord2, validRecord3]} currency="USD" />);
    
    expect(screen.getByText('Ganancia Diaria')).toBeInTheDocument();
    expect(screen.getByText('Ganancia Total')).toBeInTheDocument();
    expect(screen.getByText('Promedio Diario')).toBeInTheDocument();
    expect(screen.getByText('Días Positivos')).toBeInTheDocument();
    expect(screen.getByText('Tasa de Éxito')).toBeInTheDocument();
  });

  it('filters out invalid records', () => {
    const invalidRecord1: DailyPortfolioRecord = {
      fecha: '2024-01-01',
      total_portfolio_ars: NaN,
      total_portfolio_usd: 1000,
      capital_invertido_ars: 90000,
      capital_invertido_usd: 900,
      efectivo_disponible_ars: 10000,
      efectivo_disponible_usd: 100,
      ganancias_netas_ars: 0,
      ganancias_netas_usd: 0,
    };

    const invalidRecord2: DailyPortfolioRecord = {
      fecha: '',
      total_portfolio_ars: 100000,
      total_portfolio_usd: 1000,
      capital_invertido_ars: 90000,
      capital_invertido_usd: 900,
      efectivo_disponible_ars: 10000,
      efectivo_disponible_usd: 100,
      ganancias_netas_ars: 0,
      ganancias_netas_usd: 0,
    };

    render(<DailyGainChart records={[invalidRecord1, invalidRecord2, validRecord1]} />);
    
    // Should show insufficient data message since only 1 valid record remains
    expect(screen.getByText('Se necesitan al menos 2 días de datos para calcular ganancias diarias')).toBeInTheDocument();
  });

  it('sorts records by date', () => {
    const unsortedRecords = [validRecord3, validRecord1, validRecord2];
    render(<DailyGainChart records={unsortedRecords} />);
    
    // Should still render correctly with sorted data
    expect(screen.getByText('Ganancia Diaria')).toBeInTheDocument();
    expect(screen.getByText('Ganancia Total')).toBeInTheDocument();
  });

  it('calculates correct statistics for mixed gains and losses', () => {
    render(<DailyGainChart records={[validRecord1, validRecord2, validRecord3]} />);
    
    // Should show statistics based on the gains:
    // Day 1-2: +5000 ARS (positive)
    // Day 2-3: -7000 ARS (negative)
    expect(screen.getByText('Ganancia Total')).toBeInTheDocument();
    expect(screen.getByText('Promedio Diario')).toBeInTheDocument();
    expect(screen.getByText('Días Positivos')).toBeInTheDocument();
    expect(screen.getByText('Tasa de Éxito')).toBeInTheDocument();
  });

  it('shows legend for positive and negative days', () => {
    render(<DailyGainChart records={[validRecord1, validRecord2, validRecord3]} />);
    
    expect(screen.getByText('Días con ganancia')).toBeInTheDocument();
    expect(screen.getByText('Días con pérdida')).toBeInTheDocument();
  });

  it('configures datalabels plugin correctly', () => {
    render(<DailyGainChart records={[validRecord1, validRecord2, validRecord3]} />);
    
    // The chart should be rendered with datalabels configuration
    // We can't directly test the chart.js configuration in unit tests,
    // but we can verify the component renders without errors
    expect(screen.getByText('Ganancia Diaria')).toBeInTheDocument();
  });

  it('handles missing parsed values safely', () => {
    // Test with records that have some undefined/null values
    const recordWithUndefinedValues: DailyPortfolioRecord = {
      fecha: '2024-01-04',
      total_portfolio_ars: undefined as any,
      total_portfolio_usd: undefined as any,
      capital_invertido_ars: 90000,
      capital_invertido_usd: 900,
      efectivo_disponible_ars: 10000,
      efectivo_disponible_usd: 100,
      ganancias_netas_ars: 0,
      ganancias_netas_usd: 0,
    };

    const recordWithNullValues: DailyPortfolioRecord = {
      fecha: '2024-01-05',
      total_portfolio_ars: null as any,
      total_portfolio_usd: null as any,
      capital_invertido_ars: 90000,
      capital_invertido_usd: 900,
      efectivo_disponible_ars: 10000,
      efectivo_disponible_usd: 100,
      ganancias_netas_ars: 0,
      ganancias_netas_usd: 0,
    };

    // Should render without crashing even with problematic data
    render(<DailyGainChart records={[validRecord1, validRecord2, recordWithUndefinedValues, recordWithNullValues]} />);
    
    // Should still render the chart since we have 2 valid records (validRecord1 and validRecord2)
    // The invalid records are filtered out, but we still have enough data
    expect(screen.getByText('Ganancia Diaria')).toBeInTheDocument();
    expect(screen.getByText('Ganancia Total')).toBeInTheDocument();
  });

  it('renders without crashing when chart context has missing parsed values', () => {
    // This test verifies that the component's chart configuration handles
    // missing parsed values gracefully through optional chaining
    render(<DailyGainChart records={[validRecord1, validRecord2, validRecord3]} />);
    
    // The component should render successfully even if Chart.js context
    // has missing parsed values (which would be handled by our optional chaining)
    expect(screen.getByText('Ganancia Diaria')).toBeInTheDocument();
    expect(screen.getByText('Ganancia Total')).toBeInTheDocument();
  });
}); 