'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InvestorProfile, KnowledgeLevel } from '@/types';

const INSTRUMENTS = [
  'Fixed Deposit',
  'Mutual Funds',
  'Bonds',
  'Stocks',
  'Options',
  'Futures'
];

const KNOWLEDGE_LEVELS: KnowledgeLevel[] = ['Low', 'Medium', 'High'];
const HOLDING_PERIODS = ['<1 year', '1-5 years', '>5 years'];
const AGE_GROUPS = ['<30', '30-40', '41-50', '>50'];
const RISK_APPETITES = ['Conservative', 'Balanced', 'Aggressive'];

export default function ProfilePage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<InvestorProfile>({
    instrumentsUsed: [],
    knowledgeLevels: {},
    holdingPeriod: '',
    ageGroup: '',
    riskAppetite: 'Balanced',
    investmentAmount: 0
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
        ? { ...prev.knowledgeLevels, [instrument]: 'Low' }
        : Object.fromEntries(
            Object.entries(prev.knowledgeLevels).filter(([key]) => key !== instrument)
          )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (formData.instrumentsUsed.length === 0) {
      setError('Please select at least one investment instrument');
      setIsLoading(false);
      return;
    }

    if (formData.investmentAmount <= 0) {
      setError('Please enter a valid investment amount');
      setIsLoading(false);
      return;
    }

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
          profile: formData
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

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
            Complete Your Investment Profile
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Investment Experience Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">
                1. Investment Experience
              </h2>
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

            {/* Knowledge Level Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">
                2. Knowledge Level
              </h2>
              <div className="grid gap-4">
                {formData.instrumentsUsed.map(instrument => (
                  <div key={instrument} className="flex items-center gap-4">
                    <span className="w-32 text-sm font-medium text-gray-700">{instrument}:</span>
                    <div className="relative flex-1">
                      <select
                        value={formData.knowledgeLevels[instrument]}
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

            {/* Investment Preferences Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">
                3. Investment Preferences
              </h2>
              
              {/* Holding Period */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Max Holding Period
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
                  Age Group
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
                  Risk Appetite
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {RISK_APPETITES.map(risk => (
                    <div key={risk} className="flex items-center">
                      <input
                        type="radio"
                        id={`risk-${risk}`}
                        name="riskAppetite"
                        value={risk}
                        checked={formData.riskAppetite === risk}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          riskAppetite: e.target.value as typeof prev.riskAppetite
                        }))}
                        className="h-4 w-4 text-blue-600"
                      />
                      <label
                        htmlFor={`risk-${risk}`}
                        className="ml-2 text-sm text-gray-700"
                      >
                        {risk}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investment Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Investment Amount ($)
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.investmentAmount}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      investmentAmount: Number(e.target.value)
                    }))}
                    className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                    placeholder="0.00"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">USD</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm mt-2">
                {error}
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Complete Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 