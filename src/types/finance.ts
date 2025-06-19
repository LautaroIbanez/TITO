export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Fundamentals {
  peRatio: number | null;
  pbRatio: number | null;
  evToEbitda: number | null;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  debtToEbitda: number | null;
  netMargin: number | null;
  freeCashFlow: number | null;
  priceToFCF: number | null;
  updatedAt: string;
}

// Utility type for ratio thresholds
export interface RatioThresholds {
  good: number;
  warning: number;
}

// Thresholds for coloring the ratios
export const RATIO_THRESHOLDS: Record<keyof Omit<Fundamentals, 'updatedAt'>, RatioThresholds> = {
  peRatio: { good: 15, warning: 25 },
  pbRatio: { good: 1.5, warning: 3 },
  evToEbitda: { good: 10, warning: 15 },
  roe: { good: 15, warning: 10 },
  roa: { good: 5, warning: 3 },
  debtToEquity: { good: 1, warning: 2 },
  debtToEbitda: { good: 3, warning: 4 },
  netMargin: { good: 10, warning: 5 },
  freeCashFlow: { good: 0, warning: 0 }, // Positive is good
  priceToFCF: { good: 15, warning: 25 }
}

// Helper function to get ratio color
export function getRatioColor(ratio: number | null | undefined, metric: keyof Omit<Fundamentals, 'updatedAt'>): string {
  if (ratio == null) return 'text-gray-400';
  
  const thresholds = RATIO_THRESHOLDS[metric];
  
  // Handle metrics where higher is better (ROE, ROA, netMargin)
  if (metric === 'roe' || metric === 'roa' || metric === 'netMargin') {
    if (ratio >= thresholds.good) return 'text-green-600';
    if (ratio >= thresholds.warning) return 'text-orange-500';
    return 'text-red-600';
  }
  
  // Handle freeCashFlow separately (positive is good)
  if (metric === 'freeCashFlow') {
    return ratio > 0 ? 'text-green-600' : 'text-red-600';
  }
  
  // For metrics where lower is better
  if (ratio <= thresholds.good) return 'text-green-600';
  if (ratio <= thresholds.warning) return 'text-orange-500';
  return 'text-red-600';
} 