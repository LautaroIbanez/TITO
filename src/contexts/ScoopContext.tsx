'use client';
import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

export type ScoopFilterMode = 'all' | 'suggested';

interface ScoopContextType {
  filterMode: ScoopFilterMode;
  setFilterMode: Dispatch<SetStateAction<ScoopFilterMode>>;
}

const ScoopContext = createContext<ScoopContextType | undefined>(undefined);

export function ScoopProvider({ children }: { children: ReactNode }) {
  const [filterMode, setFilterMode] = useState<ScoopFilterMode>('all');
  
  return (
    <ScoopContext.Provider value={{ filterMode, setFilterMode }}>
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