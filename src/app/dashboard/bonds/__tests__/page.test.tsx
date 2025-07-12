import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BondsPage from '../page';
import { useBonistasBonds } from '@/hooks/useBonistasBonds';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Bond } from '@/types/finance';

// Mock the hooks
jest.mock('@/hooks/useBonistasBonds');
jest.mock('@/contexts/PortfolioContext');
jest.mock('@/components/TradeModal', () => {
  return function MockTradeModal() {
    return <div data-testid="trade-modal">Trade Modal</div>;
  };
});
jest.mock('@/components/AvailableCapitalIndicator', () => {
  return function MockAvailableCapitalIndicator() {
    return <div data-testid="capital-indicator">Capital Indicator</div>;
  };
});

const mockBonds: Bond[] = [
  {
    id: 'AL30',
    ticker: 'AL30',
    name: 'Bono AL30',
    issuer: 'Argentina',
    price: 100,
    tir: 1500,
    tna: 1200,
    currency: 'ARS',
    bcbaPrice: 100,
    mepPrice: 50,
    cclPrice: 45,
    duration: 5.5,
    difference: 2.5,
    mtir: 1400,
    volume: 1000000,
    parity: 95.5,
    ttir: 1450,
    uptir: 1600,
    couponRate: 7.5,
    maturityDate: '2030-07-09'
  },
  {
    id: 'GD30',
    ticker: 'GD30',
    name: 'Bono GD30',
    issuer: 'Argentina',
    price: 90,
    tir: 1200,
    tna: 1000,
    currency: 'ARS',
    bcbaPrice: 90,
    mepPrice: 45,
    cclPrice: 40,
    duration: 4.5,
    difference: 1.5,
    mtir: 1100,
    volume: 800000,
    parity: 85.5,
    ttir: 1150,
    uptir: 1300,
    couponRate: 6.5,
    maturityDate: '2030-01-15'
  },
  {
    id: 'AE38',
    ticker: 'AE38',
    name: 'Bono AE38',
    issuer: 'Argentina',
    price: 110,
    tir: 1800,
    tna: 1500,
    currency: 'ARS',
    bcbaPrice: 110,
    mepPrice: 55,
    cclPrice: 50,
    duration: 6.5,
    difference: 3.5,
    mtir: 1700,
    volume: 1200000,
    parity: 105.5,
    ttir: 1750,
    uptir: 1900,
    couponRate: 8.5,
    maturityDate: '2038-03-20'
  }
];

const mockUseBonistasBonds = useBonistasBonds as jest.MockedFunction<typeof useBonistasBonds>;
const mockUsePortfolio = usePortfolio as jest.MockedFunction<typeof usePortfolio>;

describe('BondsPage', () => {
  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify({ username: 'testuser' })),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseBonistasBonds.mockReturnValue({
      bonds: [],
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    mockUsePortfolio.mockReturnValue({
      portfolioData: null,
      strategy: null,
      loading: false,
      error: null,
      portfolioVersion: 0,
      refreshPortfolio: jest.fn(),
      refreshStrategy: jest.fn(),
      triggerPortfolioUpdate: jest.fn(),
      strategyLoading: false,
      strategyError: null,
    });

    render(<BondsPage />);
    
    expect(screen.getByText('Cargando bonos...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseBonistasBonds.mockReturnValue({
      bonds: [],
      loading: false,
      error: 'Error loading bonds',
      refetch: jest.fn(),
    });

    mockUsePortfolio.mockReturnValue({
      portfolioData: null,
      strategy: null,
      loading: false,
      error: null,
      portfolioVersion: 0,
      refreshPortfolio: jest.fn(),
      refreshStrategy: jest.fn(),
      triggerPortfolioUpdate: jest.fn(),
      strategyLoading: false,
      strategyError: null,
    });

    render(<BondsPage />);
    
    expect(screen.getByText('Error loading bonds')).toBeInTheDocument();
  });

  it('should render bonds table when data is loaded', () => {
    mockUseBonistasBonds.mockReturnValue({
      bonds: mockBonds,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUsePortfolio.mockReturnValue({
      portfolioData: {
        username: 'testuser',
        createdAt: '2024-01-01',
        profileCompleted: true,
        positions: [],
        transactions: [],
        goals: [],
        cash: { ARS: 1000, USD: 100 },
        historicalPrices: {},
        fundamentals: {},
        technicals: {},
      },
      strategy: null,
      loading: false,
      error: null,
      portfolioVersion: 0,
      refreshPortfolio: jest.fn(),
      refreshStrategy: jest.fn(),
      triggerPortfolioUpdate: jest.fn(),
      strategyLoading: false,
      strategyError: null,
    });

    render(<BondsPage />);
    
    expect(screen.getByText('AL30')).toBeInTheDocument();
    expect(screen.getByText('GD30')).toBeInTheDocument();
    expect(screen.getByText('AE38')).toBeInTheDocument();
  });

  it('should sort bonds when clicking column headers', async () => {
    mockUseBonistasBonds.mockReturnValue({
      bonds: mockBonds,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUsePortfolio.mockReturnValue({
      portfolioData: {
        username: 'testuser',
        createdAt: '2024-01-01',
        profileCompleted: true,
        positions: [],
        transactions: [],
        goals: [],
        cash: { ARS: 1000, USD: 100 },
        historicalPrices: {},
        fundamentals: {},
        technicals: {},
      },
      strategy: null,
      loading: false,
      error: null,
      portfolioVersion: 0,
      refreshPortfolio: jest.fn(),
      refreshStrategy: jest.fn(),
      triggerPortfolioUpdate: jest.fn(),
      strategyLoading: false,
      strategyError: null,
    });

    render(<BondsPage />);
    
    // Click on price header to sort
    const priceHeader = screen.getByText('Precio');
    fireEvent.click(priceHeader);
    
    // Verify sort indicator appears
    await waitFor(() => {
      expect(screen.getByText('↑')).toBeInTheDocument();
    });
  });

  it('should show recommended bonds section', () => {
    mockUseBonistasBonds.mockReturnValue({
      bonds: mockBonds,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUsePortfolio.mockReturnValue({
      portfolioData: {
        username: 'testuser',
        createdAt: '2024-01-01',
        profileCompleted: true,
        positions: [],
        transactions: [],
        goals: [],
        cash: { ARS: 1000, USD: 100 },
        historicalPrices: {},
        fundamentals: {},
        technicals: {},
      },
      strategy: null,
      loading: false,
      error: null,
      portfolioVersion: 0,
      refreshPortfolio: jest.fn(),
      refreshStrategy: jest.fn(),
      triggerPortfolioUpdate: jest.fn(),
      strategyLoading: false,
      strategyError: null,
    });

    render(<BondsPage />);
    
    // Check if recommended bonds section is rendered
    expect(screen.getByText(/Bonos recomendados para perfil/)).toBeInTheDocument();
  });

  it('should change profile when selecting different option', () => {
    mockUseBonistasBonds.mockReturnValue({
      bonds: mockBonds,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUsePortfolio.mockReturnValue({
      portfolioData: {
        username: 'testuser',
        createdAt: '2024-01-01',
        profileCompleted: true,
        positions: [],
        transactions: [],
        goals: [],
        cash: { ARS: 1000, USD: 100 },
        historicalPrices: {},
        fundamentals: {},
        technicals: {},
      },
      strategy: null,
      loading: false,
      error: null,
      portfolioVersion: 0,
      refreshPortfolio: jest.fn(),
      refreshStrategy: jest.fn(),
      triggerPortfolioUpdate: jest.fn(),
      strategyLoading: false,
      strategyError: null,
    });

    render(<BondsPage />);
    
    const profileSelect = screen.getByLabelText('Perfil de Riesgo:');
    fireEvent.change(profileSelect, { target: { value: 'arriesgado' } });
    
    expect(profileSelect).toHaveValue('arriesgado');
  });

  it('should highlight recommended bonds in table', () => {
    mockUseBonistasBonds.mockReturnValue({
      bonds: mockBonds,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUsePortfolio.mockReturnValue({
      portfolioData: {
        username: 'testuser',
        createdAt: '2024-01-01',
        profileCompleted: true,
        positions: [],
        transactions: [],
        goals: [],
        cash: { ARS: 1000, USD: 100 },
        historicalPrices: {},
        fundamentals: {},
        technicals: {},
      },
      strategy: null,
      loading: false,
      error: null,
      portfolioVersion: 0,
      refreshPortfolio: jest.fn(),
      refreshStrategy: jest.fn(),
      triggerPortfolioUpdate: jest.fn(),
      strategyLoading: false,
      strategyError: null,
    });

    render(<BondsPage />);
    
    // Check if recommended bonds have the "Recomendado" badge
    const recommendedBadges = screen.getAllByText('Recomendado');
    expect(recommendedBadges.length).toBeGreaterThan(0);
  });
}); 