import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TradeModal from '../TradeModal';

// Mock the usePortfolio hook
const mockUsePortfolio = {
  portfolioData: {
    cash: { ARS: 100000, USD: 10000 }
  },
  strategy: {
    targetAllocation: {
      stocks: 40,
      bonds: 30,
      deposits: 20,
      cash: 10
    }
  },
  refreshPortfolio: jest.fn()
};

jest.mock('../../contexts/PortfolioContext', () => ({
  ...jest.requireActual('../../contexts/PortfolioContext'),
  usePortfolio: () => mockUsePortfolio
}));

// Mock the formatCurrency utility
jest.mock('../../utils/goalCalculator', () => ({
  formatCurrency: (amount: number, currency: string) => `${currency} ${amount.toLocaleString()}`
}));

describe('TradeModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    tradeType: 'Buy' as const,
    assetName: 'Test Asset',
    assetType: 'Stock' as const,
    identifier: 'TEST',
    price: 100,
    cash: { ARS: 100000, USD: 10000 },
    currency: 'ARS' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when isOpen is true', () => {
    render(<TradeModal {...defaultProps} />);
    expect(screen.getByText('Comprar Test Asset')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<TradeModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Comprar Test Asset')).not.toBeInTheDocument();
  });

  it('displays correct available cash without assetClass', () => {
    render(<TradeModal {...defaultProps} />);
    expect(screen.getByText('Efectivo Disponible:')).toBeInTheDocument();
    expect(screen.getByText('ARS 100.000')).toBeInTheDocument();
  });

  it('displays computed available cash for stocks assetClass', () => {
    render(<TradeModal {...defaultProps} assetClass="stocks" />);
    // 40% of 100000 = 40000
    expect(screen.getByText('Capital Disponible para Acciones:')).toBeInTheDocument();
    expect(screen.getByText('ARS 40.000')).toBeInTheDocument();
  });

  it('displays computed available cash for bonds assetClass', () => {
    render(<TradeModal {...defaultProps} assetClass="bonds" />);
    // 30% of 100000 = 30000
    expect(screen.getByText('Capital Disponible para Bonos:')).toBeInTheDocument();
    expect(screen.getByText('ARS 30.000')).toBeInTheDocument();
  });

  it('displays computed available cash for deposits assetClass', () => {
    render(<TradeModal {...defaultProps} assetClass="deposits" />);
    // 20% of 100000 = 20000
    expect(screen.getByText('Capital Disponible para Plazos Fijos:')).toBeInTheDocument();
    expect(screen.getByText('ARS 20.000')).toBeInTheDocument();
  });

  it('displays USD available cash when currency is USD', () => {
    render(<TradeModal {...defaultProps} currency="USD" assetClass="stocks" />);
    // 40% of 10000 = 4000
    expect(screen.getByText('Capital Disponible para Acciones:')).toBeInTheDocument();
    expect(screen.getByText('USD 4.000')).toBeInTheDocument();
  });

  it('disables confirm button when cost exceeds available cash', async () => {
    render(<TradeModal {...defaultProps} assetClass="stocks" />);
    
    // Set a high value that exceeds the available cash (40000)
    const input = screen.getByLabelText('Cantidad');
    fireEvent.change(input, { target: { value: '500' } }); // 500 * 100 = 50000 > 40000
    
    await waitFor(() => {
      expect(screen.getByText('Fondos insuficientes.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    });
  });

  it('enables confirm button when cost is within available cash', async () => {
    render(<TradeModal {...defaultProps} assetClass="stocks" />);
    
    // Set a value within the available cash (40000)
    const input = screen.getByLabelText('Cantidad');
    fireEvent.change(input, { target: { value: '300' } }); // 300 * 100 = 30000 < 40000
    
    await waitFor(() => {
      expect(screen.queryByText('Fondos insuficientes.')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirmar' })).not.toBeDisabled();
    });
  });

  it('handles missing strategy gracefully', () => {
    const mockUsePortfolioWithoutStrategy = {
      ...mockUsePortfolio,
      strategy: null
    };
    
    jest.doMock('../../contexts/PortfolioContext', () => ({
      ...jest.requireActual('../../contexts/PortfolioContext'),
      usePortfolio: () => mockUsePortfolioWithoutStrategy
    }));

    render(<TradeModal {...defaultProps} assetClass="stocks" />);
    // Should fall back to full cash amount
    expect(screen.getByText('Capital Disponible para Acciones:')).toBeInTheDocument();
    expect(screen.getByText('ARS 100.000')).toBeInTheDocument();
  });

  it('handles missing targetAllocation gracefully', () => {
    const mockUsePortfolioWithoutTargetAllocation = {
      ...mockUsePortfolio,
      strategy: { targetAllocation: {} }
    };
    
    jest.doMock('../../contexts/PortfolioContext', () => ({
      ...jest.requireActual('../../contexts/PortfolioContext'),
      usePortfolio: () => mockUsePortfolioWithoutTargetAllocation
    }));

    render(<TradeModal {...defaultProps} assetClass="stocks" />);
    // Should fall back to full cash amount
    expect(screen.getByText('Capital Disponible para Acciones:')).toBeInTheDocument();
    expect(screen.getByText('ARS 100.000')).toBeInTheDocument();
  });

  it('handles zero targetAllocation gracefully', () => {
    const mockUsePortfolioWithZeroAllocation = {
      ...mockUsePortfolio,
      strategy: { targetAllocation: { stocks: 0 } }
    };
    
    jest.doMock('../../contexts/PortfolioContext', () => ({
      ...jest.requireActual('../../contexts/PortfolioContext'),
      usePortfolio: () => mockUsePortfolioWithZeroAllocation
    }));

    render(<TradeModal {...defaultProps} assetClass="stocks" />);
    // Should fall back to full cash amount
    expect(screen.getByText('Capital Disponible para Acciones:')).toBeInTheDocument();
    expect(screen.getByText('ARS 100.000')).toBeInTheDocument();
  });

  it('calls onSubmit with correct parameters', async () => {
    const mockOnSubmit = jest.fn();
    render(<TradeModal {...defaultProps} onSubmit={mockOnSubmit} assetClass="stocks" />);
    
    const input = screen.getByLabelText('Cantidad');
    fireEvent.change(input, { target: { value: '100' } });
    
    const confirmButton = screen.getByRole('button', { name: 'Confirmar' });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        100, // quantity
        'Stock', // assetType
        'TEST', // identifier
        'ARS', // currency
        expect.any(Number), // commissionPct
        expect.any(Number), // purchaseFeePct
        100 // purchasePrice
      );
    });
  });

  it('shows correct labels for different asset classes', () => {
    const { rerender } = render(<TradeModal {...defaultProps} assetClass="stocks" />);
    expect(screen.getByText('Capital Disponible para Acciones:')).toBeInTheDocument();
    
    rerender(<TradeModal {...defaultProps} assetClass="bonds" />);
    expect(screen.getByText('Capital Disponible para Bonos:')).toBeInTheDocument();
    
    rerender(<TradeModal {...defaultProps} assetClass="deposits" />);
    expect(screen.getByText('Capital Disponible para Plazos Fijos:')).toBeInTheDocument();
    
    rerender(<TradeModal {...defaultProps} />);
    expect(screen.getByText('Efectivo Disponible:')).toBeInTheDocument();
  });
}); 