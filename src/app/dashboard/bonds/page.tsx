'use client';
import { useState, useEffect } from 'react';
import { Bond } from '@/types/finance';
import TradeModal, { TradeModalProps } from '@/components/TradeModal';
import AvailableCapitalIndicator from '@/components/AvailableCapitalIndicator';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { formatCurrency } from '@/utils/goalCalculator';

export default function BondsPage() {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const { portfolioData } = usePortfolio();

  async function fetchInitialData() {
    setLoading(true);
    try {
      const session = localStorage.getItem('session');
      if (!session) throw new Error('User not logged in');
      const username = JSON.parse(session).username;

      const bondsRes = await fetch('/api/bonds');

      if (!bondsRes.ok) throw new Error('Failed to fetch bonds data');
      const bondsData = await bondsRes.json();
      setBonds(bondsData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleOpenModal = (bond: Bond) => {
    setSelectedBond(bond);
    setShowTradeModal(true);
  };

  const handleBuyBond: TradeModalProps['onSubmit'] = async (quantity, assetType, identifier, currency, commissionPct, purchaseFeePct, purchasePrice) => {
    const session = localStorage.getItem('session');
    if (!session) throw new Error("Session not found");
    const username = JSON.parse(session).username;
    const payload: any = {
      username,
      assetType,
      ticker: identifier,
      quantity: Number(quantity),
      price: Number(purchasePrice),
      currency,
      commissionPct,
      purchaseFeePct,
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
    await fetchInitialData();
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasa Cupón</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bonds.map((bond) => (
                  <tr key={bond.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bond.ticker}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bond.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(bond.maturityDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{bond.couponRate.toFixed(2)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(bond.price, bond.currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleOpenModal(bond)}
                        className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                        disabled={(portfolioData?.cash?.[bond.currency] ?? 0) < bond.price}
                      >
                        Comprar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
} 