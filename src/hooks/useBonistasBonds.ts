import { useState, useEffect } from 'react';
import { Bond } from '@/types/finance';

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

  const fetchBonds = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try API first
      const response = await fetch('/api/bonds');
      
      if (response.ok) {
        const data = await response.json();
        setBonds(data);
        return;
      }
      
      // Fallback to raw API endpoint
      const rawResponse = await fetch('/api/bonds/raw');
      
      if (rawResponse.ok) {
        const rawData = await rawResponse.json();
        setBonds(rawData.bonds || rawData);
        return;
      }
      
      // Final fallback to public JSON file
      const fallbackResponse = await fetch('/data/bonistas_bonds.json');
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        setBonds(fallbackData.bonds || fallbackData);
        return;
      }
      
      throw new Error('Failed to fetch bonds data from all sources');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching bonds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBonds();
  }, []);

  return {
    bonds,
    loading,
    error,
    refetch: fetchBonds,
  };
} 