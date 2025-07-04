import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import FundamentalsCompact from '../FundamentalsCompact';
import { Fundamentals } from '@/types/finance';

// Mock fetch for sector comparison API
global.fetch = jest.fn();

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

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should display metrics in grid format', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: {}, 
        percentiles: {} 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" />);
    
    await waitFor(() => {
      // Check that metrics are displayed in the new grid format
      expect(screen.getByText('PE Ratio:')).toBeInTheDocument();
      expect(screen.getByText('15.50')).toBeInTheDocument();
      expect(screen.getByText('Net Margin:')).toBeInTheDocument();
      expect(screen.getByText('12.0%')).toBeInTheDocument();
      expect(screen.getByText('PB Ratio:')).toBeInTheDocument();
      expect(screen.getByText('2.10')).toBeInTheDocument();
      expect(screen.getByText('ROE:')).toBeInTheDocument();
      expect(screen.getByText('18.0%')).toBeInTheDocument();
      expect(screen.getByText('D/E:')).toBeInTheDocument();
      expect(screen.getByText('0.50')).toBeInTheDocument();
    });
  });

  it('should display sector information when showSector is true', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: {}, 
        percentiles: {} 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" showSector={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Sector:')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
    });
  });

  it('should not display sector information when showSector is false', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: {}, 
        percentiles: {} 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" showSector={false} />);
    
    await waitFor(() => {
      expect(screen.queryByText('Sector:')).not.toBeInTheDocument();
      expect(screen.queryByText('Technology')).not.toBeInTheDocument();
    });
  });

  it('should handle null fundamentals gracefully', () => {
    render(<FundamentalsCompact fundamentals={null} symbol="AAPL" />);
    
    expect(screen.getByText('Datos no disponibles')).toBeInTheDocument();
  });

  it('should handle fundamentals with missing values', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: {}, 
        percentiles: {} 
      })
    });

    const incompleteFundamentals: Fundamentals = {
      ...mockFundamentals,
      peRatio: null,
      pbRatio: null,
      roe: null,
      netMargin: null,
      debtToEquity: null,
      sector: null
    };

    render(<FundamentalsCompact fundamentals={incompleteFundamentals} symbol="AAPL" />);
    
    await waitFor(() => {
      // Should not display sector when it's null
      expect(screen.queryByText('Sector:')).not.toBeInTheDocument();
      
      // Should show "—" for missing values
      expect(screen.getAllByText('—')).toHaveLength(5);
    });
  });

  it('should display only available metrics', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: {}, 
        percentiles: {} 
      })
    });

    const partialFundamentals: Fundamentals = {
      ...mockFundamentals,
      peRatio: 20.5,
      pbRatio: null,
      roe: 0.15,
      netMargin: null,
      debtToEquity: 0.8
    };

    render(<FundamentalsCompact fundamentals={partialFundamentals} symbol="AAPL" />);
    
    await waitFor(() => {
      // Should display only the available metrics
      expect(screen.getByText('20.50')).toBeInTheDocument();
      expect(screen.getByText('15.0%')).toBeInTheDocument();
      expect(screen.getByText('0.80')).toBeInTheDocument();
      
      // Should show "—" for null metrics
      expect(screen.getAllByText('—')).toHaveLength(2);
    });
  });

  it('should use monospace font for metric values', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: {}, 
        percentiles: {} 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" />);
    
    await waitFor(() => {
      const metricValue = screen.getByText('15.50');
      expect(metricValue).toHaveClass('font-mono');
    });
  });

  it('should display sector with proper styling', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: {}, 
        percentiles: {} 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" showSector={true} />);
    
    await waitFor(() => {
      const sectorLabel = screen.getByText('Sector:');
      const sectorValue = screen.getByText('Technology');
      
      expect(sectorLabel).toHaveClass('text-gray-600');
      expect(sectorValue).toHaveClass('font-medium');
    });
  });

  it('should fetch sector data when fundamentals have sector', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: {}, 
        percentiles: {} 
      })
    });

    await act(async () => {
      render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" />);
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/sector-comparison?symbol=AAPL&sector=Technology');
    });
  });

  it('should not fetch sector data when fundamentals have no sector', () => {
    const fundamentalsWithoutSector = { ...mockFundamentals, sector: null };
    
    render(<FundamentalsCompact fundamentals={fundamentalsWithoutSector} symbol="AAPL" />);
    
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should show up arrow and green color when stock value is better than sector average', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: { peRatio: 25.0, netMargin: 0.08 }, 
        percentiles: { 
          peRatio: { p20: 10.0, p80: 30.0 },
          netMargin: { p20: 0.05, p80: 0.15 }
        } 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" />);
    
    await waitFor(() => {
      // Should render the component with sector data
      expect(screen.getByText('PE Ratio:')).toBeInTheDocument();
      expect(screen.getByText('15.50')).toBeInTheDocument();
      expect(screen.getByText('Net Margin:')).toBeInTheDocument();
      expect(screen.getByText('12.0%')).toBeInTheDocument();
    });
  });

  it('should show down arrow and red color when stock value is worse than sector average', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: { peRatio: 10.0, netMargin: 0.20 }, 
        percentiles: { 
          peRatio: { p20: 8.0, p80: 25.0 },
          netMargin: { p20: 0.05, p80: 0.25 }
        } 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" />);
    
    await waitFor(() => {
      // Should render the component with sector data
      expect(screen.getByText('PE Ratio:')).toBeInTheDocument();
      expect(screen.getByText('15.50')).toBeInTheDocument();
      expect(screen.getByText('Net Margin:')).toBeInTheDocument();
      expect(screen.getByText('12.0%')).toBeInTheDocument();
    });
  });

  it('should show star indicator when value is above 80th percentile', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: { peRatio: 20.0 }, 
        percentiles: { 
          peRatio: { p20: 10.0, p80: 12.0 } // Stock PE (15.5) > p80 (12.0)
        } 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" />);
    
    await waitFor(() => {
      // Should render the component with sector data
      expect(screen.getByText('PE Ratio:')).toBeInTheDocument();
      expect(screen.getByText('15.50')).toBeInTheDocument();
    });
  });

  it('should show warning indicator when value is below 20th percentile', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: { netMargin: 0.15 }, 
        percentiles: { 
          netMargin: { p20: 0.15, p80: 0.25 } // Stock margin (0.12) < p20 (0.15)
        } 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" />);
    
    await waitFor(() => {
      // Should render the component with sector data
      expect(screen.getByText('Net Margin:')).toBeInTheDocument();
      expect(screen.getByText('12.0%')).toBeInTheDocument();
    });
  });

  it('should show variation percentage with arrows', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: { peRatio: 20.0 }, 
        percentiles: { 
          peRatio: { p20: 10.0, p80: 30.0 }
        } 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" />);
    
    await waitFor(() => {
      // Should render the component with sector data
      expect(screen.getByText('PE Ratio:')).toBeInTheDocument();
      expect(screen.getByText('15.50')).toBeInTheDocument();
    });
  });

  it('should handle missing sector data gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        averages: { peRatio: null }, 
        percentiles: { 
          peRatio: null
        } 
      })
    });

    render(<FundamentalsCompact fundamentals={mockFundamentals} symbol="AAPL" />);
    
    await waitFor(() => {
      // Should still display the metric value without comparison
      expect(screen.getByText('15.50')).toBeInTheDocument();
      // Should not show arrows or percentages
      expect(screen.queryByText('↑')).not.toBeInTheDocument();
      expect(screen.queryByText('↓')).not.toBeInTheDocument();
    });
  });
}); 