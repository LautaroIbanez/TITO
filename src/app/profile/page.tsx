'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InvestorProfile, KnowledgeLevel, RiskAppetite } from '@/types';

const INSTRUMENTS = [
  'Plazo Fijo',
  'Fondos Comunes de Inversión',
  'Bonos',
  'Acciones',
  'Opciones',
  'Futuros'
];

const KNOWLEDGE_LEVELS: KnowledgeLevel[] = ['Bajo', 'Medio', 'Alto'];
const HOLDING_PERIODS = ['Menos de 1 año', '1 a 5 años', 'Más de 5 años'];
const AGE_GROUPS = ['Menos de 30', '30 a 40', '41 a 50', 'Más de 50'];
const RISK_APPETITES: RiskAppetite[] = ['Conservador', 'Balanceado', 'Agresivo'];

export default function ProfilePage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState<InvestorProfile & { initialBalanceARS?: number; initialBalanceUSD?: number; }>({
    instrumentsUsed: [],
    knowledgeLevels: {},
    holdingPeriod: '',
    ageGroup: '',
    riskAppetite: 'Balanceado',
    investmentAmount: 0,
    initialBalanceARS: 0,
    initialBalanceUSD: 0,
  });

  // Load saved form data from localStorage
  useEffect(() => {
    const savedForm = localStorage.getItem('profileForm');
    if (savedForm) {
      setFormData(JSON.parse(savedForm));
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('profileForm', JSON.stringify(formData));
  }, [formData]);

  const handleInstrumentChange = (instrument: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      instrumentsUsed: checked
        ? [...prev.instrumentsUsed, instrument]
        : prev.instrumentsUsed.filter(i => i !== instrument),
      knowledgeLevels: checked
        ? { ...prev.knowledgeLevels, [instrument]: 'Bajo' }
        : Object.fromEntries(
            Object.entries(prev.knowledgeLevels).filter(([key]) => key !== instrument)
          )
    }));
  };

  const handleNext = () => {
    if (step === 1 && formData.instrumentsUsed.length === 0) {
      setError('Por favor, selecciona al menos un instrumento para continuar.');
      return;
    }
    setError('');
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setStep(s => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (formData.instrumentsUsed.length === 0) {
      setError('Por favor, selecciona al menos un instrumento de inversión.');
      setIsLoading(false);
      return;
    }
    
    const totalInvestment = (formData.initialBalanceARS || 0) + (formData.initialBalanceUSD || 0);
    if (totalInvestment <= 0) {
      setError('Por favor, ingresa un monto de inversión válido en ARS o USD.');
      setIsLoading(false);
      return;
    }

    // Set the total investment amount for strategy calculations
    const finalFormData = { ...formData, investmentAmount: totalInvestment };

    try {
      const sessionData = localStorage.getItem('session');
      if (!sessionData) {
        router.push('/login');
        return;
      }

      const { username } = JSON.parse(sessionData);

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          profile: finalFormData
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar el perfil');
      }

      // Add firstTime flag to session
      const updatedSession = { ...JSON.parse(sessionData), firstTime: true };
      localStorage.setItem('session', JSON.stringify(updatedSession));

      // Clear saved form data
      localStorage.removeItem('profileForm');
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Completa tu Perfil de Inversor
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Step 1: Investment Experience */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold text-gray-800">
                  Paso 1: Experiencia de Inversión
                </h2>
                <p className="text-sm text-gray-600">
                  Selecciona los instrumentos financieros que has utilizado.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {INSTRUMENTS.map(instrument => (
                    <div key={instrument} className="flex items-start">
                      <input
                        type="checkbox"
                        id={`instrument-${instrument}`}
                        checked={formData.instrumentsUsed.includes(instrument)}
                        onChange={(e) => handleInstrumentChange(instrument, e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 rounded"
                      />
                      <label
                        htmlFor={`instrument-${instrument}`}
                        className="ml-2 text-sm text-gray-700"
                      >
                        {instrument}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Knowledge Level */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold text-gray-800">
                  Paso 2: Nivel de Conocimiento
                </h2>
                <p className="text-sm text-gray-600">
                  Indica tu nivel de conocimiento para cada instrumento seleccionado.
                </p>
                <div className="grid gap-4">
                  {formData.instrumentsUsed.map(instrument => (
                    <div key={instrument} className="flex items-center gap-4">
                      <span className="w-32 text-sm font-medium text-gray-700">{instrument}:</span>
                      <div className="relative flex-1">
                        <select
                          value={formData.knowledgeLevels[instrument] || 'Bajo'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            knowledgeLevels: {
                              ...prev.knowledgeLevels,
                              [instrument]: e.target.value as KnowledgeLevel
                            }
                          }))}
                          className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white appearance-none cursor-pointer hover:border-gray-400 text-gray-900"
                        >
                          {KNOWLEDGE_LEVELS.map(level => (
                            <option key={level} value={level} className="text-gray-900">
                              {level}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Investment Preferences */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-xl font-semibold text-gray-800">
                  Paso 3: Preferencias y Metas
                </h2>
                
                {/* Holding Period */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Horizonte de Inversión
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {HOLDING_PERIODS.map(period => (
                      <div key={period} className="flex items-center">
                        <input
                          type="radio"
                          id={`period-${period}`}
                          name="holdingPeriod"
                          value={period}
                          checked={formData.holdingPeriod === period}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            holdingPeriod: e.target.value
                          }))}
                          className="h-4 w-4 text-blue-600"
                        />
                        <label
                          htmlFor={`period-${period}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {period}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Age Group */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Rango de Edad
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {AGE_GROUPS.map(age => (
                      <div key={age} className="flex items-center">
                        <input
                          type="radio"
                          id={`age-${age}`}
                          name="ageGroup"
                          value={age}
                          checked={formData.ageGroup === age}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            ageGroup: e.target.value
                          }))}
                          className="h-4 w-4 text-blue-600"
                        />
                        <label
                          htmlFor={`age-${age}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {age}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Appetite */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Apetito de Riesgo
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {RISK_APPETITES.map(appetite => (
                      <div key={appetite} className="flex items-center">
                        <input
                          type="radio"
                          id={`risk-${appetite}`}
                          name="riskAppetite"
                          value={appetite}
                          checked={formData.riskAppetite === appetite}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            riskAppetite: e.target.value as RiskAppetite
                          }))}
                          className="h-4 w-4 text-blue-600"
                        />
                        <label
                          htmlFor={`risk-${appetite}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {appetite}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 4: Investment Amount */}
            {step === 4 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold text-gray-800">
                  Paso 4: Capital Inicial
                </h2>
                <p className="text-sm text-gray-600">
                  Ingresa los saldos iniciales con los que operarás. Puedes empezar con uno o ambos.
                </p>
                <div>
                  <label htmlFor="initialBalanceARS" className="block text-sm font-medium text-gray-700">
                    Saldo Inicial en Pesos (ARS)
                  </label>
                  <input
                    type="number"
                    id="initialBalanceARS"
                    value={formData.initialBalanceARS || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, initialBalanceARS: Number(e.target.value) }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                    placeholder="Ej: 50000"
                  />
                </div>
                <div>
                  <label htmlFor="initialBalanceUSD" className="block text-sm font-medium text-gray-700">
                    Saldo Inicial en Dólares (USD)
                  </label>
                  <input
                    type="number"
                    id="initialBalanceUSD"
                    value={formData.initialBalanceUSD || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, initialBalanceUSD: Number(e.target.value) }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                    placeholder="Ej: 1000"
                  />
                </div>
              </div>
            )}
            
            {error && <div className="text-red-600 text-sm mt-2 text-center">{error}</div>}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  Anterior
                </button>
              ) : (
                <div /> // Placeholder for alignment
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
                >
                  {isLoading ? 'Guardando...' : 'Guardar Perfil'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 