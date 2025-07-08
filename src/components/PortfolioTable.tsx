import React, { useState } from 'react';
import { PortfolioPosition, StockPosition, BondPosition, FixedTermDepositPosition, CaucionPosition, CryptoPosition } from '@/types';
import { PriceData, Fundamentals, Technicals } from '@/types/finance';
import TradeModal, { TradeType } from './TradeModal';
import type { TradeModalProps } from './TradeModal';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { formatCurrency } from '@/utils/goalCalculator';
import { computePositionGain } from '@/utils/positionGains';
import { detectDuplicates } from '@/utils/duplicateDetection';
import { validatePositionPrice } from '@/utils/priceValidation';

interface Props {
  positions: PortfolioPosition[];
  prices: Record<string, PriceData[]>;
  fundamentals: Record<string, Fundamentals | null>;
  technicals: Record<string, Technicals | null>;
  cash: { ARS: number; USD: number };
  onPortfolioUpdate: () => void;
}

function getCurrentPrice(prices: PriceData[]): number | undefined {
  if (!prices || prices.length === 0) return undefined;
  const latestPrice = prices[prices.length - 1]?.close;
  return latestPrice === 0 ? undefined : latestPrice;
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
    let market = undefined;
    if (assetType === 'Stock') {
      const price = getCurrentPrice(prices[identifier]);
      currentPrice = price ?? 0;
      if (modalState.asset?.type === 'Stock') {
        market = modalState.asset.market;
      }
    } else if (assetType === 'Bond' && modalState.asset?.type === 'Bond') {
      currentPrice = modalState.asset.averagePrice;
    } else if (assetType === 'Crypto') {
      const price = getCurrentPrice(prices[identifier]);
      currentPrice = price ?? 0;
    }
    
    // Create payload object according to requirements
    const payload: any = {
      username,
      assetType,
      quantity,
      price: currentPrice,
      currency
    };

    // Add ticker for Bond, symbol for others
    if (assetType === 'Bond') {
      payload.ticker = identifier;
    } else {
      payload.symbol = identifier;
    }

    // Add market if it exists
    if (market) {
      payload.market = market;
    }
    
    const res = await fetch('/api/portfolio/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
    const assetName = asset.type === 'Stock' ? asset.symbol : asset.type === 'Bond' ? asset.ticker : asset.type === 'Crypto' ? asset.symbol : asset.id;
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
  
  const openSellModal = (asset: StockPosition | BondPosition | CryptoPosition) => {
    setModalState({ isOpen: true, tradeType: 'Sell', asset });
  };

  const renderStockRow = (pos: StockPosition) => {
    const priceValidation = validatePositionPrice(pos, prices);
    const hasValidPrice = priceValidation.hasValidPrice;
    const currPrice = priceValidation.currentPrice;
    const value = hasValidPrice ? pos.quantity * currPrice! : 0;
    const gain = hasValidPrice && pos.averagePrice ? ((currPrice! - pos.averagePrice) / pos.averagePrice) * 100 : 0;
    const gainCurrency = hasValidPrice ? computePositionGain(pos, currPrice!) : 0;
    const f = fundamentals[pos.symbol];
    const t = technicals[pos.symbol];

    return (
      <tr key={`${pos.symbol}-${pos.currency}`} className="even:bg-gray-50">
        <td className="px-4 py-2 font-mono text-gray-900">{pos.symbol}</td>
        <td className="px-4 py-2 text-gray-700">Acción</td>
        <td className="px-4 py-2 text-gray-700">{pos.currency}</td>
        <td className="px-4 py-2 text-right text-gray-900">{pos.quantity}</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(pos.averagePrice, pos.currency)}</td>
        <td className="px-4 py-2 text-right text-gray-900">
          {hasValidPrice ? formatCurrency(currPrice!, pos.currency) : (
            <span className="text-orange-600 text-xs">Sin datos suficientes</span>
          )}
        </td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(value, pos.currency)}</td>
        <td className={`px-4 py-2 text-right font-semibold ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {hasValidPrice ? `${gain.toFixed(2)}%` : '-'}
        </td>
        <td className={`px-4 py-2 text-right font-semibold ${gainCurrency >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {hasValidPrice ? formatCurrency(gainCurrency, pos.currency) : '-'}
        </td>
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
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-center">-</td>
      </tr>
    );
  };

  const renderDepositRow = (pos: FixedTermDepositPosition) => {
    const gainCurrency = computePositionGain(pos);
    return (
      <tr key={pos.id} className="even:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{pos.provider}</td>
        <td className="px-4 py-2 text-gray-700">Plazo Fijo</td>
        <td className="px-4 py-2 text-gray-700">{pos.currency}</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(pos.amount, pos.currency)}</td>
        <td className="px-4 py-2 text-right text-green-600">{pos.annualRate?.toFixed(2) ?? '-' }%</td>
        <td className={`px-4 py-2 text-right font-semibold ${gainCurrency >= 0 ? 'text-green-600' : 'text-red-600'}`}>{gainCurrency !== undefined ? formatCurrency(gainCurrency, pos.currency) : '-'}</td>
        <td className="px-4 py-2 text-right text-gray-700">{pos.maturityDate ? new Date(pos.maturityDate).toLocaleDateString() : '-'}</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-center">
          <button onClick={() => handleRemove(pos)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
        </td>
      </tr>
    );
  };

  const renderCaucionRow = (pos: CaucionPosition) => {
    const gainCurrency = computePositionGain(pos);
    return (
      <tr key={pos.id} className="even:bg-gray-50">
        <td className="px-4 py-2 font-medium text-gray-900">{pos.provider}</td>
        <td className="px-4 py-2 text-gray-700">Caución</td>
        <td className="px-4 py-2 text-gray-700">{pos.currency}</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-700">-</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(pos.amount, pos.currency)}</td>
        <td className="px-4 py-2 text-right text-green-600">{pos.annualRate?.toFixed(2) ?? '-' }%</td>
        <td className={`px-4 py-2 text-right font-semibold ${gainCurrency >= 0 ? 'text-green-600' : 'text-red-600'}`}>{gainCurrency !== undefined ? formatCurrency(gainCurrency, pos.currency) : '-'}</td>
        <td className="px-4 py-2 text-right text-gray-700">{pos.maturityDate ? new Date(pos.maturityDate).toLocaleDateString() : '-'}</td>
        <td className="px-4 py-2 text-right text-gray-700">{pos.term ? `${pos.term} días` : '-'}</td>
        <td className="px-4 py-2 text-center">
          <button onClick={() => handleRemove(pos)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
        </td>
      </tr>
    );
  };

  const renderCryptoRow = (pos: CryptoPosition) => {
    const priceValidation = validatePositionPrice(pos, prices);
    const hasValidPrice = priceValidation.hasValidPrice;
    const currPrice = priceValidation.currentPrice;
    const value = hasValidPrice ? pos.quantity * currPrice! : 0;
    const gain = hasValidPrice && pos.averagePrice ? ((currPrice! - pos.averagePrice) / pos.averagePrice) * 100 : 0;
    const gainCurrency = hasValidPrice ? computePositionGain(pos, currPrice!) : 0;
    const f = fundamentals[pos.symbol];
    const t = technicals[pos.symbol];

    return (
      <tr key={`${pos.symbol}-${pos.currency}`} className="even:bg-gray-50">
        <td className="px-4 py-2 font-mono text-gray-900">{pos.symbol}</td>
        <td className="px-4 py-2 text-gray-700">Cripto</td>
        <td className="px-4 py-2 text-gray-700">{pos.currency}</td>
        <td className="px-4 py-2 text-right text-gray-900">{pos.quantity}</td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(pos.averagePrice, pos.currency)}</td>
        <td className="px-4 py-2 text-right text-gray-900">
          {hasValidPrice ? formatCurrency(currPrice!, pos.currency) : (
            <span className="text-orange-600 text-xs">Sin datos suficientes</span>
          )}
        </td>
        <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(value, pos.currency)}</td>
        <td className={`px-4 py-2 text-right font-semibold ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {hasValidPrice ? `${gain.toFixed(2)}%` : '-'}
        </td>
        <td className={`px-4 py-2 text-right font-semibold ${gainCurrency >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {hasValidPrice ? formatCurrency(gainCurrency, pos.currency) : '-'}
        </td>
        <td className="px-4 py-2 text-right text-gray-900">{f?.peRatio?.toFixed(2) ?? '-'}</td>
        <td className="px-4 py-2 text-right text-gray-900">{t?.rsi?.toFixed(2) ?? '-'}</td>
        <td className="px-4 py-2 text-center">
          <button onClick={() => openSellModal(pos)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Vender</button>
        </td>
      </tr>
    );
  };
  
  const getModalInfo = () => {
    if (!modalState.asset) return { assetName: '', identifier: '', price: 0, maxShares: 0, assetType: 'Stock' as const, currency: 'ARS' as const };
    const { asset } = modalState;
    if (asset.type === 'Stock') {
      const priceValidation = validatePositionPrice(asset, prices);
      return { 
        assetName: asset.symbol, 
        identifier: asset.symbol, 
        price: priceValidation.currentPrice ?? 0, 
        maxShares: asset.quantity, 
        assetType: asset.type, 
        currency: asset.currency 
      };
    }
    if (asset.type === 'Bond') {
      return { assetName: asset.ticker, identifier: asset.ticker, price: asset.averagePrice, maxShares: asset.quantity, assetType: asset.type, currency: asset.currency };
    }
    if (asset.type === 'Crypto') {
      const priceValidation = validatePositionPrice(asset, prices);
      return { 
        assetName: asset.symbol, 
        identifier: asset.symbol, 
        price: priceValidation.currentPrice ?? 0, 
        maxShares: asset.quantity, 
        assetType: asset.type, 
        currency: asset.currency 
      };
    }
    return { assetName: '', identifier: '', price: 0, maxShares: 0, assetType: 'Stock' as const, currency: 'ARS' as const };
  };

  const modalInfo = getModalInfo();

  // Detect duplicates
  const duplicateResult = detectDuplicates(positions);

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
      
      {/* Duplicate Warning Banner */}
      {duplicateResult.hasDuplicates && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Activos duplicados detectados
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{duplicateResult.warningMessage}</p>
                <ul className="mt-2 list-disc list-inside">
                  {duplicateResult.duplicates.map((group, index) => (
                    <li key={index} className="text-xs">
                      {group.warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
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
              <th className="px-4 py-2 text-right">Gan/Pérd ($)</th>
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
              if (pos.type === 'Crypto') return renderCryptoRow(pos);
              return null;
            })}
          </tbody>
        </table>
      </div>
    </>
  );
} 