'use client';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

export type ScoopFilterMode = 'all' | 'suggested';
export type CurrencyFilter = 'all' | 'ARS' | 'USD';

interface ScoopContextType {
  filterMode: ScoopFilterMode;
  setFilterMode: Dispatch<SetStateAction<ScoopFilterMode>>;
  currencyFilter: CurrencyFilter;
  setCurrencyFilter: Dispatch<SetStateAction<CurrencyFilter>>;
}

const ScoopContext = createContext<ScoopContextType | undefined>(undefined);

export function ScoopProvider({ children }: { children: ReactNode }) {
  const [filterMode, setFilterMode] = useState<ScoopFilterMode>('all');
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('all');
  
  return (
    <ScoopContext.Provider value={{ filterMode, setFilterMode, currencyFilter, setCurrencyFilter }}>
      {children}
    </ScoopContext.Provider>
  );
}

export function useScoop() {
  const context = useContext(ScoopContext);
  if (context === undefined) {
    throw new Error('useScoop must be used within a ScoopProvider');
  }
  return context;
} 