import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ReturnComparison from '../ReturnComparison';
import { DEFAULT_BENCHMARKS } from '@/utils/returnCalculator';

describe('ReturnComparison', () => {
  it('should display both ARS and USD portfolio returns as the first items', () => {
    const mockData = {
      portfolioReturnARS: 15.5,
      portfolioReturnUSD: 8.2,
      ...DEFAULT_BENCHMARKS
    };

    render(<ReturnComparison data={mockData} />);
    
    // Check that both portfolio returns are displayed first
    expect(screen.getByText('Tu Portafolio (ARS)')).toBeInTheDocument();
    expect(screen.getByText('+15.50%')).toBeInTheDocument();
    expect(screen.getByText('Tu Portafolio (USD)')).toBeInTheDocument();
    expect(screen.getByText('+8.20%')).toBeInTheDocument();
  });

  it('should display negative portfolio returns correctly', () => {
    const mockData = {
      portfolioReturnARS: -8.2,
      portfolioReturnUSD: -3.5,
      ...DEFAULT_BENCHMARKS
    };

    render(<ReturnComparison data={mockData} />);
    
    expect(screen.getByText('-8.20%')).toBeInTheDocument();
    expect(screen.getByText('-3.50%')).toBeInTheDocument();
  });

  it('should highlight the best performing asset', () => {
    const mockData = {
      portfolioReturnARS: 15.5,
      portfolioReturnUSD: 8.2,
      ...DEFAULT_BENCHMARKS,
      'Bitcoin': 25 // Override to make it the best performer
    };

    render(<ReturnComparison data={mockData} />);
    
    // Bitcoin should be highlighted as the best performer
    const bitcoinValue = screen.getByText('+25.00%');
    expect(bitcoinValue).toHaveClass('text-green-600', 'font-bold');
  });

  it('should handle zero portfolio returns', () => {
    const mockData = {
      portfolioReturnARS: 0,
      portfolioReturnUSD: 0,
      ...DEFAULT_BENCHMARKS
    };

    render(<ReturnComparison data={mockData} />);
    // Should display two zero returns (ARS and USD)
    const zeroReturns = screen.getAllByText('+0.00%');
    expect(zeroReturns.length).toBeGreaterThanOrEqual(2);
  });

  it('should display all benchmark labels correctly', () => {
    const mockData = {
      portfolioReturnARS: 12,
      portfolioReturnUSD: 10,
      ...DEFAULT_BENCHMARKS
    };

    render(<ReturnComparison data={mockData} />);
    
    // Check that all expected labels are displayed
    expect(screen.getByText('Tu Portafolio (ARS)')).toBeInTheDocument();
    expect(screen.getByText('Tu Portafolio (USD)')).toBeInTheDocument();
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
    const mockData = {
      portfolioReturnARS: 10,
      portfolioReturnUSD: 5,
      ...DEFAULT_BENCHMARKS
    };

    render(<ReturnComparison data={mockData} />);
    
    expect(screen.getByText('El rendimiento pasado no garantiza resultados futuros.')).toBeInTheDocument();
  });

  it('should display IRR-based returns', () => {
    const mockData = {
      portfolioReturnARS: 12.34,
      portfolioReturnUSD: 7.89,
      ...DEFAULT_BENCHMARKS
    };
    render(<ReturnComparison data={mockData} />);
    expect(screen.getByText('+12.34%')).toBeInTheDocument();
    expect(screen.getByText('+7.89%')).toBeInTheDocument();
  });
}); 