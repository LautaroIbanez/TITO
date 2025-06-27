import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PortfolioTransactions from '../PortfolioTransactions';
import { PortfolioTransaction, DepositTransaction } from '@/types';
import { PortfolioProvider } from '../../contexts/PortfolioContext';
import EditDepositModal from '../EditDepositModal';

// Mock the usePortfolio hook
const mockRefreshPortfolio = jest.fn();
jest.mock('../../contexts/PortfolioContext', () => ({
  ...jest.requireActual('../../contexts/PortfolioContext'),
  usePortfolio: () => ({
    refreshPortfolio: mockRefreshPortfolio,
  }),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = jest.fn();

// Mock window.confirm
global.confirm = jest.fn();

const renderWithProvider = (transactions: PortfolioTransaction[]) => {
  return render(
    <PortfolioProvider>
      <PortfolioTransactions transactions={transactions} />
    </PortfolioProvider>
  );
};

describe('PortfolioTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ username: 'testuser' }));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' }),
    });
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it('should render stock buy transaction correctly', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: '2024-01-01T00:00:00.000Z',
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        currency: 'USD',
        market: 'NASDAQ',
      }
    ];

    renderWithProvider(transactions);
    
    expect(screen.getByText('Compra')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText((content) => /\$ ?1?50[.,]00/.test(content))).toBeInTheDocument();
  });

  it('should render stock buy transaction with commission and purchase fee correctly', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
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
      }
    ];

    renderWithProvider(transactions);
    
    expect(screen.getByText('Compra')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText((content) => /\$ ?1?50[.,]00/.test(content))).toBeInTheDocument();
    expect(screen.getByText(/Comisión: 1.5%/)).toBeInTheDocument();
    expect(screen.getByText(/Fee: 0.1%/)).toBeInTheDocument();
  });

  it('should render stock sell transaction correctly', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '2',
        date: '2024-01-02T00:00:00.000Z',
        type: 'Sell',
        assetType: 'Stock',
        symbol: 'MSFT',
        quantity: 5,
        price: 300,
        currency: 'USD',
        market: 'NASDAQ',
      }
    ];

    renderWithProvider(transactions);
    
    expect(screen.getByText('Venta')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText((content) => /\$ ?3?00[.,]00/.test(content))).toBeInTheDocument();
  });

  it('should render bond buy transaction correctly', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '3',
        date: '2024-01-03T00:00:00.000Z',
        type: 'Buy',
        assetType: 'Bond',
        ticker: 'GOV-BOND-2025',
        quantity: 100,
        price: 995,
        currency: 'ARS',
      }
    ];

    renderWithProvider(transactions);
    
    expect(screen.getByText('Compra Bono')).toBeInTheDocument();
    expect(screen.getByText('GOV-BOND-2025')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText((content) => /\$ ?995[.,]00/.test(content))).toBeInTheDocument();
  });

  it('should render bond buy transaction with commission and purchase fee correctly', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '3',
        date: '2024-01-03T00:00:00.000Z',
        type: 'Buy',
        assetType: 'Bond',
        ticker: 'GOV-BOND-2025',
        quantity: 100,
        price: 995,
        commissionPct: 2.0,
        purchaseFeePct: 0.05,
        currency: 'ARS',
      }
    ];

    renderWithProvider(transactions);
    
    expect(screen.getByText('Compra Bono')).toBeInTheDocument();
    expect(screen.getByText('GOV-BOND-2025')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText((content) => /\$ ?995[.,]00/.test(content))).toBeInTheDocument();
    expect(screen.getByText(/Comisión: 2%/)).toBeInTheDocument();
    expect(screen.getByText(/Fee: 0.05%/)).toBeInTheDocument();
  });

  it('should render bond sell transaction correctly', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '4',
        date: '2024-01-04T00:00:00.000Z',
        type: 'Sell',
        assetType: 'Bond',
        ticker: 'CORP-BOND-2026',
        quantity: 50,
        price: 1020,
        currency: 'ARS',
      }
    ];

    renderWithProvider(transactions);
    
    expect(screen.getByText('Venta Bono')).toBeInTheDocument();
    expect(screen.getByText('CORP-BOND-2026')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText((content) => /\$ ?1020[.,]00/.test(content))).toBeInTheDocument();
  });

  it('should render fixed-term deposit creation correctly', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '5',
        date: '2024-01-05T00:00:00.000Z',
        type: 'Create',
        assetType: 'FixedTermDeposit',
        provider: 'Banco Santander',
        amount: 10000,
        currency: 'ARS',
        annualRate: 5.5,
        termDays: 365,
        maturityDate: '2025-01-05T00:00:00.000Z'
      }
    ];

    renderWithProvider(transactions);
    
    expect(screen.getByText('Creación Plazo Fijo')).toBeInTheDocument();
    expect(screen.getByText('Banco Santander')).toBeInTheDocument();
    expect(screen.getByText('$10000.00')).toBeInTheDocument();
    expect(screen.getByText('ARS')).toBeInTheDocument();
    
    // Check that there are exactly 2 instances of '—' (price and commission columns)
    const dashElements = screen.getAllByText('—');
    expect(dashElements).toHaveLength(2);
  });

  it('should render deposit transaction correctly in ARS', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '6',
        date: '2024-01-06T00:00:00.000Z',
        type: 'Deposit',
        amount: 5000,
        currency: 'ARS'
      }
    ];

    renderWithProvider(transactions);
    
    expect(screen.getByText('Depósito')).toBeInTheDocument();
    expect(screen.getByText('$5000.00')).toBeInTheDocument();
    expect(screen.getByText('ARS')).toBeInTheDocument();
    
    // Check that there are exactly 3 instances of '—' (symbol, price, and commission columns)
    const dashElements = screen.getAllByText('—');
    expect(dashElements).toHaveLength(3);
  });

  it('should render deposit transaction correctly in USD', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '7',
        date: '2024-01-07T00:00:00.000Z',
        type: 'Deposit',
        amount: 700,
        currency: 'USD'
      }
    ];

    renderWithProvider(transactions);
    
    expect(screen.getByText('Depósito')).toBeInTheDocument();
    expect(screen.getByText('$700.00')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    
    const dashElements = screen.getAllByText('—');
    expect(dashElements).toHaveLength(3);
  });

  it('should sort transactions by date (newest first)', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: '2024-01-01T00:00:00.000Z',
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        currency: 'USD',
        market: 'NASDAQ',
      },
      {
        id: '2',
        date: '2024-01-03T00:00:00.000Z',
        type: 'Sell',
        assetType: 'Stock',
        symbol: 'MSFT',
        quantity: 5,
        price: 300,
        currency: 'USD',
        market: 'NASDAQ',
      },
      {
        id: '6',
        date: '2024-01-02T00:00:00.000Z',
        type: 'Deposit',
        amount: 5000,
        currency: 'ARS',
      }
    ];

    renderWithProvider(transactions);

    const rows = screen.getAllByRole('row');
    // rows[0] is the header row
    expect(rows[1]).toHaveTextContent('Venta');
    expect(rows[1]).toHaveTextContent('MSFT');
    expect(rows[2]).toHaveTextContent('Depósito');
    expect(rows[3]).toHaveTextContent('Compra');
    expect(rows[3]).toHaveTextContent('AAPL');
  });

  it('should handle delete transaction correctly', async () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: 'delete-me',
        date: '2024-01-06T00:00:00.000Z',
        type: 'Deposit',
        amount: 1000,
        currency: 'ARS',
      }
    ];

    renderWithProvider(transactions);

    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this deposit?');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/portfolio/deposit/delete-me?username=testuser',
        { method: 'DELETE' }
      );
      expect(mockRefreshPortfolio).toHaveBeenCalled();
    });
  });

  it('should show error message on delete failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Delete failed' }),
    });

    const transactions: PortfolioTransaction[] = [
      {
        id: 'fail-delete',
        date: '2024-01-06T00:00:00.000Z',
        type: 'Deposit',
        amount: 1000,
        currency: 'ARS',
      }
    ];

    renderWithProvider(transactions);
    
    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
  });

  it('should open edit modal when edit button is clicked', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: 'edit-me',
        date: '2024-01-06T00:00:00.000Z',
        type: 'Deposit',
        amount: 1000,
        currency: 'ARS'
      }
    ];
  
    // Mock the EditDepositModal to check if it's rendered
    jest.mock('../EditDepositModal', () => ({
      __esModule: true,
      default: ({ isOpen }: { isOpen: boolean }) => (
        isOpen ? <div>EditDepositModal is open</div> : null
      ),
    }));
  
    renderWithProvider(transactions);
  
    const editButton = screen.getByText('Editar');
    fireEvent.click(editButton);
  
    expect(screen.getByText('EditDepositModal is open')).toBeInTheDocument();
  });
  

  it('should handle update transaction correctly', async () => {
    const initialDeposit: DepositTransaction = {
      id: 'update-me',
      date: '2024-01-06T00:00:00.000Z',
      type: 'Deposit',
      amount: 1000,
      currency: 'ARS',
    };
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Update successful' }),
    });

    const mockUpdate = jest.fn();

    render(
      <PortfolioProvider>
        <EditDepositModal 
          isOpen={true} 
          onClose={() => {}} 
          onUpdate={mockUpdate} 
          deposit={initialDeposit}
          error={null}
        />
      </PortfolioProvider>
    );
    
    const amountInput = screen.getByLabelText('Amount');
    fireEvent.change(amountInput, { target: { value: '1500' } });

    const updateButton = screen.getByText('Update Deposit');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        ...initialDeposit,
        amount: 1500,
      });
    });
  });
  
  it('should show error message on update failure', async () => {
    const deposit: DepositTransaction = {
      id: 'fail-update',
      date: '2024-01-06T00:00:00.000Z',
      type: 'Deposit',
      amount: 1000,
      currency: 'ARS'
    };
    const mockUpdate = jest.fn();
    const mockClose = jest.fn();

    render(
      <EditDepositModal 
        isOpen={true} 
        onClose={mockClose} 
        onUpdate={mockUpdate} 
        deposit={deposit} 
        error="Update failed" 
      />
    );

    expect(screen.getByText('Update failed')).toBeInTheDocument();
  });
}); 