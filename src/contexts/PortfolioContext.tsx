'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { UserData, InvestmentStrategy } from '@/types';
import { getSessionData } from '@/utils/sessionStorage';

// Extended type to match what the API actually returns
interface PortfolioData extends UserData {
  historicalPrices: Record<string, any[]>;
  fundamentals: Record<string, any>;
  technicals: Record<string, any>;
}

interface PortfolioContextType {
  portfolioData: PortfolioData | null;
  strategy: InvestmentStrategy | null;
  loading: boolean;
  error: string | null;
  portfolioVersion: number;
  refreshPortfolio: () => Promise<void>;
  refreshStrategy: () => Promise<void>;
  triggerPortfolioUpdate: () => void;
  strategyLoading: boolean;
  strategyError: string | null;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [strategy, setStrategy] = useState<InvestmentStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioVersion, setPortfolioVersion] = useState(0);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);

  const fetchPortfolioData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const sessionData = getSessionData();
      if (!sessionData) {
        setLoading(false);
        return;
      }
      
      const username = sessionData.username;
      
      const response = await fetch(`/api/portfolio/data?username=${username}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio data');
      }
      
      const data = await response.json();
      setPortfolioData(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching portfolio data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStrategy = useCallback(async () => {
    setStrategyLoading(true);
    setStrategyError(null);
    try {
      const sessionData = getSessionData();
      if (!sessionData) {
        setStrategyLoading(false);
        return;
      }
      
      const username = sessionData.username;
      
      const response = await fetch(`/api/strategy?username=${username}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch strategy');
      }
      const strategyData = await response.json();
      setStrategy(strategyData);
    } catch (err: any) {
      setStrategyError(err.message || 'Error fetching strategy');
    } finally {
      setStrategyLoading(false);
    }
  }, []);

  const refreshPortfolio = useCallback(async () => {
    await fetchPortfolioData();
    setPortfolioVersion(prev => prev + 1);
  }, [fetchPortfolioData]);

  const refreshStrategy = useCallback(async () => {
    await fetchStrategy();
  }, [fetchStrategy]);

  const triggerPortfolioUpdate = useCallback(() => {
    setPortfolioVersion(prev => prev + 1);
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchPortfolioData();
    fetchStrategy();
  }, [fetchPortfolioData, fetchStrategy]);

  return (
    <PortfolioContext.Provider value={{ 
      portfolioData, 
      strategy,
      loading, 
      error, 
      portfolioVersion, 
      refreshPortfolio, 
      refreshStrategy,
      triggerPortfolioUpdate,
      strategyLoading,
      strategyError
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
} 