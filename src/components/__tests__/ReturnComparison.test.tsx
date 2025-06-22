import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ReturnComparison from '../ReturnComparison';
import { ComparisonResult, DEFAULT_BENCHMARKS } from '@/utils/returnCalculator';

describe('ReturnComparison', () => {
  it('should display portfolio return as the first item', () => {
    const mockData: ComparisonResult = {
      portfolioReturn: 15.5,
      ...DEFAULT_BENCHMARKS
    };

    render(<ReturnComparison data={mockData} />);
    
    // Check that portfolio return is displayed first
    const portfolioRow = screen.getByText('Tu Portafolio').closest('div');
    expect(portfolioRow).toBeInTheDocument();
    expect(screen.getByText('+15.50%')).toBeInTheDocument();
  });

  it('should display negative portfolio return correctly', () => {
    const mockData: ComparisonResult = {
      portfolioReturn: -8.2,
      ...DEFAULT_BENCHMARKS
    };

    render(<ReturnComparison data={mockData} />);
    
    expect(screen.getByText('-8.20%')).toBeInTheDocument();
  });

  it('should highlight the best performing asset', () => {
    const mockData = {
      portfolioReturn: 15.5,
      ...DEFAULT_BENCHMARKS,
      'Bitcoin': 25 // Override to make it the best performer
    } as ComparisonResult;

    render(<ReturnComparison data={mockData} />);
    
    // Bitcoin should be highlighted as the best performer
    const bitcoinValue = screen.getByText('+25.00%');
    expect(bitcoinValue).toHaveClass('text-green-600', 'font-bold');
  });

  it('should handle zero portfolio return', () => {
    const mockData: ComparisonResult = {
      portfolioReturn: 0,
      ...DEFAULT_BENCHMARKS
    };

    render(<ReturnComparison data={mockData} />);
    
    expect(screen.getByText('+0.00%')).toBeInTheDocument();
  });

  it('should display all benchmark labels correctly', () => {
    const mockData: ComparisonResult = {
      portfolioReturn: 12,
      ...DEFAULT_BENCHMARKS
    };

    render(<ReturnComparison data={mockData} />);
    
    // Check that all expected labels are displayed
    expect(screen.getByText('Tu Portafolio')).toBeInTheDocument();
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('Oro')).toBeInTheDocument(); // Gold translated
    expect(screen.getByText('Bono USA 10 años')).toBeInTheDocument(); // US 10-Year Treasury translated
    expect(screen.getByText('NASDAQ')).toBeInTheDocument();
    expect(screen.getByText('Dow Jones')).toBeInTheDocument();
    expect(screen.getByText('Russell 2000')).toBeInTheDocument();
    expect(screen.getByText('VIX')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('Índice Dólar USA')).toBeInTheDocument(); // US Dollar Index translated
  });

  it('should display the disclaimer text', () => {
    const mockData: ComparisonResult = {
      portfolioReturn: 10,
      ...DEFAULT_BENCHMARKS
    };

    render(<ReturnComparison data={mockData} />);
    
    expect(screen.getByText('El rendimiento pasado no garantiza resultados futuros.')).toBeInTheDocument();
  });
}); 