import React from 'react';
import { PortfolioPosition, StockPosition, BondPosition, FixedTermDepositPosition } from '@/types';

interface Props {
  positions: PortfolioPosition[];
  prices: Record<string, any[]>;
  fundamentals: Record<string, any>;
  technicals: Record<string, any>;
  availableCash: number;
}

function getCurrentPrice(prices: any[]) {
  if (!prices || prices.length === 0) return 0;
  return prices[prices.length - 1].close;
}

const renderStockRow = (pos: StockPosition, prices: Record<string, any[]>, fundamentals: Record<string, any>, technicals: Record<string, any>) => {
  const currPrice = getCurrentPrice(prices[pos.symbol]);
  const value = pos.quantity * currPrice;
  const gain = currPrice && pos.averagePrice ? ((currPrice - pos.averagePrice) / pos.averagePrice) * 100 : 0;
  const f = fundamentals[pos.symbol];
  const t = technicals[pos.symbol];

  return (
    <tr key={pos.symbol} className="even:bg-gray-50">
      <td className="px-4 py-2 font-mono text-gray-900">{pos.symbol}</td>
      <td className="px-4 py-2 text-gray-700">Acción</td>
      <td className="px-4 py-2 text-right text-gray-900">{pos.quantity}</td>
      <td className="px-4 py-2 text-right text-gray-900">${pos.averagePrice.toFixed(2)}</td>
      <td className="px-4 py-2 text-right text-gray-900">${currPrice.toFixed(2)}</td>
      <td className="px-4 py-2 text-right text-gray-900">${value.toFixed(2)}</td>
      <td className={`px-4 py-2 text-right font-semibold ${gain > 0 ? 'text-green-600' : gain < 0 ? 'text-red-600' : 'text-gray-900'}`}>{gain >= 0 ? '+' : ''}{gain.toFixed(2)}%</td>
      <td className="px-4 py-2 text-right text-gray-900">{f?.peRatio?.toFixed(2) ?? '-'}</td>
      <td className="px-4 py-2 text-right text-gray-900">{t?.rsi?.toFixed(2) ?? '-'}</td>
    </tr>
  );
};

const renderBondRow = (pos: BondPosition) => {
  // Bond prices are static for now, so gain/loss is not calculated.
  // This could be extended by fetching bond market prices.
  const value = pos.quantity * pos.averagePrice;
  return (
    <tr key={pos.ticker} className="even:bg-gray-50">
      <td className="px-4 py-2 font-mono text-gray-900">{pos.ticker}</td>
      <td className="px-4 py-2 text-gray-700">Bono</td>
      <td className="px-4 py-2 text-right text-gray-900">{pos.quantity}</td>
      <td className="px-4 py-2 text-right text-gray-900">${pos.averagePrice.toFixed(2)}</td>
      <td className="px-4 py-2 text-right text-gray-700">-</td>
      <td className="px-4 py-2 text-right text-gray-900">${value.toFixed(2)}</td>
      <td className="px-4 py-2 text-right text-gray-700">-</td>
      <td className="px-4 py-2 text-right text-gray-700">-</td>
      <td className="px-4 py-2 text-right text-gray-700">-</td>
    </tr>
  );
};

const renderDepositRow = (pos: FixedTermDepositPosition) => {
  return (
    <tr key={pos.id} className="even:bg-gray-50">
      <td className="px-4 py-2 font-medium text-gray-900">{pos.provider}</td>
      <td className="px-4 py-2 text-gray-700">Plazo Fijo</td>
      <td className="px-4 py-2 text-right text-gray-700">-</td>
      <td className="px-4 py-2 text-right text-gray-700">-</td>
      <td className="px-4 py-2 text-right text-gray-700">-</td>
      <td className="px-4 py-2 text-right text-gray-900">${pos.amount.toFixed(2)}</td>
      <td className="px-4 py-2 text-right text-green-600">{pos.annualRate.toFixed(2)}%</td>
      <td className="px-4 py-2 text-right text-gray-700">{new Date(pos.maturityDate).toLocaleDateString()}</td>
      <td className="px-4 py-2 text-right text-gray-700">-</td>
    </tr>
  );
};

export default function PortfolioTable({ positions, prices, fundamentals, technicals, availableCash }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg shadow mb-8">
      <table className="min-w-full bg-white text-gray-900 text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-700">
            <th className="px-4 py-2 text-left">Activo</th>
            <th className="px-4 py-2 text-left">Tipo</th>
            <th className="px-4 py-2 text-right">Cantidad</th>
            <th className="px-4 py-2 text-right">Precio Prom.</th>
            <th className="px-4 py-2 text-right">Precio Actual</th>
            <th className="px-4 py-2 text-right">Valor Total</th>
            <th className="px-4 py-2 text-right">Gan/Pérd % / TNA</th>
            <th className="px-4 py-2 text-right">P/E / Vencimiento</th>
            <th className="px-4 py-2 text-right">RSI</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            switch (pos.type) {
              case 'Stock':
                return renderStockRow(pos, prices, fundamentals, technicals);
              case 'Bond':
                return renderBondRow(pos);
              case 'FixedTermDeposit':
                return renderDepositRow(pos);
              default:
                return null;
            }
          })}
        </tbody>
      </table>
    </div>
  );
} 