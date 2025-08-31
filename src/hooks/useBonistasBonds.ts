import { useState, useEffect } from 'react';
import { Bond, BonistasResponse } from '@/types/finance';

// Type guard for BonistasResponse
function isBonistasResponse(data: unknown): data is BonistasResponse {
  return typeof data === 'object' && data !== null && 'bonds' in data && Array.isArray((data as BonistasResponse).bonds);
}

interface UseBonistasBondsReturn {
  bonds: Bond[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBonistasBonds(): UseBonistasBondsReturn {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBonds = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    
    try {
      // Try API first
      const response = await fetch('/api/bonds', { signal });
      
      if (response.ok) {
        const data = await response.json();
        const safe = isBonistasResponse(data) ? data.bonds : Array.isArray(data) ? data : [];
        setBonds(safe);
        return;
      }
      
      // Fallback to raw API endpoint
      const rawResponse = await fetch('/api/bonds/raw', { signal });
      
      if (rawResponse.ok) {
        const rawData = await rawResponse.json();
        const safe = isBonistasResponse(rawData) ? rawData.bonds : Array.isArray(rawData) ? rawData : [];
        setBonds(safe);
        return;
      }
      
      // Final fallback to public JSON file
      const fallbackResponse = await fetch('/data/bonistas_bonds.json', { signal });
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const safe = isBonistasResponse(fallbackData) ? fallbackData.bonds : Array.isArray(fallbackData) ? fallbackData : [];
        setBonds(safe);
        return;
      }
      
      throw new Error('Failed to fetch bonds data from all sources');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setBonds([]);
      console.error('Error fetching bonds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchBonds(abortController.signal);
    
    return () => {
      abortController.abort();
    };
  }, []);

  return {
    bonds,
    loading,
    error,
    refetch: () => fetchBonds(),
  };
} 