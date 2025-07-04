import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import FundamentalsCompact from '../FundamentalsCompact';
import { Fundamentals } from '@/types/finance';

describe('FundamentalsCompact', () => {
  const mockFundamentals: Fundamentals = {
    peRatio: 15.5,
    pbRatio: 2.1,
    evToEbitda: 12.3,
    roe: 0.18,
    roa: 0.08,
    debtToEquity: 0.5,
    debtToEbitda: 2.1,
    netMargin: 0.12,
    freeCashFlow: 1500000000,
    priceToFCF: 18.2,
    ebitda: 2500000000,
    revenueGrowth: 0.15,
    epsGrowth: 0.12,
    beta: 1.2,
    sector: 'Technology',
    industry: 'Software',
    updatedAt: '2024-01-01'
  };

  it('should display metrics in compact format with pipe separators', () => {
    render(<FundamentalsCompact fundamentals={mockFundamentals} />);
    
    // Check that metrics are displayed in the expected format
    expect(screen.getByText(/PE: 15\.50/)).toBeInTheDocument();
    expect(screen.getByText(/PB: 2\.10/)).toBeInTheDocument();
    expect(screen.getByText(/ROE: 18\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/Margin: 12\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/D\/E: 0\.50/)).toBeInTheDocument();
  });

  it('should display sector information when showSector is true', () => {
    render(<FundamentalsCompact fundamentals={mockFundamentals} showSector={true} />);
    
    expect(screen.getByText('Sector:')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('should not display sector information when showSector is false', () => {
    render(<FundamentalsCompact fundamentals={mockFundamentals} showSector={false} />);
    
    expect(screen.queryByText('Sector:')).not.toBeInTheDocument();
    expect(screen.queryByText('Technology')).not.toBeInTheDocument();
  });

  it('should handle null fundamentals gracefully', () => {
    render(<FundamentalsCompact fundamentals={null} />);
    
    expect(screen.getByText('Datos no disponibles')).toBeInTheDocument();
  });

  it('should handle fundamentals with missing values', () => {
    const incompleteFundamentals: Fundamentals = {
      ...mockFundamentals,
      peRatio: null,
      pbRatio: null,
      roe: null,
      netMargin: null,
      debtToEquity: null,
      sector: null
    };

    render(<FundamentalsCompact fundamentals={incompleteFundamentals} />);
    
    // Should not display sector when it's null
    expect(screen.queryByText('Sector:')).not.toBeInTheDocument();
    
    // Should show "Sin datos" when no metrics are available
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });

  it('should display only available metrics', () => {
    const partialFundamentals: Fundamentals = {
      ...mockFundamentals,
      peRatio: 20.5,
      pbRatio: null,
      roe: 0.15,
      netMargin: null,
      debtToEquity: 0.8
    };

    render(<FundamentalsCompact fundamentals={partialFundamentals} />);
    
    // Should display only the available metrics
    expect(screen.getByText(/PE: 20\.50/)).toBeInTheDocument();
    expect(screen.getByText(/ROE: 15\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/D\/E: 0\.80/)).toBeInTheDocument();
    
    // Should not display null metrics
    expect(screen.queryByText(/PB:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Margin:/)).not.toBeInTheDocument();
  });

  it('should use monospace font for metrics', () => {
    render(<FundamentalsCompact fundamentals={mockFundamentals} />);
    
    const metricsElement = screen.getByText(/PE: 15\.50/);
    expect(metricsElement.closest('.font-mono')).toBeInTheDocument();
  });

  it('should display sector with proper styling', () => {
    render(<FundamentalsCompact fundamentals={mockFundamentals} showSector={true} />);
    
    const sectorLabel = screen.getByText('Sector:');
    const sectorValue = screen.getByText('Technology');
    
    expect(sectorLabel).toHaveClass('text-gray-600');
    expect(sectorValue).toHaveClass('font-medium');
  });
}); 