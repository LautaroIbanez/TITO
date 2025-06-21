'use client';
import { useState, useEffect } from 'react';
import { FixedTermDeposit } from '@/types/finance';
import TradeModal from '@/components/TradeModal';

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<FixedTermDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<FixedTermDeposit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableCash, setAvailableCash] = useState(0);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const session = localStorage.getItem('session');
      if (!session) throw new Error('User not logged in');
      const username = JSON.parse(session).username;

      const [depositsRes, portfolioRes] = await Promise.all([
        fetch('/api/deposits'),
        fetch(`/api/portfolio/data?username=${username}`)
      ]);

      if (!depositsRes.ok) throw new Error('Failed to fetch deposits data');
      const depositsData = await depositsRes.json();
      setDeposits(depositsData);

      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        setAvailableCash(portfolioData.availableCash ?? 0);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleOpenModal = (deposit: FixedTermDeposit) => {
    setSelectedDeposit(deposit);
    setIsModalOpen(true);
  };

  const handleCreateDeposit = async (amount: number) => {
    if (!selectedDeposit) return;
    
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;

    const body = {
      username,
      assetType: 'FixedTermDeposit',
      provider: selectedDeposit.provider,
      amount,
      annualRate: selectedDeposit.annualRate,
      termDays: selectedDeposit.termDays,
    };

    try {
      const res = await fetch('/api/portfolio/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create fixed-term deposit');
      }

      await fetchInitialData(); // Refresh data
      setIsModalOpen(false);
      setSelectedDeposit(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      {isModalOpen && selectedDeposit && (
        <TradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateDeposit}
          tradeType="Invest"
          assetName={`${selectedDeposit.provider} ${selectedDeposit.termDays} días`}
          availableCash={availableCash}
          isAmountBased={true}
        />
      )}
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Plazos Fijos Disponibles</h1>
        <p className="text-gray-600">
          Invierte en depósitos a plazo fijo para obtener un rendimiento predecible y de bajo riesgo.
        </p>

        {loading && <p>Cargando opciones de plazo fijo...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deposits.map((deposit) => (
              <div key={deposit.id} className="bg-white shadow rounded-lg p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{deposit.provider}</h3>
                  <p className="text-sm text-gray-600">Moneda: {deposit.currency}</p>
                </div>
                <div className="my-4">
                  <p className="text-3xl font-bold text-green-600">{deposit.annualRate.toFixed(2)}%</p>
                  <p className="text-sm text-gray-800">TNA a {deposit.termDays} días</p>
                </div>
                <button 
                  onClick={() => handleOpenModal(deposit)}
                  className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:text-gray-400"
                  disabled={availableCash <= 0}
                >
                  Invertir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
} 