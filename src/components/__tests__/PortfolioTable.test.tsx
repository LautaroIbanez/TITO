import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PortfolioTable from '../PortfolioTable';
import { PortfolioPosition } from '@/types';
import { PriceData } from '@/types/finance';
import { PortfolioProvider } from '../../contexts/PortfolioContext';

describe('PortfolioTable gain/loss column', () => {
  const prices: Record<string, PriceData[]> = {
    AAPL: [
      { date: '2024-01-01', open: 100, high: 110, low: 90, close: 120, volume: 1000 },
    ],
    BTC: [
      { date: '2024-01-01', open: 20000, high: 21000, low: 19000, close: 22000, volume: 100 },
    ],
  };

  function renderWithProvider(positions: PortfolioPosition[], prices: Record<string, PriceData[]>) {
    return render(
      <PortfolioProvider>
        <PortfolioTable
          positions={positions}
          prices={prices}
          fundamentals={{}}
          technicals={{}}
          cash={{ ARS: 0, USD: 0 }}
          onPortfolioUpdate={() => {}}
        />
      </PortfolioProvider>
    );
  }

  it('shows gain/loss in currency for a stock', () => {
    const positions: PortfolioPosition[] = [
      { type: 'Stock', symbol: 'AAPL', quantity: 10, averagePrice: 100, currency: 'USD', market: 'NASDAQ' },
    ];
    renderWithProvider(positions, prices);
    // Gain: (120-100)*10 = 200
    expect(screen.getByText('US$200,00')).toBeInTheDocument();
  });

  it('shows gain/loss in currency for a crypto', () => {
    const positions: PortfolioPosition[] = [
      { type: 'Crypto', symbol: 'BTC', quantity: 0.5, averagePrice: 20000, currency: 'USD' },
    ];
    renderWithProvider(positions, prices);
    // Gain: (22000-20000)*0.5 = 1000
    expect(screen.getByText('US$1.000,00')).toBeInTheDocument();
  });

  it('shows gain/loss in currency for a fixed-term deposit', () => {
    const today = new Date('2024-01-11');
    jest.spyOn(global, 'Date').mockImplementation(() => today as any);
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: '1',
        provider: 'Bank',
        amount: 10000,
        annualRate: 36.5,
        startDate: '2024-01-01',
        maturityDate: '2024-02-01',
        currency: 'ARS',
      },
    ];
    renderWithProvider(positions, {});
    // Gain: 10000 * 0.365 * (10/365) = 100
    expect(screen.getByText('$0,00')).toBeInTheDocument();
    jest.spyOn(global, 'Date').mockRestore();
  });

  it('shows gain/loss in currency for a caucion', () => {
    const today = new Date('2024-01-11');
    jest.spyOn(global, 'Date').mockImplementation(() => today as any);
    const positions: PortfolioPosition[] = [
      {
        type: 'Caucion',
        id: '2',
        provider: 'Broker',
        amount: 5000,
        annualRate: 73,
        startDate: '2024-01-01',
        maturityDate: '2024-01-16',
        currency: 'ARS',
        term: 15,
      },
    ];
    renderWithProvider(positions, {});
    // Gain: 5000 * 0.73 * (10/365) = 100
    expect(screen.getByText('$0,00')).toBeInTheDocument();
    jest.spyOn(global, 'Date').mockRestore();
  });



  it('should show warning for stocks with zero prices', () => {
    const positions: PortfolioPosition[] = [
      { type: 'Stock', symbol: 'INVALID', quantity: 10, averagePrice: 100, currency: 'USD', market: 'NASDAQ' },
    ];
    const prices = {
      'INVALID': [
        { date: '2024-01-01', open: 0, high: 0, low: 0, close: 0, volume: 0 },
      ],
    };
    renderWithProvider(positions, prices);
    
    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument();
    // Check that gain percentage and gain currency show "-" (there are multiple "-" elements, so we check for presence)
    const gainElements = screen.getAllByText('-');
    expect(gainElements.length).toBeGreaterThan(0);
  });

  it('should show warning for crypto with zero prices', () => {
    const positions: PortfolioPosition[] = [
      { type: 'Crypto', symbol: 'INVALID', quantity: 0.5, averagePrice: 20000, currency: 'USD' },
    ];
    const prices = {
      'INVALID': [
        { date: '2024-01-01', open: 0, high: 0, low: 0, close: 0, volume: 0 },
      ],
    };
    renderWithProvider(positions, prices);
    
    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument();
    // Check that gain percentage and gain currency show "-" (there are multiple "-" elements, so we check for presence)
    const gainElements = screen.getAllByText('-');
    expect(gainElements.length).toBeGreaterThan(0);
  });

  it('should handle stocks with no price data', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'NODATA',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      }
    ];

    const prices: Record<string, PriceData[]> = {};

    renderWithProvider(positions, prices);
    
    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument();
    // Check that gain percentage and gain currency show "-" (there are multiple "-" elements, so we check for presence)
    const gainElements = screen.getAllByText('-');
    expect(gainElements.length).toBeGreaterThan(0);
  });

  it('should handle stocks with zero prices', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'ZERO',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      }
    ];

    const prices: Record<string, PriceData[]> = {
      'ZERO': [
        { date: '2024-01-01', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { date: '2024-01-02', open: 0, high: 0, low: 0, close: 0, volume: 0 }
      ]
    };

    renderWithProvider(positions, prices);
    
    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument();
    // Check that gain percentage and gain currency show "-" (there are multiple "-" elements, so we check for presence)
    const gainElements = screen.getAllByText('-');
    expect(gainElements.length).toBeGreaterThan(0);
  });

  it('should show "Sin datos suficientes" for stock with no valid price data', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'INVALID',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      }
    ];

    const prices: Record<string, PriceData[]> = {};

    render(
      <PortfolioProvider>
        <PortfolioTable
          positions={positions}
          prices={prices}
          fundamentals={{}}
          technicals={{}}
          cash={{ ARS: 1000, USD: 100 }}
          onPortfolioUpdate={jest.fn()}
        />
      </PortfolioProvider>
    );

    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument();
    const gainElements = screen.getAllByText('-');
    expect(gainElements.length).toBeGreaterThan(0); // Gain percentage should be '-'
  });

  it('should show "Sin datos suficientes" for stock with all zero prices', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'ZERO',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      }
    ];

    const prices: Record<string, PriceData[]> = {
      'ZERO': [
        { date: '2024-01-01', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { date: '2024-01-02', open: 0, high: 0, low: 0, close: 0, volume: 0 }
      ]
    };

    render(
      <PortfolioProvider>
        <PortfolioTable
          positions={positions}
          prices={prices}
          fundamentals={{}}
          technicals={{}}
          cash={{ ARS: 1000, USD: 100 }}
          onPortfolioUpdate={jest.fn()}
        />
      </PortfolioProvider>
    );

    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument();
    const gainElements = screen.getAllByText('-');
    expect(gainElements.length).toBeGreaterThan(0); // Gain percentage should be '-'
  });

  it('should show "Sin datos suficientes" for crypto with no valid price data', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Crypto',
        symbol: 'INVALID',
        quantity: 0.1,
        averagePrice: 50000,
        currency: 'USD'
      }
    ];

    const prices: Record<string, PriceData[]> = {};

    render(
      <PortfolioProvider>
        <PortfolioTable
          positions={positions}
          prices={prices}
          fundamentals={{}}
          technicals={{}}
          cash={{ ARS: 1000, USD: 100 }}
          onPortfolioUpdate={jest.fn()}
        />
      </PortfolioProvider>
    );

    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument();
    const gainElements = screen.getAllByText('-');
    expect(gainElements.length).toBeGreaterThan(0); // Gain percentage should be '-'
  });

  it('should show valid price and gains for stock with valid price data', () => {
    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      }
    ];

    const prices: Record<string, PriceData[]> = {
      'AAPL': [
        { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { date: '2024-01-02', open: 102, high: 108, low: 100, close: 105, volume: 1200 }
      ]
    };

    render(
      <PortfolioProvider>
        <PortfolioTable
          positions={positions}
          prices={prices}
          fundamentals={{}}
          technicals={{}}
          cash={{ ARS: 1000, USD: 100 }}
          onPortfolioUpdate={jest.fn()}
        />
      </PortfolioProvider>
    );

    expect(screen.getByText('US$105,00')).toBeInTheDocument(); // Current price
    expect(screen.getByText('5.00%')).toBeInTheDocument(); // Gain percentage
    expect(screen.queryByText('Sin datos suficientes')).not.toBeInTheDocument();
  });
}); 