'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  calculateMonthlyInvestment,
  projectPortfolioValue,
  projectAlternativeScenarios,
  isFeasibleContribution,
  formatCurrency
} from '@/utils/goalCalculator';

interface GoalFormData {
  targetAmount: number;
  years: number;
  monthlyContribution?: number;
  initialAmount: number;
}

const GoalSimulator = ({ portfolioReturn = 15 }: { portfolioReturn?: number }) => {
  const [formData, setFormData] = useState<GoalFormData>({
    targetAmount: 10000000,
    years: 5,
    monthlyContribution: undefined,
    initialAmount: 0
  });
  
  const [projections, setProjections] = useState<any>(null);
  const [requiredMonthly, setRequiredMonthly] = useState<number | null>(null);
  
  const handleCalculate = () => {
    const { targetAmount, years, monthlyContribution, initialAmount } = formData;
    
    if (monthlyContribution !== undefined) {
      // Project with given monthly contribution
      const mainProjection = projectPortfolioValue(
        initialAmount,
        monthlyContribution,
        years,
        portfolioReturn
      );
      
      const alternatives = projectAlternativeScenarios(
        initialAmount,
        monthlyContribution,
        years
      );
      
      setProjections({
        portfolio: mainProjection,
        ...alternatives
      });
      setRequiredMonthly(null);
      
    } else {
      // Calculate required monthly contribution
      const monthly = calculateMonthlyInvestment(
        targetAmount,
        years,
        portfolioReturn,
        initialAmount
      );
      
      const mainProjection = projectPortfolioValue(
        initialAmount,
        monthly,
        years,
        portfolioReturn
      );
      
      const alternatives = projectAlternativeScenarios(
        initialAmount,
        monthly,
        years
      );
      
      setProjections({
        portfolio: mainProjection,
        ...alternatives
      });
      setRequiredMonthly(monthly);
    }
  };

  const handleExportPDF = () => {
    alert('Función de exportar a PDF próximamente disponible');
  };

  return (
    <div className="space-y-8">
      {/* Input Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Definí tu meta de inversión</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto objetivo final
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plazo en años
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={formData.years}
              onChange={(e) => setFormData({ ...formData, years: Number(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center mt-2">{formData.years} años</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capital inicial (opcional)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                value={formData.initialAmount}
                onChange={(e) => setFormData({ ...formData, initialAmount: Number(e.target.value) })}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aporte mensual (opcional)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                value={formData.monthlyContribution}
                onChange={(e) => setFormData({ ...formData, monthlyContribution: Number(e.target.value) })}
                placeholder="Dejar vacío para calcular"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Rentabilidad estimada: <span className="font-semibold">{portfolioReturn}% anual</span>
          </div>
          <button
            onClick={handleCalculate}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Calcular
          </button>
        </div>
      </div>

      {/* Results */}
      {(projections || requiredMonthly) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Resultados</h2>
          
          {requiredMonthly && (
            <div className="mb-6">
              <div className="text-lg">
                Para alcanzar {formatCurrency(formData.targetAmount)} en {formData.years} años
                necesitarías invertir:
              </div>
              <div className="text-3xl font-bold text-blue-600 mt-2">
                {formatCurrency(requiredMonthly)} por mes
              </div>
              
              {!isFeasibleContribution(requiredMonthly) && (
                <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                  ⚠️ El aporte mensual requerido podría ser demasiado alto. 
                  Considerá ajustar el monto objetivo o extender el plazo.
                </div>
              )}
            </div>
          )}
          
          {projections && (
            <>
              <div className="h-80 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projections.portfolio}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tickFormatter={(date: string) => new Date(date).toLocaleDateString('es-AR', { year: '2-digit', month: 'short' })}
                    />
                    <YAxis 
                      tickFormatter={(value: number) => `$${(value/1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(date: string) => new Date(date).toLocaleDateString('es-AR')}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      name="Portfolio" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      data={projections.fixedDeposit}
                      name="Plazo Fijo" 
                      stroke="#9333ea" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      data={projections.savingsAccount}
                      name="Caja de Ahorro" 
                      stroke="#94a3b8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <span>📄</span> Exportar simulación
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default function GoalsPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Simulador de Metas
      </h1>
      
      <GoalSimulator />
    </div>
  );
} 