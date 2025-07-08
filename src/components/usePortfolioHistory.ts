import { useEffect, useState } from 'react';
import type { DailyPortfolioRecord } from '@/utils/portfolioHistory';

export function usePortfolioHistory(username?: string) {
  const [history, setHistory] = useState<DailyPortfolioRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setHistory(null);
      setError('No username provided');
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/portfolio/history?username=${username}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Error fetching history');
        }
        return res.json();
      })
      .then((data) => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setHistory(null);
        setLoading(false);
      });
  }, [username]);

  return { history, loading, error };
} 