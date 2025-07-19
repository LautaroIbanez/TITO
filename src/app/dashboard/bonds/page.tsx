'use client';
import { useState, useMemo, useEffect } from 'react';
import { Bond } from '@/types/finance';
import TradeModal, { TradeModalProps } from '@/components/TradeModal';
import AvailableCapitalIndicator from '@/components/AvailableCapitalIndicator';
import { usePortfolio } from '@/contexts/PortfolioContext';

import { useBonistasBonds } from '@/hooks/useBonistasBonds';
import { formatNumericValue, formatPercentage, formatVolume, logMissingMetrics } from '@/utils/bondUtils';
import { sortBonds, toggleSortDirection, getSortIndicator, SortDirection } from '@/utils/bondSort';
import { suggestBondsByProfile, getProfileDisplayName, RiskProfile, mapRiskAppetiteToProfile } from '@/utils/bondAdvisor';

export default function BondsPage() {
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof Bond>('ticker');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const { portfolioData } = usePortfolio();
  const { bonds, loading, error, refetch } = useBonistasBonds();

  // Derivar el perfil de usuario desde el portfolio usando el mapeo
  const userProfile = mapRiskAppetiteToProfile(portfolioData?.profile?.riskAppetite);
  const [selectedProfile, setSelectedProfile] = useState<RiskProfile>(userProfile);

  // Sincronizar el perfil seleccionado con el perfil del portfolio
  useEffect(() => {
    setSelectedProfile(userProfile);
  }, [userProfile]);

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

  const handleSort = (column: keyof Bond) => {
    if (sortColumn === column) {
      setSortDirection(toggleSortDirection(sortDirection));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort bonds based on current sort configuration
  const sortedBonds = useMemo(() => {
    return sortBonds(bonds, sortColumn, sortDirection);
  }, [bonds, sortColumn, sortDirection]);

  // Get bond recommendations based on selected profile
  const suggestedBonds = useMemo(() => {
    return suggestBondsByProfile(selectedProfile, bonds);
  }, [selectedProfile, bonds]);

  // Create a set of recommended bond tickers for highlighting
  const recommendedTickers = useMemo(() => {
    return new Set(suggestedBonds.map(rec => rec.bond.ticker));
  }, [suggestedBonds]);

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
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mercado de Bonos</h1>
            <p className="text-gray-600">
              Explora bonos corporativos y gubernamentales para diversificar tu portafolio.
            </p>
          </div>
          
          {/* Profile Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="profile-select" className="text-sm font-medium text-gray-700">
              Perfil de Riesgo:
            </label>
            <select
              id="profile-select"
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value as RiskProfile)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
            >
              <option value="conservador">Conservador</option>
              <option value="moderado">Moderado</option>
              <option value="arriesgado">Arriesgado</option>
            </select>
          </div>
        </div>

        {/* Recommended Bonds Section */}
        {suggestedBonds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              Bonos recomendados para perfil {getProfileDisplayName(selectedProfile)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestedBonds.slice(0, 6).map((rec) => (
                <div key={rec.bond.ticker} className="bg-white p-3 rounded border border-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{rec.bond.ticker}</h3>
                      <p className="text-sm text-gray-600">{rec.bond.name}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Score: {rec.score.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-700">
                      TIR: {formatPercentage(rec.bond.tir)} | Paridad: {formatNumericValue(rec.bond.parity)}
                    </p>
                    {rec.reasons.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">{rec.reasons[0]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && <p>Cargando bonos...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('ticker')}
                  >
                    Ticker {getSortIndicator('ticker', sortColumn, sortDirection)}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}
                  >
                    Precio {getSortIndicator('price', sortColumn, sortDirection)}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('difference')}
                  >
                    Dif {getSortIndicator('difference', sortColumn, sortDirection)}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('tir')}
                  >
                    TIR {getSortIndicator('tir', sortColumn, sortDirection)}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('mtir')}
                  >
                    TEM {getSortIndicator('mtir', sortColumn, sortDirection)}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('tna')}
                  >
                    TNA {getSortIndicator('tna', sortColumn, sortDirection)}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('duration')}
                  >
                    MD {getSortIndicator('duration', sortColumn, sortDirection)}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('volume')}
                  >
                    Vol(M) {getSortIndicator('volume', sortColumn, sortDirection)}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('parity')}
                  >
                    Paridad {getSortIndicator('parity', sortColumn, sortDirection)}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('ttir')}
                  >
                    TTIr {getSortIndicator('ttir', sortColumn, sortDirection)}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('uptir')}
                  >
                    upTTir {getSortIndicator('uptir', sortColumn, sortDirection)}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedBonds.map((bond, index) => {
                  // Log missing metrics for debugging
                  logMissingMetrics(bond as unknown as Record<string, unknown>);
                  
                  const isRecommended = recommendedTickers.has(bond.ticker);
                  
                  return (
                    <tr 
                      key={`${bond.id}-${index}`}
                      className={isRecommended ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {bond.ticker}
                        {isRecommended && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Recomendado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumericValue(bond.price)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatNumericValue(bond.difference)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatPercentage(bond.tir)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatPercentage(bond.mtir)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatPercentage(bond.tna)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatNumericValue(bond.duration, 1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatVolume(bond.volume)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatNumericValue(bond.parity)}</td>
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