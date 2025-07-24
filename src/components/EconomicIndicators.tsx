'use client';
import { useState, useEffect } from 'react';
import { EconomicIndicators } from '@/types/indicators';
import { fetchEconomicIndicators, getMockEconomicIndicators } from '@/services/indicators';
import LineChart from './LineChart';
import BarChart from './BarChart';
import IndicatorCard from './IndicatorCard';

export default function EconomicIndicators() {
  const [indicators, setIndicators] = useState<EconomicIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('inflation');

  useEffect(() => {
    async function loadIndicators() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch data from API (with mock fallback for development)
        const response = await fetch('/api/indicators?mock=true');
        if (!response.ok) {
          throw new Error('Failed to fetch indicators');
        }
        
        const data = await response.json();
        setIndicators(data);
      } catch (err) {
        console.error('Error loading economic indicators:', err);
        setError('Error al cargar los indicadores económicos');
      } finally {
        setLoading(false);
      }
    }

    loadIndicators();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center text-gray-500">Cargando indicadores económicos...</div>
      </div>
    );
  }

  if (error || !indicators) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center text-red-500">
          {error || 'No se pudieron cargar los indicadores económicos'}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'inflation', label: '📈 Inflación', color: 'red' },
    { id: 'dollars', label: '💸 Dólar', color: 'green' },
    { id: 'fixedTerm', label: '🏦 Plazo Fijo', color: 'blue' },
    { id: 'mutualFunds', label: '💼 Fondos Comunes', color: 'purple' },
    { id: 'otherFunds', label: '🟣 Otros Fondos', color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Indicadores Económicos Argentina</h2>
        <p className="text-gray-600">
          Última actualización: {new Date(indicators.lastUpdated).toLocaleString('es-AR')}
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Inflación */}
        {activeTab === 'inflation' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <IndicatorCard
                title="Inflación Mensual"
                value={`${indicators.inflation.lastValue}%`}
                subtitle="Último valor disponible"
                variation={indicators.inflation.variation}
                variationLabel="vs mes anterior"
                color="red"
              />
              <IndicatorCard
                title="Valor Anterior"
                value={`${indicators.inflation.previousValue}%`}
                subtitle="Mes anterior"
                color="gray"
              />
              <IndicatorCard
                title="Variación"
                value={`${indicators.inflation.variation >= 0 ? '+' : ''}${indicators.inflation.variation}%`}
                subtitle="Cambio mensual"
                color={indicators.inflation.variation >= 0 ? 'red' : 'green'}
              />
            </div>
            
            <LineChart
              data={indicators.inflation.data}
              title="Inflación Mensual - Últimos 12 meses"
              xLabel="Fecha"
              yLabel="Inflación (%)"
              color="#EF4444"
              height={400}
            />
          </div>
        )}

        {/* Dólares */}
        {activeTab === 'dollars' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(indicators.dollars.lastValues).map(([type, data]) => (
                <IndicatorCard
                  key={type}
                  title={`Dólar ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                  value={`$${data.venta.toLocaleString('es-AR')}`}
                  subtitle={`Compra: $${data.compra.toLocaleString('es-AR')}`}
                  variation={data.variation}
                  variationLabel="variación"
                  color="green"
                />
              ))}
            </div>
            
            {indicators.dollars.data.length > 0 && (
              <LineChart
                data={indicators.dollars.data.map(item => ({
                  fecha: item.fecha,
                  valor: item.venta
                }))}
                title="Cotización del Dólar - Últimos 30 días"
                xLabel="Fecha"
                yLabel="Precio (ARS)"
                color="#10B981"
                height={400}
              />
            )}
          </div>
        )}

        {/* Plazo Fijo */}
        {activeTab === 'fixedTerm' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <IndicatorCard
                title="Mejor TNA Clientes"
                value={`${indicators.fixedTerm.top10[0]?.tnaClientes * 100}%`}
                subtitle={indicators.fixedTerm.top10[0]?.entidad}
                color="blue"
              />
              <IndicatorCard
                title="Promedio TNA"
                value={`${(indicators.fixedTerm.data.reduce((sum, item) => sum + item.tnaClientes, 0) / indicators.fixedTerm.data.length) * 100}%`}
                subtitle="Promedio de todos los bancos"
                color="blue"
              />
              <IndicatorCard
                title="Cantidad de Bancos"
                value={indicators.fixedTerm.data.length}
                subtitle="Bancos analizados"
                color="gray"
              />
            </div>
            
            <BarChart
              data={indicators.fixedTerm.top10.map(item => ({
                label: item.entidad.replace('BANCO ', '').replace(' S.A.', '').replace(' S.A.U.', ''),
                value: item.tnaClientes * 100
              }))}
              title="Top 10 Bancos por TNA (Clientes)"
              xLabel="TNA (%)"
              yLabel="Banco"
              color="#3B82F6"
              height={500}
            />
          </div>
        )}

        {/* Fondos Comunes */}
        {activeTab === 'mutualFunds' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <IndicatorCard
                title="Money Market"
                value={indicators.mutualFunds.moneyMarket.length}
                subtitle="fondos disponibles"
                color="purple"
              />
              <IndicatorCard
                title="Renta Fija"
                value={indicators.mutualFunds.rentaFija.length}
                subtitle="fondos disponibles"
                color="purple"
              />
              <IndicatorCard
                title="Renta Variable"
                value={indicators.mutualFunds.rentaVariable.length}
                subtitle="fondos disponibles"
                color="purple"
              />
              <IndicatorCard
                title="Renta Mixta"
                value={indicators.mutualFunds.rentaMixta.length}
                subtitle="fondos disponibles"
                color="purple"
              />
            </div>

            {/* Fondos por categoría */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(indicators.mutualFunds).map(([category, funds]) => (
                <div key={category} className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    {category === 'moneyMarket' ? 'Money Market' :
                     category === 'rentaFija' ? 'Renta Fija' :
                     category === 'rentaVariable' ? 'Renta Variable' : 'Renta Mixta'}
                  </h3>
                  
                  <div className="space-y-3">
                    {funds.slice(0, 5).map((fund, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{fund.fondo}</p>
                          <p className="text-sm text-gray-600">TNA: {fund.tna.toFixed(2)}%</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{fund.rendimiento_mensual.toFixed(2)}%</p>
                          <p className="text-sm text-gray-600">Rend. mensual</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Otros Fondos */}
        {activeTab === 'otherFunds' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <IndicatorCard
                title="Mejor TNA"
                value={`${indicators.otherFunds.top10[0]?.tna}%`}
                subtitle={indicators.otherFunds.top10[0]?.fondo}
                color="purple"
              />
              <IndicatorCard
                title="Promedio TNA"
                value={`${(indicators.otherFunds.data.reduce((sum, item) => sum + item.tna, 0) / indicators.otherFunds.data.length).toFixed(2)}%`}
                subtitle="Promedio de todos los fondos"
                color="purple"
              />
              <IndicatorCard
                title="Total de Fondos"
                value={indicators.otherFunds.data.length}
                subtitle="fondos analizados"
                color="gray"
              />
            </div>
            
            <BarChart
              data={indicators.otherFunds.top10.map(item => ({
                label: item.fondo,
                value: item.tna
              }))}
              title="Top 10 Otros Fondos por TNA"
              xLabel="TNA (%)"
              yLabel="Fondo"
              color="#8B5CF6"
              height={500}
            />
          </div>
        )}
      </div>
    </div>
  );
} 