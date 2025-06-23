import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditDepositModal from '../EditDepositModal';
import { DepositTransaction } from '@/types';

const mockDeposit: DepositTransaction = {
  id: 'dep1',
  date: '2023-01-01T00:00:00.000Z',
  type: 'Deposit',
  amount: 5000,
};

const mockOnUpdate = jest.fn();
const mockOnClose = jest.fn();

describe('EditDepositModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when isOpen is true', () => {
    render(
      <EditDepositModal
        deposit={mockDeposit}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    expect(screen.getByText('Editar Depósito')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha')).toBeInTheDocument();
    expect(screen.getByLabelText('Monto')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Guardar Cambios')).toBeInTheDocument();
  });

  it('should not render modal when isOpen is false', () => {
    render(
      <EditDepositModal
        deposit={mockDeposit}
        isOpen={false}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    expect(screen.queryByText('Editar Depósito')).not.toBeInTheDocument();
  });

  it('should populate form with deposit data', () => {
    render(
      <EditDepositModal
        deposit={mockDeposit}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const dateInput = screen.getByLabelText('Fecha') as HTMLInputElement;
    const amountInput = screen.getByLabelText('Monto') as HTMLInputElement;

    expect(dateInput.value).toBe('2023-01-01');
    expect(amountInput.value).toBe('5000');
  });

  it('should update form data when inputs change', () => {
    render(
      <EditDepositModal
        deposit={mockDeposit}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const dateInput = screen.getByLabelText('Fecha');
    const amountInput = screen.getByLabelText('Monto');

    fireEvent.change(dateInput, { target: { value: '2023-02-01' } });
    fireEvent.change(amountInput, { target: { value: '7500' } });

    expect(dateInput).toHaveValue('2023-02-01');
    expect(amountInput).toHaveValue(7500);
  });

  it('should call onUpdate with updated data when form is submitted', async () => {
    render(
      <EditDepositModal
        deposit={mockDeposit}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const dateInput = screen.getByLabelText('Fecha');
    const amountInput = screen.getByLabelText('Monto');
    const submitButton = screen.getByText('Guardar Cambios');

    fireEvent.change(dateInput, { target: { value: '2023-02-01' } });
    fireEvent.change(amountInput, { target: { value: '7500' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockDeposit,
        date: '2023-02-01T00:00:00.000Z',
        amount: 7500,
      });
    });
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <EditDepositModal
        deposit={mockDeposit}
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

  it('should display error message when error prop is provided', () => {
    const errorMessage = 'Failed to update deposit';
    render(
      <EditDepositModal
        deposit={mockDeposit}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should not display error message when error prop is null', () => {
    render(
      <EditDepositModal
        deposit={mockDeposit}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    expect(screen.queryByText('Failed to update deposit')).not.toBeInTheDocument();
  });

  it('should handle form submission with preventDefault', () => {
    render(
      <EditDepositModal
        deposit={mockDeposit}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const form = screen.getByRole('form');
    const submitButton = screen.getByText('Guardar Cambios');

    // Mock preventDefault
    const mockPreventDefault = jest.fn();
    fireEvent.submit(form, { preventDefault: mockPreventDefault });

    expect(mockPreventDefault).toHaveBeenCalled();
    expect(mockOnUpdate).toHaveBeenCalledWith(mockDeposit);
  });

  it('should update form when deposit prop changes', () => {
    const { rerender } = render(
      <EditDepositModal
        deposit={mockDeposit}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const newDeposit: DepositTransaction = {
      id: 'dep2',
      date: '2023-03-01T00:00:00.000Z',
      type: 'Deposit',
      amount: 10000,
    };

    rerender(
      <EditDepositModal
        deposit={newDeposit}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        error={null}
      />
    );

    const dateInput = screen.getByLabelText('Fecha') as HTMLInputElement;
    const amountInput = screen.getByLabelText('Monto') as HTMLInputElement;

    expect(dateInput.value).toBe('2023-03-01');
    expect(amountInput.value).toBe('10000');
  });
}); 