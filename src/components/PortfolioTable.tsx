import React from 'react';

interface Props {
  positions: any[];
  prices: Record<string, any[]>;
  fundamentals: Record<string, any>;
  technicals: Record<string, any>;
}

function getCurrentPrice(prices: any[]) {
  if (!prices || prices.length === 0) return 0;
  return prices[prices.length - 1].close;
}

export default function PortfolioTable({ positions, prices, fundamentals, technicals }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg shadow mb-8">
      <table className="min-w-full bg-white text-gray-900 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Symbol</th>
            <th className="px-4 py-2 text-right">Quantity</th>
            <th className="px-4 py-2 text-right">Avg. Price</th>
            <th className="px-4 py-2 text-right">Current Price</th>
            <th className="px-4 py-2 text-right">Value</th>
            <th className="px-4 py-2 text-right">Gain/Loss %</th>
            <th className="px-4 py-2 text-right">PE</th>
            <th className="px-4 py-2 text-right">RSI</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const currPrice = getCurrentPrice(prices[pos.symbol]);
            const value = pos.quantity * currPrice;
            const gain = currPrice && pos.averagePrice ? ((currPrice - pos.averagePrice) / pos.averagePrice) * 100 : 0;
            const f = fundamentals[pos.symbol];
            const t = technicals[pos.symbol];
            return (
              <tr key={pos.symbol} className="even:bg-gray-50">
                <td className="px-4 py-2 font-mono">{pos.symbol}</td>
                <td className="px-4 py-2 text-right">{pos.quantity}</td>
                <td className="px-4 py-2 text-right">${pos.averagePrice.toFixed(2)}</td>
                <td className="px-4 py-2 text-right">${currPrice.toFixed(2)}</td>
                <td className="px-4 py-2 text-right">${value.toFixed(2)}</td>
                <td className={`px-4 py-2 text-right font-semibold ${gain > 0 ? 'text-green-600' : gain < 0 ? 'text-red-600' : 'text-gray-700'}`}>{gain >= 0 ? '+' : ''}{gain.toFixed(2)}%</td>
                <td className="px-4 py-2 text-right">{f?.peRatio ?? '-'}</td>
                <td className="px-4 py-2 text-right">{t?.rsi ?? '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 