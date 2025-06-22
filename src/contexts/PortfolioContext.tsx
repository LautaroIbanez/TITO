'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { UserData } from '@/types';

// Extended type to match what the API actually returns
interface PortfolioData extends UserData {
  historicalPrices: Record<string, any[]>;
  fundamentals: Record<string, any>;
  technicals: Record<string, any>;
}

interface PortfolioContextType {
  portfolioData: PortfolioData | null;
  loading: boolean;
  error: string | null;
  portfolioVersion: number;
  refreshPortfolio: () => Promise<void>;
  triggerPortfolioUpdate: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioVersion, setPortfolioVersion] = useState(0);

  const fetchPortfolioData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const session = localStorage.getItem('session');
      if (!session) {
        setLoading(false);
        return;
      }
      
      const sessionData = JSON.parse(session);
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

  const refreshPortfolio = useCallback(async () => {
    await fetchPortfolioData();
    setPortfolioVersion(prev => prev + 1);
  }, [fetchPortfolioData]);

  const triggerPortfolioUpdate = useCallback(() => {
    setPortfolioVersion(prev => prev + 1);
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  return (
    <PortfolioContext.Provider value={{ 
      portfolioData, 
      loading, 
      error, 
      portfolioVersion, 
      refreshPortfolio, 
      triggerPortfolioUpdate 
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