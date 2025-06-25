'use client';
import { usePortfolio } from '@/contexts/PortfolioContext';
import Link from 'next/link';

// Extend InvestorProfile locally to include initialBalanceARS and initialBalanceUSD
interface ProfileWithInitialCash {
  instrumentsUsed?: string[];
  holdingPeriod?: string;
  ageGroup?: string;
  riskAppetite?: string;
  initialBalanceARS?: number;
  initialBalanceUSD?: number;
}

export default function UserProfilePage() {
  const { portfolioData, loading, error } = usePortfolio();
  const profile = portfolioData?.profile as ProfileWithInitialCash | undefined;

  if (loading) return <div className="text-center text-black py-10">Cargando perfil...</div>;
  if (error) return <div className="text-center text-red-500 py-10">Error: {error}</div>;
  if (!profile) return <div className="text-center text-black py-10">No se encontró información de perfil.</div>;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-black mb-4">Mi Perfil de Inversor</h1>
        <div className="space-y-2">
          <div>
            <span className="font-semibold text-black">Instrumentos utilizados:</span>{' '}
            <span className="text-black">{profile.instrumentsUsed?.length ? profile.instrumentsUsed.join(', ') : '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-black">Horizonte de inversión:</span>{' '}
            <span className="text-black">{profile.holdingPeriod || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-black">Edad:</span>{' '}
            <span className="text-black">{profile.ageGroup || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-black">Apetito de riesgo:</span>{' '}
            <span className="text-black">{profile.riskAppetite || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-black">Capital inicial ARS:</span>{' '}
            <span className="text-black">{profile.initialBalanceARS != null ? `$${profile.initialBalanceARS}` : '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-black">Capital inicial USD:</span>{' '}
            <span className="text-black">{profile.initialBalanceUSD != null ? `$${profile.initialBalanceUSD}` : '—'}</span>
          </div>
        </div>
        <div className="mt-6 text-center">
          <Link href="/profile" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-black">
            Editar Perfil
          </Link>
        </div>
      </div>
    </div>
  );
} 