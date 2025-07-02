import React from 'react';
import { render, screen } from '@testing-library/react';
import { PortfolioCategoryChart } from '../PortfolioCategoryChart';
import type { CategoryValueEntry } from '@/utils/categoryValueHistory';

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
  const mockHistory: CategoryValueEntry[] = [
    {
      date: '2024-01-01',
      categories: {
        tech: 1000,
        bonds: 500,
        deposits: 200,
        crypto: 100,
        cauciones: 50,
        cash: 300,
      },
      totalValue: 2150,
    },
    {
      date: '2024-01-02',
      categories: {
        tech: 1100,
        bonds: 600,
        deposits: 250,
        crypto: 120,
        cauciones: 60,
        cash: 350,
      },
      totalValue: 2480,
    },
  ];

  it('renders Line chart with correct labels and datasets', () => {
    render(<PortfolioCategoryChart history={mockHistory} />);
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('labels').textContent).toContain('2024-01-01');
    expect(screen.getByTestId('labels').textContent).toContain('2024-01-02');
    const datasets = JSON.parse(screen.getByTestId('datasets').textContent || '[]');
    expect(datasets).toEqual([
      'Total',
      'Stocks',
      'Bonds',
      'Deposits',
      'Crypto',
      'Cauciones',
      'Cash',
    ]);
  });

  it('passes responsive options and legend config', () => {
    render(<PortfolioCategoryChart history={mockHistory} />);
    const options = JSON.parse(screen.getByTestId('options').textContent || '{}');
    expect(options.responsive).toBe(true);
    expect(options.plugins.legend.display).toBe(true);
    expect(options.plugins.legend.position).toBe('top');
  });
}); 