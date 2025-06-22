import React from 'react';
import { PortfolioTransaction } from '@/types';

interface Props {
  transactions: PortfolioTransaction[];
}

export default function PortfolioTransactions({ transactions }: Props) {
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
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
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-700 text-center py-8">Aún no hay transacciones.</p>
      )}
    </div>
  );
} 