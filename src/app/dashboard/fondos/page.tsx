'use client';
import { useState, useEffect } from 'react';
import TradeModal, { TradeModalProps } from '@/components/TradeModal';
import AvailableCapitalIndicator from '@/components/AvailableCapitalIndicator';
import { usePortfolio } from '@/contexts/PortfolioContext';

interface MutualFund {
  fondo: string;
  tna: number;
  rendimiento_mensual: number;
  categoria: string;
}

interface MutualFundsData {
  moneyMarket: MutualFund[];
  rentaFija: MutualFund[];
  rentaVariable: MutualFund[];
  rentaMixta: MutualFund[];
}

export default function FondosPage() {
  const [mutualFunds, setMutualFunds] = useState<MutualFundsData>({
    moneyMarket: [],
    rentaFija: [],
    rentaVariable: [],
    rentaMixta: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFund, setSelectedFund] = useState<MutualFund | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { portfolioData, refreshPortfolio } = usePortfolio();

  async function fetchMutualFunds() {
    setLoading(true);
    try {
      const res = await fetch('/api/fondos');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch mutual funds data');
      }
      const data = await res.json();
      setMutualFunds(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMutualFunds();
  }, []);

  const handleOpenModal = (fund: MutualFund) => {
    setSelectedFund(fund);
    setIsModalOpen(true);
  };

  const handleCreateFund: TradeModalProps['onSubmit'] = async (amount, assetType, identifier, currency) => {
    if (!selectedFund) return;
    
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;

    const body = {
      username,
      assetType,
      name: selectedFund.fondo,
      category: selectedFund.categoria,
      amount,
      annualRate: selectedFund.tna,
      currency: 'ARS', // Mutual funds are typically in ARS
    };

    try {
      const res = await fetch('/api/portfolio/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create mutual fund investment');
      }

      await refreshPortfolio(); // Refresh portfolio data
      setIsModalOpen(false);
      setSelectedFund(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderFundCard = (fund: MutualFund) => (
    <div key={fund.fondo} className="bg-white shadow rounded-lg p-6 flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-lg text-gray-900">{fund.fondo}</h3>
        <p className="text-sm text-gray-600">Categoría: {fund.categoria}</p>
      </div>
      <div className="my-4">
        <p className="text-3xl font-bold text-green-600">{fund.tna.toFixed(2)}%</p>
        <p className="text-sm text-gray-800">TNA</p>
        <p className="text-sm text-gray-600">
          Rendimiento mensual: {fund.rendimiento_mensual.toFixed(2)}%
        </p>
      </div>
      <button 
        onClick={() => handleOpenModal(fund)}
        className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        disabled={(portfolioData?.cash?.ARS ?? 0) <= 0}
      >
        Comprar
      </button>
    </div>
  );

  const renderCategorySection = (title: string, funds: MutualFund[], categoryKey: string) => (
    <div key={categoryKey} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funds.map(renderFundCard)}
      </div>
    </div>
  );

  return (
    <>
      {isModalOpen && selectedFund && (
        <TradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateFund}
          tradeType="Invest"
          assetName={selectedFund.fondo}
          assetType="MutualFund"
          identifier={selectedFund.fondo}
          cash={portfolioData?.cash ?? { ARS: 0, USD: 0 }}
          isAmountBased={true}
          currency="ARS"
          assetClass="mutualFunds"
        />
      )}
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <AvailableCapitalIndicator assetClass="mutualFunds" currency="ARS" />
            <AvailableCapitalIndicator assetClass="mutualFunds" currency="USD" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">Fondos Mutuos Disponibles</h1>
        <p className="text-gray-600">
          Invierte en fondos mutuos para diversificar tu portafolio y acceder a diferentes estrategias de inversión.
        </p>

        {loading && <p>Cargando fondos mutuos...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && (
          <div className="space-y-8">
            {renderCategorySection('Money Market', mutualFunds.moneyMarket, 'moneyMarket')}
            {renderCategorySection('Renta Fija', mutualFunds.rentaFija, 'rentaFija')}
            {renderCategorySection('Renta Variable', mutualFunds.rentaVariable, 'rentaVariable')}
            {renderCategorySection('Renta Mixta', mutualFunds.rentaMixta, 'rentaMixta')}
          </div>
        )}
      </div>
    </>
  );
} 