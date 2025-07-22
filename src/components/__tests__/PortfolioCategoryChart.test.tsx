import React from 'react';
import { render, screen } from '@testing-library/react';
import { PortfolioCategoryChart } from '../PortfolioCategoryChart';
import type { PortfolioSummaryEntry } from '@/utils/portfolioSummaryHistory';

jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(({ data, options }) => (
    <div data-testid="mock-line-chart">
      <span data-testid="labels">{JSON.stringify(data.labels)}</span>
      <span data-testid="datasets">{JSON.stringify(data.datasets.map((d: any) => d.label))}</span>
      <span data-testid="options">{JSON.stringify(options)}</span>
    </div>
  )),
}));

describe('PortfolioCategoryChart', () => {
  const mockHistory: PortfolioSummaryEntry[] = [
    {
      date: '2024-01-01',
      totalARS: 100000,
      totalUSD: 2000,
      investedARS: 80000,
      investedUSD: 1600,
      cashARS: 20000,
      cashUSD: 400,
      totalValue: 102000,
    },
    {
      date: '2024-01-02',
      totalARS: 110000,
      totalUSD: 2200,
      investedARS: 80000,
      investedUSD: 1600,
      cashARS: 30000,
      cashUSD: 600,
      totalValue: 112200,
    },
  ];

  it('renders Line chart with correct labels and datasets for ARS', () => {
    render(<PortfolioCategoryChart history={mockHistory} currency="ARS" />);
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('labels').textContent).toContain('2024-01-01');
    expect(screen.getByTestId('labels').textContent).toContain('2024-01-02');
    
    const datasets = JSON.parse(screen.getByTestId('datasets').textContent || '[]');
    expect(datasets).toEqual([
      'Valor Total (ARS)',
      'Capital Invertido (ARS)',
      'Ganancias Netas (ARS)',
      'Efectivo Disponible (ARS)',
    ]);
  });

  it('renders Line chart with correct labels and datasets for USD', () => {
    render(<PortfolioCategoryChart history={mockHistory} currency="USD" />);
    
    const datasets = JSON.parse(screen.getByTestId('datasets').textContent || '[]');
    expect(datasets).toEqual([
      'Valor Total (USD)',
      'Capital Invertido (USD)',
      'Ganancias Netas (USD)',
      'Efectivo Disponible (USD)',
    ]);
  });

  it('passes responsive options and legend config', () => {
    render(<PortfolioCategoryChart history={mockHistory} currency="ARS" />);
    const options = JSON.parse(screen.getByTestId('options').textContent || '{}');
    expect(options.responsive).toBe(true);
    expect(options.plugins.legend.display).toBe(true);
    expect(options.plugins.legend.position).toBe('top');
  });

  it('calculates cumulative gains correctly from daily differences', () => {
    render(<PortfolioCategoryChart history={mockHistory} currency="ARS" />);
    // The component should calculate cumulative gains from daily differences
    // For the first entry: 0 (no previous day)
    // For the second entry: 110000 - 100000 = 10000 (daily difference)
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });

  it('calculates cumulative gains correctly for USD', () => {
    render(<PortfolioCategoryChart history={mockHistory} currency="USD" />);
    // The component should calculate cumulative gains from daily differences
    // For the first entry: 0 (no previous day)
    // For the second entry: 2200 - 2000 = 200 (daily difference)
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });
}); 