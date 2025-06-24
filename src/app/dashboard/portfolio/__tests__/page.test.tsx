import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PortfolioPage from '../page';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { DepositTransaction, UserData } from '@/types';

jest.mock('@/contexts/PortfolioContext');

describe('PortfolioPage - Deposit List', () => {
  const mockRefreshPortfolio = jest.fn();
  const deposit1: DepositTransaction = {
    id: 'dep1',
    date: '2024-01-01T00:00:00.000Z',
    type: 'Deposit',
    amount: 1000,
    currency: 'ARS',
  };
  const deposit2: DepositTransaction = {
    id: 'dep2',
    date: '2024-02-01T00:00:00.000Z',
    type: 'Deposit',
    amount: 2000,
    currency: 'ARS',
  };
  const mockPortfolioData: UserData = {
    username: 'testuser',
    createdAt: '2024-01-01T00:00:00.000Z',
    profileCompleted: true,
    positions: [],
    transactions: [deposit1, deposit2],
    goals: [],
    cash: { ARS: 3000, USD: 0 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePortfolio as jest.Mock).mockReturnValue({
      portfolioData: mockPortfolioData,
      loading: false,
      refreshPortfolio: mockRefreshPortfolio,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' }),
    });
    window.confirm = jest.fn(() => true);
    window.localStorage.setItem('session', JSON.stringify({ username: 'testuser' }));
  });

  it('renders the deposit list section with all deposits', () => {
    render(<PortfolioPage />);
    expect(screen.getByText('Depósitos de Efectivo')).toBeInTheDocument();
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getAllByText('Editar')).toHaveLength(2);
    expect(screen.getAllByText('Eliminar')).toHaveLength(2);
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('$2,000.00')).toBeInTheDocument();
  });

  it('calls the API and refreshPortfolio on delete', async () => {
    render(<PortfolioPage />);
    const deleteButtons = screen.getAllByText('Eliminar');
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/portfolio/deposit/dep1?username=testuser'),
        { method: 'DELETE' }
      );
      expect(mockRefreshPortfolio).toHaveBeenCalled();
    });
  });

  it('opens the edit modal and calls the API and refreshPortfolio on update', async () => {
    render(<PortfolioPage />);
    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);
    expect(screen.getByText('Editar Depósito')).toBeInTheDocument();
    const amountInput = screen.getByLabelText('Monto');
    fireEvent.change(amountInput, { target: { value: '1500' } });
    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/portfolio/deposit/dep1'),
        expect.objectContaining({ method: 'PUT' })
      );
      expect(mockRefreshPortfolio).toHaveBeenCalled();
    });
  });
}); 