'use client';
import { useEffect, useState } from 'react';
import { Allocation } from '@/utils/portfolioAdvisor';
import { InvestorProfile } from '@/types';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Link from 'next/link';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AllocationDescription: Record<string, { title: string, description: string }> = {
  stocks: {
    title: 'Renta Variable (Acciones)',
    description: 'Invierte en acciones de empresas para obtener un mayor crecimiento a largo plazo. Este componente de tu cartera es el que tiene mayor potencial de rentabilidad, pero también el de mayor riesgo.'
  },
  bonds: {
    title: 'Renta Fija (Bonos)',
    description: 'Invierte en bonos corporativos o gubernamentales para obtener ingresos más estables y predecibles. Ayuda a equilibrar el riesgo de las acciones.'
  },
  deposits: {
    title: 'Depósitos a Plazo / Liquidez',
    description: 'Mantiene una porción de tu cartera en activos de bajo riesgo y alta liquidez, como depósitos a plazo o fondos del mercado monetario, para preservar el capital y tener fondos disponibles.'
  }
};

export default function StartPage() {
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const session = localStorage.getItem('session');
      if (!session) {
        setError("No has iniciado sesión.");
        setLoading(false);
        return;
      }
      const username = JSON.parse(session).username;

      // First, get the full user profile
      try {
        const profileRes = await fetch(`/api/profile?username=${username}`);
        if (!profileRes.ok) throw new Error('Failed to fetch profile');
        const userProfile: InvestorProfile = await profileRes.json();
        setProfile(userProfile);

        // Then, get the recommendation based on that profile
        const recoRes = await fetch('/api/portfolio/recommendation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userProfile),
        });
        if (!recoRes.ok) throw new Error('Failed to fetch recommendation');
        const data: Allocation = await recoRes.json();
        setAllocation(data);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const chartData = {
    labels: ['Asignación Recomendada'],
    datasets: [
      {
        label: 'Acciones',
        data: [allocation?.stocks || 0],
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
      },
      {
        label: 'Bonos',
        data: [allocation?.bonds || 0],
        backgroundColor: 'rgba(79, 70, 229, 0.8)',
      },
      {
        label: 'Depósitos',
        data: [allocation?.deposits || 0],
        backgroundColor: 'rgba(124, 58, 237, 0.8)',
      },
    ],
  };

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    scales: {
      x: {
        stacked: true,
        max: 100,
        ticks: { callback: (value: any) => `${value}%` },
      },
      y: { stacked: true },
    },
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Distribución de Activos Sugerida' },
      tooltip: { callbacks: { label: (context: any) => `${context.dataset.label}: ${context.raw}%` } },
    },
  };

  if (loading) return <div className="text-center text-gray-700 py-10">Generando recomendación...</div>;
  if (error) return <div className="text-center text-red-500 py-10">Error: {error}</div>;
  if (!allocation) return <div className="text-center text-gray-700 py-10">No se pudo generar una recomendación.</div>;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido de nuevo!</h1>
        <p className="mt-2 text-lg text-gray-600">Basado en tu perfil de inversor, aquí tienes una estrategia de inversión sugerida para empezar.</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(allocation).map(([key, value]) => (
          <div key={key} className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900">{AllocationDescription[key].title}</h3>
            <p className="text-3xl font-bold text-blue-600 my-2">{value}%</p>
            <p className="text-sm text-gray-600">{AllocationDescription[key].description}</p>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-8">
        <Link href="/dashboard/scoop" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Ver Oportunidades de Inversión
        </Link>
      </div>

      <div className="text-xs text-gray-500 text-center mt-6">
        Esta es una recomendación generada automáticamente y no debe considerarse como asesoramiento financiero.
      </div>
    </div>
  );
} 