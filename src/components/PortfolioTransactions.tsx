import React from 'react';

interface Props {
  transactions: any[];
}

export default function PortfolioTransactions({ transactions }: Props) {
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <div className="overflow-x-auto rounded-lg shadow mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 px-4 pt-4">Transacciones Recientes</h3>
      {sorted.length > 0 ? (
        <table className="min-w-full bg-white text-gray-900 text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Símbolo</th>
              <th className="px-4 py-2 text-right">Monto / Cantidad</th>
              <th className="px-4 py-2 text-right">Precio</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx, i) => {
              const isTrade = tx.type === 'Buy' || tx.type === 'Sell';
              return (
                <tr key={i} className="even:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-800">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className={`px-4 py-2 font-semibold ${tx.type === 'Buy' ? 'text-green-600' : tx.type === 'Sell' ? 'text-red-600' : 'text-blue-600'}`}>
                    {tx.type === 'Buy' ? 'Compra' : tx.type === 'Sell' ? 'Venta' : 'Depósito'}
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-800">{isTrade ? tx.symbol : '—'}</td>
                  <td className="px-4 py-2 text-right text-gray-800">{isTrade ? tx.quantity : `$${tx.amount.toFixed(2)}`}</td>
                  <td className="px-4 py-2 text-right text-gray-800">{isTrade ? `$${tx.price.toFixed(2)}` : '—'}</td>
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