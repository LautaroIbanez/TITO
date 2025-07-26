import React, { useState, useMemo } from 'react';
import { PortfolioTransaction, DepositTransaction, FixedTermDepositCreationTransaction, CaucionCreationTransaction, RealEstateTransaction, MutualFundCreationTransaction } from '@/types';
import EditDepositModal from './EditDepositModal';
import EditTradeModal from './EditTradeModal';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { formatCurrency } from '@/utils/goalCalculator';

interface Props {
  transactions: PortfolioTransaction[];
}

// Helper predicates for type guards
function isFixedTerm(tx: PortfolioTransaction): tx is FixedTermDepositCreationTransaction {
  return tx.type === 'Create' && tx.assetType === 'FixedTermDeposit';
}

function isCaucion(tx: PortfolioTransaction): tx is CaucionCreationTransaction {
  return tx.type === 'Create' && tx.assetType === 'Caucion';
}

function isRealEstate(tx: PortfolioTransaction): tx is RealEstateTransaction {
  return 'assetType' in tx && tx.assetType === 'RealEstate';
}

function isMutualFund(tx: PortfolioTransaction): tx is MutualFundCreationTransaction {
  return tx.type === 'Create' && tx.assetType === 'MutualFund';
}

// Helper function to calculate total cost/proceeds with commissions
function calculateTotalWithCommissions(tx: PortfolioTransaction): { totalCost?: number; totalProceeds?: number } {
  if (tx.type === 'Buy' || tx.type === 'Sell') {
    const baseAmount = tx.quantity * tx.price;
    const commissionAmount = tx.commissionPct ? (baseAmount * tx.commissionPct / 100) : 0;
    const purchaseFeeAmount = tx.purchaseFeePct ? (baseAmount * tx.purchaseFeePct / 100) : 0;
    const totalFees = commissionAmount + purchaseFeeAmount;
    
    if (tx.type === 'Buy') {
      return { totalCost: baseAmount + totalFees };
    } else {
      return { totalProceeds: baseAmount - totalFees };
    }
  }
  return {};
}

export default function PortfolioTransactions({ transactions }: Props) {
  const { refreshPortfolio } = usePortfolio();
  const [editingDeposit, setEditingDeposit] = useState<DepositTransaction | null>(null);
  const [editingTrade, setEditingTrade] = useState<PortfolioTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );
  
  const handleDelete = async (transactionId: string, transactionType: string) => {
    const confirmMessage = transactionType === 'MutualFund' 
      ? 'Are you sure you want to delete this mutual fund transaction?' 
      : 'Are you sure you want to delete this deposit?';
    
    if (!window.confirm(confirmMessage)) return;
    
    setError(null);
    const session = localStorage.getItem('session');
    const username = session ? JSON.parse(session).username : null;
    if (!username) {
      setError('You must be logged in.');
      return;
    }

    try {
      const endpoint = transactionType === 'MutualFund' 
        ? `/api/portfolio/fund/${transactionId}?username=${username}`
        : `/api/portfolio/deposit/${transactionId}?username=${username}`;
      
      const res = await fetch(endpoint, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to delete ${transactionType.toLowerCase()}`);
      }
      await refreshPortfolio();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (deposit: DepositTransaction) => {
    setError(null);
    const session = localStorage.getItem('session');
    const username = session ? JSON.parse(session).username : null;
    if (!username) {
      setError('You must be logged in.');
      return;
    }

    try {
      const res = await fetch(`/api/portfolio/deposit/${deposit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          amount: deposit.amount,
          date: deposit.date,
          currency: deposit.currency,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update deposit');
      }
      await refreshPortfolio();
      setEditingDeposit(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateTrade = async (transaction: PortfolioTransaction) => {
    setError(null);
    const session = localStorage.getItem('session');
    const username = session ? JSON.parse(session).username : null;
    if (!username) {
      setError('You must be logged in.');
      return;
    }

    try {
      const res = await fetch(`/api/portfolio/trade/${transaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          commissionPct: (transaction as any).commissionPct,
          purchaseFeePct: (transaction as any).purchaseFeePct,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update trade');
      }
      await refreshPortfolio();
      setEditingTrade(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getTransactionDisplay = (tx: PortfolioTransaction) => {
    if (tx.type === 'Buy' || tx.type === 'Sell') {
      if ('symbol' in tx && tx.assetType === 'Stock') {
        return {
          symbol: tx.symbol,
          quantity: tx.quantity,
          price: tx.price,
          typeLabel: tx.type === 'Buy' ? 'Compra' : 'Venta',
          typeColor: tx.type === 'Buy' ? 'text-green-600' : 'text-red-600',
          commissionPct: tx.commissionPct,
          purchaseFeePct: tx.purchaseFeePct
        };
      } else if ('ticker' in tx && tx.assetType === 'Bond') {
        return {
          symbol: tx.ticker,
          quantity: tx.quantity,
          price: tx.price,
          typeLabel: tx.type === 'Buy' ? 'Compra Bono' : 'Venta Bono',
          typeColor: tx.type === 'Buy' ? 'text-green-600' : 'text-red-600',
          commissionPct: tx.commissionPct,
          purchaseFeePct: tx.purchaseFeePct
        };
      } else if ('symbol' in tx && tx.assetType === 'Crypto') {
        return {
          symbol: tx.symbol,
          quantity: Number(tx.quantity).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 }),
          price: tx.price,
          typeLabel: tx.type === 'Buy' ? 'Compra Cripto' : 'Venta Cripto',
          typeColor: tx.type === 'Buy' ? 'text-green-600' : 'text-red-600',
          commissionPct: tx.commissionPct,
          purchaseFeePct: tx.purchaseFeePct
        };
      }
    } else if (isFixedTerm(tx)) {
      return {
        symbol: tx.provider,
        quantity: null,
        price: null,
        typeLabel: 'Creación Plazo Fijo',
        typeColor: 'text-blue-600',
        commissionPct: undefined,
        purchaseFeePct: undefined
      };
    } else if (isCaucion(tx)) {
      return {
        symbol: tx.provider,
        quantity: null,
        price: null,
        typeLabel: 'Creación Caución',
        typeColor: 'text-blue-600',
        commissionPct: undefined,
        purchaseFeePct: undefined
      };
    } else if (isMutualFund(tx)) {
      // Check if the fund's category/name indicates it's a money market fund
      const isMoneyMarket = tx.category?.toLowerCase().includes('money market') || 
                           tx.name?.toLowerCase().includes('money market') ||
                           tx.category?.toLowerCase().includes('mercado monetario') ||
                           tx.name?.toLowerCase().includes('mercado monetario');
      
      return {
        symbol: tx.name, // Use tx.name for the symbol field
        quantity: null,
        price: null,
        typeLabel: isMoneyMarket ? 'Money Market' : 'Compra Fondo',
        typeColor: 'text-purple-600',
        commissionPct: undefined,
        purchaseFeePct: undefined
      };
    } else if (isRealEstate(tx)) {
      return {
        symbol: tx.name,
        quantity: null,
        price: null,
        typeLabel: tx.type === 'Create' ? 'Creación Inmueble' : tx.type === 'Update' ? 'Actualización Inmueble' : 'Eliminación Inmueble',
        typeColor: 'text-purple-600',
        commissionPct: undefined,
        purchaseFeePct: undefined
      };
    } else if (tx.type === 'Deposit') {
      return {
        symbol: '—',
        quantity: null,
        price: null,
        typeLabel: 'Depósito',
        typeColor: 'text-blue-600',
        commissionPct: undefined,
        purchaseFeePct: undefined
      };
    } else if (tx.type === 'Acreditación Plazo Fijo') {
      return {
        symbol: tx.provider,
        quantity: null,
        price: null,
        typeLabel: 'Acreditación Plazo Fijo',
        typeColor: 'text-green-700',
        commissionPct: undefined,
        purchaseFeePct: undefined,
        amount: tx.amount,
      };
    } else if (tx.type === 'Acreditación Caución') {
      return {
        symbol: tx.provider,
        quantity: null,
        price: null,
        typeLabel: 'Acreditación Caución',
        typeColor: 'text-green-700',
        commissionPct: undefined,
        purchaseFeePct: undefined,
        amount: tx.amount,
      };
    } else if (tx.type === 'Pago de Cupón Bono') {
      return {
        symbol: tx.ticker,
        quantity: null,
        price: null,
        typeLabel: 'Pago de Cupón Bono',
        typeColor: 'text-green-700',
        commissionPct: undefined,
        purchaseFeePct: undefined,
        amount: tx.amount,
      };
    } else if (tx.type === 'Amortización Bono') {
      return {
        symbol: tx.ticker,
        quantity: null,
        price: null,
        typeLabel: 'Amortización Bono',
        typeColor: 'text-green-700',
        commissionPct: undefined,
        purchaseFeePct: undefined,
        amount: tx.amount,
      };
    }
    
    // Fallback for unknown transaction types
    return {
      symbol: '—',
      quantity: null,
      price: null,
      typeLabel: tx.type,
      typeColor: 'text-gray-600',
      commissionPct: undefined,
      purchaseFeePct: undefined
    };
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 px-4 pt-4">Transacciones Recientes</h3>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded mx-4 mb-4">{error}</p>}
      {sorted.length > 0 ? (
        <table className="min-w-full bg-white text-gray-900 text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Símbolo/Proveedor</th>
              <th className="px-4 py-2 text-right">Monto / Cantidad</th>
              <th className="px-4 py-2 text-left">Moneda</th>
              <th className="px-4 py-2 text-right">Precio</th>
              <th className="px-4 py-2 text-right">Comisiones</th>
              <th className="px-4 py-2 text-right">Costo Final</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx, i) => {
              const display = getTransactionDisplay(tx);
              const hasFees = display.commissionPct !== undefined || display.purchaseFeePct !== undefined;
              const totalWithCommissions = calculateTotalWithCommissions(tx);
              const isTrade = tx.type === 'Buy' || tx.type === 'Sell';
              
              return (
                <tr key={i} className="even:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-800">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className={`px-4 py-2 font-semibold ${display.typeColor}`}>
                    {display.typeLabel}
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-800">{display.symbol}</td>
                  <td className="px-4 py-2 text-right text-gray-800">
                    {display.quantity !== null ? display.quantity :
                     display.amount !== undefined ? formatCurrency(display.amount, tx.currency) :
                     (tx.type === 'Deposit' || isFixedTerm(tx) || isCaucion(tx) || isRealEstate(tx))
                     ? formatCurrency(tx.amount, tx.currency) : '—'}
                  </td>
                  <td className="px-4 py-2 text-left text-gray-800">
                    {'assetType' in tx && tx.assetType === 'Crypto' ? 'USD' : (tx.currency ? tx.currency : '—')}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-800">
                    {'assetType' in tx && tx.assetType === 'Crypto'
                      ? `US$${Number(display.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : (display.price !== null ? formatCurrency(display.price, tx.currency) : '—')}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-800">
                    {hasFees ? (
                      <div className="text-xs">
                        {display.commissionPct !== undefined && (
                          <div>Comisión: {display.commissionPct}%</div>
                        )}
                        {display.purchaseFeePct !== undefined && (
                          <div>Fee: {display.purchaseFeePct}%</div>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-800">
                    {totalWithCommissions.totalCost !== undefined ? 
                      formatCurrency(totalWithCommissions.totalCost, tx.currency) :
                     totalWithCommissions.totalProceeds !== undefined ? 
                      formatCurrency(totalWithCommissions.totalProceeds, tx.currency) :
                     '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {tx.type === 'Deposit' ? (
                      <div className="flex justify-end items-center space-x-2">
                        <button onClick={() => setEditingDeposit(tx as DepositTransaction)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Editar</button>
                        <button onClick={() => handleDelete(tx.id, 'Deposit')} className="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
                      </div>
                    ) : isMutualFund(tx) ? (
                      <div className="flex justify-end items-center space-x-2">
                        <button onClick={() => handleDelete(tx.id, 'MutualFund')} className="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
                      </div>
                    ) : isTrade ? (
                      <div className="flex justify-end items-center space-x-2">
                        <button onClick={() => setEditingTrade(tx)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Editar</button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-700 text-center py-8">Aún no hay transacciones.</p>
      )}

      {editingDeposit && (
        <EditDepositModal
          deposit={editingDeposit}
          isOpen={!!editingDeposit}
          onClose={() => { setEditingDeposit(null); setError(null); }}
          onUpdate={handleUpdate}
          error={error}
        />
      )}

      {editingTrade && (
        <EditTradeModal
          transaction={editingTrade}
          isOpen={!!editingTrade}
          onClose={() => { setEditingTrade(null); setError(null); }}
          onUpdate={handleUpdateTrade}
          error={error}
        />
      )}
    </div>
  );
} 