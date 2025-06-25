'use client';
import { usePortfolio } from '@/contexts/PortfolioContext';
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

const investmentLinks: Record<string, string> = {
  stocks: '/dashboard/scoop',
  bonds: '/dashboard/bonds',
  deposits: '/dashboard/deposits',
  cash: '/dashboard/portfolio',
};

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
  },
  cash: {
    title: 'Efectivo',
    description: 'Mantiene una pequeña porción en efectivo para oportunidades de inversión emergentes, emergencias o para aprovechar caídas del mercado.'
  }
};

export default function StartPage() {
  const { strategy, strategyLoading, strategyError } = usePortfolio();

  const chartData = {
    labels: ['Asignación Recomendada'],
    datasets: [
      {
        label: 'Acciones',
        data: [strategy?.targetAllocation.stocks || 0],
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
      },
      {
        label: 'Bonos',
        data: [strategy?.targetAllocation.bonds || 0],
        backgroundColor: 'rgba(79, 70, 229, 0.8)',
      },
      {
        label: 'Depósitos',
        data: [strategy?.targetAllocation.deposits || 0],
        backgroundColor: 'rgba(124, 58, 237, 0.8)',
      },
      {
        label: 'Efectivo',
        data: [strategy?.targetAllocation.cash || 0],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
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

  if (strategyLoading) return <div className="text-center text-gray-700 py-10">Generando estrategia...</div>;
  if (strategyError) return <div className="text-center text-red-500 py-10">Error: {strategyError}</div>;
  if (!strategy) return <div className="text-center text-gray-700 py-10">No se pudo generar una estrategia.</div>;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido de nuevo!</h1>
        <p className="mt-2 text-lg text-gray-600">Basado en tu perfil de inversor, aquí tienes una estrategia de inversión sugerida para empezar.</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(strategy.targetAllocation).map(([key, value]) => (
          <div key={key} className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900">{AllocationDescription[key].title}</h3>
            <p className="text-3xl font-bold text-blue-600 my-2">{value}%</p>
            <p className="text-sm text-gray-600">{AllocationDescription[key].description}</p>
            <Link
              href={investmentLinks[key]}
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Invertir ahora
            </Link>
          </div>
        ))}
      </div>

      {strategy.recommendations && strategy.recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recomendaciones de Estrategia</h2>
          <div className="space-y-3">
            {strategy.recommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  rec.priority === 'high' ? 'bg-red-500' : 
                  rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {rec.action === 'increase' && 'Aumentar'}
                    {rec.action === 'decrease' && 'Reducir'}
                    {rec.action === 'rotate' && 'Rotar'}
                    {' '}
                    {rec.assetClass === 'stocks' && 'exposición a acciones'}
                    {rec.assetClass === 'bonds' && 'exposición a bonos'}
                    {rec.assetClass === 'cash' && 'efectivo disponible'}
                    {rec.symbol && ` de ${rec.symbol}`}
                    {rec.targetSymbol && ` a ${rec.targetSymbol}`}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{rec.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
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