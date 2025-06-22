import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PortfolioTransactions from '../PortfolioTransactions';
import { PortfolioTransaction } from '@/types';

describe('PortfolioTransactions', () => {
  it('should render stock buy transaction correctly', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: '2024-01-01T00:00:00.000Z',
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        price: 150
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    expect(screen.getByText('Compra')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
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
        purchaseFeePct: 0.1
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    expect(screen.getByText('Compra')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('Comisión: 1.5%')).toBeInTheDocument();
    expect(screen.getByText('Fee: 0.1%')).toBeInTheDocument();
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
        price: 300
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    expect(screen.getByText('Venta')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('$300.00')).toBeInTheDocument();
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
        price: 995
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    expect(screen.getByText('Compra Bono')).toBeInTheDocument();
    expect(screen.getByText('GOV-BOND-2025')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('$995.00')).toBeInTheDocument();
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
        purchaseFeePct: 0.05
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    expect(screen.getByText('Compra Bono')).toBeInTheDocument();
    expect(screen.getByText('GOV-BOND-2025')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('$995.00')).toBeInTheDocument();
    expect(screen.getByText('Comisión: 2%')).toBeInTheDocument();
    expect(screen.getByText('Fee: 0.05%')).toBeInTheDocument();
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
        price: 1020
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    expect(screen.getByText('Venta Bono')).toBeInTheDocument();
    expect(screen.getByText('CORP-BOND-2026')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('$1020.00')).toBeInTheDocument();
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
        annualRate: 5.5,
        termDays: 365,
        maturityDate: '2025-01-05T00:00:00.000Z'
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    expect(screen.getByText('Creación Plazo Fijo')).toBeInTheDocument();
    expect(screen.getByText('Banco Santander')).toBeInTheDocument();
    expect(screen.getByText('$10000.00')).toBeInTheDocument();
    
    // Check that there are exactly 2 instances of '—' (price and commission columns)
    const dashElements = screen.getAllByText('—');
    expect(dashElements).toHaveLength(2);
  });

  it('should render deposit transaction correctly', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '6',
        date: '2024-01-06T00:00:00.000Z',
        type: 'Deposit',
        amount: 5000
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    expect(screen.getByText('Depósito')).toBeInTheDocument();
    expect(screen.getByText('$5000.00')).toBeInTheDocument();
    
    // Check that there are exactly 3 instances of '—' (symbol, price, and commission columns)
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
        price: 150
      },
      {
        id: '2',
        date: '2024-01-03T00:00:00.000Z',
        type: 'Sell',
        assetType: 'Stock',
        symbol: 'MSFT',
        quantity: 5,
        price: 300
      },
      {
        id: '3',
        date: '2024-01-02T00:00:00.000Z',
        type: 'Deposit',
        amount: 1000
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    const rows = screen.getAllByRole('row');
    // Skip header row, check first data row (newest transaction)
    expect(rows[1]).toHaveTextContent('MSFT'); // 2024-01-03
    expect(rows[2]).toHaveTextContent('Depósito'); // 2024-01-02
    expect(rows[3]).toHaveTextContent('AAPL'); // 2024-01-01
  });

  it('should show empty state when no transactions', () => {
    render(<PortfolioTransactions transactions={[]} />);
    
    expect(screen.getByText('Aún no hay transacciones.')).toBeInTheDocument();
  });

  it('should handle mixed transaction types', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: '2024-01-01T00:00:00.000Z',
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        price: 150
      },
      {
        id: '2',
        date: '2024-01-02T00:00:00.000Z',
        type: 'Buy',
        assetType: 'Bond',
        ticker: 'GOV-BOND-2025',
        quantity: 100,
        price: 995
      },
      {
        id: '3',
        date: '2024-01-03T00:00:00.000Z',
        type: 'Create',
        assetType: 'FixedTermDeposit',
        provider: 'Banco Santander',
        amount: 10000,
        annualRate: 5.5,
        termDays: 365,
        maturityDate: '2025-01-03T00:00:00.000Z'
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    expect(screen.getByText('Creación Plazo Fijo')).toBeInTheDocument();
    expect(screen.getByText('Compra Bono')).toBeInTheDocument();
    expect(screen.getByText('Compra')).toBeInTheDocument();
    expect(screen.getByText('Banco Santander')).toBeInTheDocument();
    expect(screen.getByText('GOV-BOND-2025')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('should display commission column header', () => {
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: '2024-01-01T00:00:00.000Z',
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        price: 150
      }
    ];

    render(<PortfolioTransactions transactions={transactions} />);
    
    expect(screen.getByText('Comisiones')).toBeInTheDocument();
  });
}); 