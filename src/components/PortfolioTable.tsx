import React, { useState } from 'react';
import { PortfolioPosition, StockPosition, BondPosition, FixedTermDepositPosition, CaucionPosition } from '@/types';
import { PriceData, Fundamentals, Technicals } from '@/types/finance';
import TradeModal, { TradeType } from './TradeModal';
import type { TradeModalProps } from './TradeModal';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { formatCurrency } from '@/utils/goalCalculator';

interface Props {
  positions: PortfolioPosition[];
  prices: Record<string, PriceData[]>;
  fundamentals: Record<string, Fundamentals | null>;
  technicals: Record<string, Technicals | null>;
  cash: { ARS: number; USD: number };
  onPortfolioUpdate: () => void;
}

function getCurrentPrice(prices: PriceData[]): number {
  if (!prices || prices.length === 0) return 0;
  return prices[prices.length - 1]?.close || 0;
}

export default function PortfolioTable({ positions, prices, fundamentals, technicals, cash, onPortfolioUpdate }: Props) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    tradeType: TradeType;
    asset: PortfolioPosition | null;
  }>({ isOpen: false, tradeType: 'Sell', asset: null });

  const { refreshPortfolio } = usePortfolio();

  const handleSellSubmit: TradeModalProps['onSubmit'] = async (quantity, assetType, identifier, currency) => {
    const session = localStorage.getItem('session');
    if (!session) throw new Error("Session not found");
    const username = JSON.parse(session).username;

    let currentPrice = 0;
    if (assetType === 'Stock') {
      currentPrice = getCurrentPrice(prices[identifier]);
    } else if (assetType === 'Bond' && modalState.asset?.type === 'Bond') {
      currentPrice = modalState.asset.averagePrice;
    }
    
    const res = await fetch('/api/portfolio/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, assetType, identifier, quantity, price: currentPrice, currency }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'La venta falló');
    }
    onPortfolioUpdate();
    await refreshPortfolio();
    setModalState({ isOpen: false, tradeType: 'Sell', asset: null });
  };

  const handleRemove = async (asset: PortfolioPosition) => {
    const assetName = asset.type === 'Stock' ? asset.symbol : asset.type === 'Bond' ? asset.ticker : asset.id;
    if (!confirm(`¿Estás seguro que quieres eliminar la posición ${assetName}?`)) return;
    
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    
    const identifier = 'symbol' in asset ? asset.symbol : 'ticker' in asset ? asset.ticker : asset.id;

    const res = await fetch('/api/portfolio/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, assetType: asset.type, identifier }),
    });

    if (res.ok) {
      onPortfolioUpdate();
      await refreshPortfolio();
    } else {
      const data = await res.json();
      alert(`Error: ${data.error || 'No se pudo eliminar la posición.'}`);
    }
  };
  
  const openSellModal = (asset: StockPosition | BondPosition) => {
    setModalState({ isOpen: true, tradeType: 'Sell', asset });
  };

  const renderStockRow = (pos: StockPosition) => {
    const currPrice = getCurrentPrice(prices[pos.symbol]);
    const value = pos.quantity * currPrice;
    const gain = currPrice && pos.averagePrice ? ((currPrice - pos.averagePrice) / pos.averagePrice) * 100 : 0;
    const f = fundamentals[pos.symbol];
    const t = technicals[pos.symbol];

    return (
      <tr key={`${pos.symbol}-${pos.currency}`} className="even:bg-gray-50">
        <td className="px-4 py-2 font-mono text-gray-900">{pos.symbol}</td>
        <td className="px-4 py-2 text-gray-700">Acción</td>
        <td className="px-4 py-2 text-gray-700">{pos.currency}</td>
        <td className="px-4 py-2 text-right text-gray-900">{pos.quantity}</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(pos.averagePrice, pos.currency)}</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(currPrice, pos.currency)}</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(value, pos.currency)}</td>
        <td className={`px-4 py-2 text-right font-semibold ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>{gain.toFixed(2)}%</td>
        <td className="px-4 py-2 text-right text-gray-900">{f?.peRatio?.toFixed(2) ?? '-'}</td>
        <td className="px-4 py-2 text-right text-gray-900">{t?.rsi?.toFixed(2) ?? '-'}</td>
        <td className="px-4 py-2 text-center">
          <button onClick={() => openSellModal(pos)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Vender</button>
        </td>
      </tr>
    );
  };

  const renderBondRow = (pos: BondPosition) => {
    const value = pos.quantity * pos.averagePrice;
    return (
      <tr key={`${pos.ticker}-${pos.currency}`} className="even:bg-gray-50">
        <td className="px-4 py-2 font-mono text-gray-900">{pos.ticker}</td>
        <td className="px-4 py-2 text-gray-700">Bono</td>
        <td className="px-4 py-2 text-gray-700">{pos.currency}</td>
        <td className="px-4 py-2 text-right text-gray-900">{pos.quantity}</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(pos.averagePrice, pos.currency)}</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(value, pos.currency)}</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-center">
          <button onClick={() => openSellModal(pos)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Vender</button>
        </td>
      </tr>
    );
  };

  const renderDepositRow = (pos: FixedTermDepositPosition) => {
    return (
      <tr key={pos.id} className="even:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{pos.provider}</td>
        <td className="px-4 py-2 text-gray-700">Plazo Fijo</td>
        <td className="px-4 py-2 text-gray-700">{pos.currency}</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(pos.amount, pos.currency)}</td>
        <td className="px-4 py-2 text-right text-green-600">{pos.annualRate.toFixed(2)}%</td>
        <td className="px-4 py-2 text-right text-gray-700">{new Date(pos.maturityDate).toLocaleDateString()}</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-center">
          <button onClick={() => handleRemove(pos)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
        </td>
      </tr>
    );
  };

  const renderCaucionRow = (pos: CaucionPosition) => {
    return (
      <tr key={pos.id} className="even:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{pos.provider}</td>
        <td className="px-4 py-2 text-gray-700">Caución</td>
        <td className="px-4 py-2 text-gray-700">{pos.currency}</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(pos.amount, pos.currency)}</td>
        <td className="px-4 py-2 text-right text-green-600">{pos.annualRate.toFixed(2)}%</td>
        <td className="px-4 py-2 text-right text-gray-700">{new Date(pos.maturityDate).toLocaleDateString()}</td>
        <td className="px-4 py-2 text-right text-gray-700">{pos.term} días</td>
        <td className="px-4 py-2 text-center">
          <button onClick={() => handleRemove(pos)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
        </td>
      </tr>
    );
  };
  
  const getModalInfo = () => {
    if (!modalState.asset) return { assetName: '', identifier: '', price: 0, maxShares: 0, assetType: 'Stock' as const, currency: 'ARS' as const };
    const { asset } = modalState;
    if (asset.type === 'Stock') {
      return { assetName: asset.symbol, identifier: asset.symbol, price: getCurrentPrice(prices[asset.symbol]), maxShares: asset.quantity, assetType: asset.type, currency: asset.currency };
    }
    if (asset.type === 'Bond') {
      return { assetName: asset.ticker, identifier: asset.ticker, price: asset.averagePrice, maxShares: asset.quantity, assetType: asset.type, currency: asset.currency };
    }
    return { assetName: '', identifier: '', price: 0, maxShares: 0, assetType: 'Stock' as const, currency: 'ARS' as const };
  };

  const modalInfo = getModalInfo();

  return (
    <>
      {modalState.isOpen && modalState.asset && modalState.asset.type !== 'FixedTermDeposit' && (
        <TradeModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, tradeType: 'Sell', asset: null })}
          onSubmit={handleSellSubmit}
          tradeType={modalState.tradeType}
          assetName={modalInfo.assetName}
          assetType={modalInfo.assetType}
          identifier={modalInfo.identifier}
          price={modalInfo.price}
          cash={cash}
          maxShares={modalInfo.maxShares}
          currency={modalInfo.currency}
        />
      )}
      <div className="overflow-x-auto rounded-lg shadow mb-8">
        <table className="min-w-full bg-white text-gray-900 text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-4 py-2 text-left">Activo</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Moneda</th>
              <th className="px-4 py-2 text-right">Cantidad</th>
              <th className="px-4 py-2 text-right">Precio Prom.</th>
              <th className="px-4 py-2 text-right">Precio Actual</th>
              <th className="px-4 py-2 text-right">Valor Total</th>
              <th className="px-4 py-2 text-right">Gan/Pérd % / TNA</th>
              <th className="px-4 py-2 text-right">P/E / Vencimiento</th>
              <th className="px-4 py-2 text-right">RSI</th>
              <th className="px-4 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              if (pos.type === 'Stock') return renderStockRow(pos);
              if (pos.type === 'Bond') return renderBondRow(pos);
              if (pos.type === 'FixedTermDeposit') return renderDepositRow(pos);
              if (pos.type === 'Caucion') return renderCaucionRow(pos);
              return null;
            })}
          </tbody>
        </table>
      </div>
    </>
  );
} 