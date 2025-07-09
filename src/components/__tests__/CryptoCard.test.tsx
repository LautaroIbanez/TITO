import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import CryptoCard from '../CryptoCard';
import { PriceData, Technicals } from '@/types/finance';
import { PortfolioProvider } from '../../contexts/PortfolioContext';
import userEvent from '@testing-library/user-event';

// Mock the Line component from react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart">Chart</div>,
}));

// Mock the TradeModal component
jest.mock('../TradeModal', () => {
  return function MockTradeModal() {
    return <div data-testid="trade-modal">Trade Modal</div>;
  };
});

// Mock the TechnicalDisplay component
jest.mock('../TechnicalDisplay', () => {
  return function MockTechnicalDisplay({ label }: { label: string }) {
    return <div data-testid={`technical-${label.toLowerCase()}`}>{label}</div>;
  };
});

// Mock the SignalBadge component
jest.mock('../SignalBadge', () => {
  return function MockSignalBadge() {
    return <div data-testid="signal-badge">Signal Badge</div>;
  };
});

describe('CryptoCard', () => {
  const mockPrices: PriceData[] = [
    { date: '2024-01-01', open: 50000, high: 51000, low: 49000, close: 50500, volume: 1000 },
    { date: '2024-01-02', open: 50500, high: 52000, low: 50000, close: 51500, volume: 1200 },
  ];

  const mockTechnicals: Technicals = {
    rsi: 65.5,
    macd: 250.0,
    sma200: 48000,
    sma40: 50000,
    ema12: 51000,
    ema25: 50800,
    ema26: 50700,
    ema50: 50500,
    ema150: 49000,
    adx: 25.0,
    pdi: 30.0,
    mdi: 20.0,
    koncorde: null,
    updatedAt: '2024-01-02',
  };

  const mockCash = { ARS: 100000, USD: 1000 };

  function renderCryptoCard(prices: PriceData[], technicals: Technicals | null = mockTechnicals) {
    return render(
      <PortfolioProvider>
        <CryptoCard
          symbol="BTCUSDT"
          prices={prices}
          technicals={technicals}
          cash={mockCash}
          onTrade={() => {}}
        />
      </PortfolioProvider>
    );
  }

  it('renders crypto card with valid price data', () => {
    renderCryptoCard(mockPrices);

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('US$51,500.00')).toBeInTheDocument();
    expect(screen.getByText('Comprar')).toBeInTheDocument();
    expect(screen.getByText('Vender')).toBeInTheDocument();
    expect(screen.getByText('Precio actual:')).toBeInTheDocument();
  });

  it('renders crypto card with no price data', () => {
    renderCryptoCard([]);

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('Comprar')).toBeInTheDocument();
    expect(screen.getByText('Vender')).toBeInTheDocument();
    expect(screen.getByText('Precio actual:')).toBeInTheDocument();
  });

  it('renders crypto card with null prices', () => {
    const pricesWithNull: PriceData[] = [
      { date: '2024-01-01', open: 50000, high: 51000, low: 49000, close: null as any, volume: 1000 },
    ];

    renderCryptoCard(pricesWithNull);

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('Comprar')).toBeInTheDocument();
    expect(screen.getByText('Vender')).toBeInTheDocument();
  });

  it('renders crypto card with undefined prices', () => {
    const pricesWithUndefined: PriceData[] = [
      { date: '2024-01-01', open: 50000, high: 51000, low: 49000, close: undefined as any, volume: 1000 },
    ];

    renderCryptoCard(pricesWithUndefined);

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('Comprar')).toBeInTheDocument();
    expect(screen.getByText('Vender')).toBeInTheDocument();
  });

  it('renders technical indicators', () => {
    renderCryptoCard(mockPrices);

    expect(screen.getByTestId('technical-rsi')).toBeInTheDocument();
    expect(screen.getByTestId('technical-macd')).toBeInTheDocument();
    expect(screen.getByTestId('technical-sma 200')).toBeInTheDocument();
    expect(screen.getByTestId('technical-ema 12')).toBeInTheDocument();
    expect(screen.getByTestId('technical-ema 26')).toBeInTheDocument();
    expect(screen.getByTestId('technical-ema 50')).toBeInTheDocument();
    expect(screen.getByTestId('technical-adx')).toBeInTheDocument();
  });

  it('renders signal badge', () => {
    renderCryptoCard(mockPrices);

    expect(screen.getByTestId('signal-badge')).toBeInTheDocument();
  });

  it('renders currency selector for buy mode', () => {
    renderCryptoCard(mockPrices);

    expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
    expect(screen.getByText('ARS')).toBeInTheDocument();
  });

  it('shows conversion message when ARS is selected', async () => {
    renderCryptoCard(mockPrices);
    const user = userEvent.setup();
    // Change the select to ARS
    await user.selectOptions(screen.getByRole('combobox'), 'ARS');
    expect(screen.getByText('💱 Las compras en ARS se convertirán automáticamente a USD')).toBeInTheDocument();
  });

  it('does not show "US$undefined" when price is invalid', () => {
    const invalidPrices: PriceData[] = [
      { date: '2024-01-01', open: 50000, high: 51000, low: 49000, close: NaN, volume: 1000 },
    ];

    renderCryptoCard(invalidPrices);

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByText('US$undefined')).not.toBeInTheDocument();
  });
}); 