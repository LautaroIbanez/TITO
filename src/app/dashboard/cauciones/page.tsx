'use client';
import { useState, useEffect } from 'react';
import AvailableCapitalIndicator from '@/components/AvailableCapitalIndicator';
import { usePortfolio } from '@/contexts/PortfolioContext';

interface CaucionRate {
  term: number;
  annualRate: number;
  currency: 'ARS' | 'USD';
  provider: string;
  description: string;
}

interface CaucionesData {
  lastUpdated: string;
  rates: CaucionRate[];
}

export default function CaucionesPage() {
  const [caucionesData, setCaucionesData] = useState<CaucionesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaucion, setSelectedCaucion] = useState<CaucionRate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const { portfolioData, refreshPortfolio } = usePortfolio();

  async function fetchCaucionesData() {
    setLoading(true);
    try {
      const caucionesRes = await fetch('/api/cauciones');
      if (!caucionesRes.ok) throw new Error('Failed to fetch cauciones data');
      const data = await caucionesRes.json();
      setCaucionesData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCaucionesData();
  }, []);

  const handleOpenModal = (caucion: CaucionRate) => {
    setSelectedCaucion(caucion);
    setIsModalOpen(true);
    setAmount('');
  };

  const handleCreateCaucion = async () => {
    if (!selectedCaucion || !amount) return;
    
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;

    const body = {
      username,
      amount: parseFloat(amount),
      annualRate: selectedCaucion.annualRate,
      termDays: selectedCaucion.term,
      provider: selectedCaucion.provider,
      currency: selectedCaucion.currency,
    };

    try {
      const res = await fetch('/api/portfolio/caucion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create caución');
      }

      await refreshPortfolio();
      setIsModalOpen(false);
      setSelectedCaucion(null);
      setAmount('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const availableCash = selectedCaucion ? (portfolioData?.cash?.[selectedCaucion.currency] ?? 0) : 0;

  return (
    <>
      {isModalOpen && selectedCaucion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Crear Caución</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedCaucion.description}
                </label>
                <p className="text-sm text-gray-600">
                  TNA: {selectedCaucion.annualRate.toFixed(2)}% | 
                  Plazo: {selectedCaucion.term} días
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto ({selectedCaucion.currency})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingresa el monto"
                  min="0"
                  max={availableCash}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Disponible: {availableCash.toLocaleString()} {selectedCaucion.currency}
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedCaucion(null);
                    setAmount('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCaucion}
                  disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableCash}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Crear Caución
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <AvailableCapitalIndicator assetClass="deposits" currency="ARS" />
            <AvailableCapitalIndicator assetClass="deposits" currency="USD" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">Cauciones Disponibles</h1>
        <p className="text-gray-600">
          Invierte en cauciones (repos) para obtener un rendimiento predecible y de bajo riesgo.
        </p>

        {loading && <p>Cargando opciones de caución...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && caucionesData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {caucionesData.rates.map((caucion) => (
              <div key={`${caucion.term}-${caucion.currency}`} className="bg-white shadow rounded-lg p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{caucion.provider}</h3>
                  <p className="text-sm text-gray-600">{caucion.description}</p>
                  <p className="text-sm text-gray-600">Moneda: {caucion.currency}</p>
                </div>
                <div className="my-4">
                  <p className="text-3xl font-bold text-green-600">{caucion.annualRate.toFixed(2)}%</p>
                  <p className="text-sm text-gray-800">TNA a {caucion.term} días</p>
                </div>
                <button 
                  onClick={() => handleOpenModal(caucion)}
                  className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={(portfolioData?.cash?.[caucion.currency] ?? 0) <= 0}
                >
                  Crear Caución
                </button>
              </div>
            ))}
          </div>
        )}
        
        {caucionesData && (
          <div className="text-xs text-gray-500 text-center">
            Última actualización: {new Date(caucionesData.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </>
  );
} 