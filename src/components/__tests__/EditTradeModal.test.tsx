import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditTradeModal from '../EditTradeModal';
import { PortfolioTransaction } from '@/types';

const mockTransaction: PortfolioTransaction = {
  id: 'test-trade',
  date: '2024-01-01T00:00:00.000Z',
  type: 'Buy',
  assetType: 'Stock',
  symbol: 'AAPL',
  quantity: 10,
  price: 150,
  commissionPct: 1.5,
  purchaseFeePct: 0.1,
  currency: 'USD',
  market: 'NASDAQ',
};

const mockOnUpdate = jest.fn();
const mockOnClose = jest.fn();

describe('EditTradeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal with transaction details', () => {
    render(
      <EditTradeModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    expect(screen.getByText('Editar Comisiones - Compra de AAPL')).toBeInTheDocument();
    expect(screen.getByLabelText('Comisión (%)')).toBeInTheDocument();
    expect(screen.getByLabelText('Fee de Compra (%)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.1')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(
      <EditTradeModal
        transaction={mockTransaction}
        isOpen={false}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    expect(screen.queryByText('Editar Comisiones')).not.toBeInTheDocument();
  });

  it('should not render when transaction is null', () => {
    render(
      <EditTradeModal
        transaction={null}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    expect(screen.queryByText('Editar Comisiones')).not.toBeInTheDocument();
  });

  it('should not render for non-trade transactions', () => {
    const depositTransaction: PortfolioTransaction = {
      id: 'deposit',
      date: '2024-01-01T00:00:00.000Z',
      type: 'Deposit',
      amount: 1000,
      currency: 'ARS',
    };

    render(
      <EditTradeModal
        transaction={depositTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    expect(screen.queryByText('Editar Comisiones')).not.toBeInTheDocument();
  });

  it('should display error message when provided', () => {
    render(
      <EditTradeModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error="Update failed"
      />
    );

    expect(screen.getByText('Update failed')).toBeInTheDocument();
  });

  it('should handle commission percentage changes', () => {
    render(
      <EditTradeModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const commissionInput = screen.getByLabelText('Comisión (%)');
    fireEvent.change(commissionInput, { target: { value: '2.5' } });

    expect(commissionInput).toHaveValue(2.5);
  });

  it('should handle purchase fee percentage changes', () => {
    render(
      <EditTradeModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const feeInput = screen.getByLabelText('Fee de Compra (%)');
    fireEvent.change(feeInput, { target: { value: '0.25' } });

    expect(feeInput).toHaveValue(0.25);
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <EditTradeModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onUpdate with updated transaction when save button is clicked', async () => {
    mockOnUpdate.mockResolvedValue(undefined);

    render(
      <EditTradeModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const commissionInput = screen.getByLabelText('Comisión (%)');
    const feeInput = screen.getByLabelText('Fee de Compra (%)');
    
    fireEvent.change(commissionInput, { target: { value: '2.0' } });
    fireEvent.change(feeInput, { target: { value: '0.15' } });

    const saveButton = screen.getByText('Guardar');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockTransaction,
        commissionPct: 2.0,
        purchaseFeePct: 0.15,
      });
    });
  });

  it('should set commission and fee to undefined when values are 0', async () => {
    mockOnUpdate.mockResolvedValue(undefined);

    render(
      <EditTradeModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const commissionInput = screen.getByLabelText('Comisión (%)');
    const feeInput = screen.getByLabelText('Fee de Compra (%)');
    
    fireEvent.change(commissionInput, { target: { value: '0' } });
    fireEvent.change(feeInput, { target: { value: '0' } });

    const saveButton = screen.getByText('Guardar');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockTransaction,
        commissionPct: undefined,
        purchaseFeePct: undefined,
      });
    });
  });

  it('should show loading state during submission', async () => {
    mockOnUpdate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <EditTradeModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const saveButton = screen.getByText('Guardar');
    fireEvent.click(saveButton);

    expect(screen.getByText('Guardando...')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });

  it('should handle sell transactions correctly', () => {
    const sellTransaction: PortfolioTransaction = {
      id: 'sell-trade',
      date: '2024-01-01T00:00:00.000Z',
      type: 'Sell',
      assetType: 'Stock',
      symbol: 'MSFT',
      quantity: 5,
      price: 300,
      commissionPct: 1.0,
      purchaseFeePct: 0.05,
      currency: 'USD',
      market: 'NASDAQ',
    };

    render(
      <EditTradeModal
        transaction={sellTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    expect(screen.getByText('Editar Comisiones - Venta de MSFT')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.05')).toBeInTheDocument();
  });

  it('should handle bond transactions correctly', () => {
    const bondTransaction: PortfolioTransaction = {
      id: 'bond-trade',
      date: '2024-01-01T00:00:00.000Z',
      type: 'Buy',
      assetType: 'Bond',
      ticker: 'GOV-BOND-2025',
      quantity: 100,
      price: 995,
      commissionPct: 2.0,
      purchaseFeePct: 0.05,
      currency: 'ARS',
    };

    render(
      <EditTradeModal
        transaction={bondTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    expect(screen.getByText('Editar Comisiones - Compra de GOV-BOND-2025')).toBeInTheDocument();
  });

  it('should handle crypto transactions correctly', () => {
    const cryptoTransaction: PortfolioTransaction = {
      id: 'crypto-trade',
      date: '2024-01-01T00:00:00.000Z',
      type: 'Buy',
      assetType: 'Crypto',
      symbol: 'BTCUSDT',
      quantity: 0.1,
      price: 50000,
      commissionPct: 0.5,
      purchaseFeePct: 0.01,
      currency: 'USD',
    };

    render(
      <EditTradeModal
        transaction={cryptoTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    expect(screen.getByText('Editar Comisiones - Compra de BTCUSDT')).toBeInTheDocument();
  });
}); 