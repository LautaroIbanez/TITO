'use client';
import { useState } from 'react';
import { Bond } from '@/types/finance';
import TradeModal, { TradeModalProps } from '@/components/TradeModal';
import AvailableCapitalIndicator from '@/components/AvailableCapitalIndicator';
import { usePortfolio } from '@/contexts/PortfolioContext';

import { useBonistasBonds } from '@/hooks/useBonistasBonds';
import { formatNumericValue, formatPercentage, formatVolume, logMissingMetrics } from '@/utils/bondUtils';

export default function BondsPage() {
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const { portfolioData } = usePortfolio();
  const { bonds, loading, error, refetch } = useBonistasBonds();

  const handleOpenModal = (bond: Bond) => {
    setSelectedBond(bond);
    setShowTradeModal(true);
  };

  const handleBuyBond: TradeModalProps['onSubmit'] = async (quantity, assetType, identifier, currency, commissionPct, purchaseFeePct, purchasePrice) => {
    const session = localStorage.getItem('session');
    if (!session) throw new Error("Session not found");
    const username = JSON.parse(session).username;
    const payload: {
      username: string;
      assetType: string;
      ticker: string;
      quantity: number;
      price: number;
      currency: string;
      commissionPct: number;
      purchaseFeePct: number;
    } = {
      username,
      assetType,
      ticker: identifier,
      quantity: Number(quantity),
      price: Number(purchasePrice),
      currency,
      commissionPct: commissionPct || 0,
      purchaseFeePct: purchaseFeePct || 0,
    };
    console.log('Payload enviado al backend:', payload);
    const res = await fetch('/api/portfolio/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'La compra falló');
    }
    setShowTradeModal(false);
    await refetch();
  };

  return (
    <>
      <TradeModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        onSubmit={handleBuyBond}
        tradeType="Buy"
        assetName={selectedBond?.name || ''}
        assetType="Bond"
        identifier={selectedBond?.ticker || ''}
        price={selectedBond?.price || 0}
        cash={portfolioData?.cash || { ARS: 0, USD: 0 }}
        currency={selectedBond?.currency || 'ARS'}
        assetClass="bonds"
      />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <AvailableCapitalIndicator assetClass="bonds" currency="ARS" />
          <AvailableCapitalIndicator assetClass="bonds" currency="USD" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">Mercado de Bonos</h1>
        <p className="text-gray-600">
          Explora bonos corporativos y gubernamentales para diversificar tu portafolio.
        </p>

        {loading && <p>Cargando bonos...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dif</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TIR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TEM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TNA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MD</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vol(M)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paridad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TTIr</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">upTTir</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bonds.map((bond, index) => {
                  // Log missing metrics for debugging
                  logMissingMetrics(bond);
                  
                  return (
                    <tr key={`${bond.id}-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bond.ticker}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumericValue(bond.price)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatNumericValue(bond.difference)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatPercentage(bond.tir)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatPercentage(bond.mtir)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatPercentage(bond.tna)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatNumericValue(bond.duration, 1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatVolume(bond.volume)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatNumericValue(bond.parity)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatVolume(bond.volume)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatPercentage(bond.ttir)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatPercentage(bond.uptir)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleOpenModal(bond)}
                          className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                          disabled={(portfolioData?.cash?.[bond.currency] ?? 0) < (bond.price ?? 0)}
                        >
                          Comprar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
} 