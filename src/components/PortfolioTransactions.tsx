import React, { useState } from 'react';
import { PortfolioTransaction, DepositTransaction } from '@/types';
import EditDepositModal from './EditDepositModal';
import { usePortfolio } from '@/contexts/PortfolioContext';

interface Props {
  transactions: PortfolioTransaction[];
}

export default function PortfolioTransactions({ transactions }: Props) {
  const { refreshPortfolio } = usePortfolio();
  const [editingDeposit, setEditingDeposit] = useState<DepositTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const handleDelete = async (transactionId: string) => {
    if (!window.confirm('Are you sure you want to delete this deposit?')) return;
    
    setError(null);
    const session = localStorage.getItem('session');
    const username = session ? JSON.parse(session).username : null;
    if (!username) {
      setError('You must be logged in.');
      return;
    }

    try {
      const res = await fetch(`/api/portfolio/deposit/${transactionId}?username=${username}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete deposit');
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

  const getTransactionDisplay = (tx: PortfolioTransaction) => {
    if (tx.type === 'Buy' || tx.type === 'Sell') {
      if (tx.assetType === 'Stock') {
        return {
          symbol: tx.symbol,
          quantity: tx.quantity,
          price: tx.price,
          typeLabel: tx.type === 'Buy' ? 'Compra' : 'Venta',
          typeColor: tx.type === 'Buy' ? 'text-green-600' : 'text-red-600',
          commissionPct: tx.commissionPct,
          purchaseFeePct: tx.purchaseFeePct
        };
      } else if (tx.assetType === 'Bond') {
        return {
          symbol: tx.ticker,
          quantity: tx.quantity,
          price: tx.price,
          typeLabel: tx.type === 'Buy' ? 'Compra Bono' : 'Venta Bono',
          typeColor: tx.type === 'Buy' ? 'text-green-600' : 'text-red-600',
          commissionPct: tx.commissionPct,
          purchaseFeePct: tx.purchaseFeePct
        };
      }
    } else if (tx.type === 'Create' && tx.assetType === 'FixedTermDeposit') {
      return {
        symbol: tx.provider,
        quantity: null,
        price: null,
        typeLabel: 'Creación Plazo Fijo',
        typeColor: 'text-blue-600',
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
              <th className="px-4 py-2 text-right">Precio</th>
              <th className="px-4 py-2 text-right">Comisiones</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx, i) => {
              const display = getTransactionDisplay(tx);
              const hasFees = display.commissionPct !== undefined || display.purchaseFeePct !== undefined;
              
              return (
                <tr key={i} className="even:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-800">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className={`px-4 py-2 font-semibold ${display.typeColor}`}>
                    {display.typeLabel}
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-800">{display.symbol}</td>
                  <td className="px-4 py-2 text-right text-gray-800">
                    {display.quantity !== null ? display.quantity : 
                     tx.type === 'Deposit' ? `$${tx.amount.toFixed(2)}` :
                     tx.type === 'Create' && tx.assetType === 'FixedTermDeposit' ? `$${tx.amount.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-800">
                    {display.price !== null ? `$${display.price.toFixed(2)}` : '—'}
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
                  <td className="px-4 py-2 text-right">
                    {tx.type === 'Deposit' ? (
                      <div className="flex justify-end items-center space-x-2">
                        <button onClick={() => setEditingDeposit(tx as DepositTransaction)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Editar</button>
                        <button onClick={() => handleDelete(tx.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
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
    </div>
  );
} 