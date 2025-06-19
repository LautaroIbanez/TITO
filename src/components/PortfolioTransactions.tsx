import React from 'react';

interface Props {
  transactions: any[];
}

export default function PortfolioTransactions({ transactions }: Props) {
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <div className="overflow-x-auto rounded-lg shadow mb-8">
      <table className="min-w-full bg-white text-gray-900 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Symbol</th>
            <th className="px-4 py-2 text-right">Quantity</th>
            <th className="px-4 py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((tx, i) => (
            <tr key={i} className="even:bg-gray-50">
              <td className="px-4 py-2 font-mono">{new Date(tx.date).toLocaleDateString()}</td>
              <td className={`px-4 py-2 font-semibold ${tx.type === 'Buy' ? 'text-green-600' : 'text-red-600'}`}>{tx.type}</td>
              <td className="px-4 py-2 font-mono">{tx.symbol}</td>
              <td className="px-4 py-2 text-right">{tx.quantity}</td>
              <td className="px-4 py-2 text-right">${tx.price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 