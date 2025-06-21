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
  ebitda: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  sector: string | null;
  industry: string | null;
  updatedAt: string;
}

// Utility type for ratio thresholds
export interface RatioThresholds {
  good: number;
  warning: number;
  isHigherGood?: boolean;
}

// Thresholds for coloring the ratios
export const RATIO_THRESHOLDS: Record<keyof Omit<Fundamentals, 'updatedAt' | 'sector' | 'industry'>, RatioThresholds> = {
  peRatio: { good: 15, warning: 25, isHigherGood: false },
  pbRatio: { good: 1.5, warning: 3, isHigherGood: false },
  evToEbitda: { good: 10, warning: 20, isHigherGood: false },
  roe: { good: 0.2, warning: 0.1, isHigherGood: true },
  roa: { good: 0.1, warning: 0.05, isHigherGood: true },
  debtToEquity: { good: 1, warning: 2, isHigherGood: false },
  debtToEbitda: { good: 3, warning: 5, isHigherGood: false },
  netMargin: { good: 0.15, warning: 0.05, isHigherGood: true },
  freeCashFlow: { good: 100000000, warning: 0, isHigherGood: true },
  priceToFCF: { good: 20, warning: 40, isHigherGood: false },
  ebitda: { good: 1000000000, warning: 0, isHigherGood: true },
  revenueGrowth: { good: 0.1, warning: 0, isHigherGood: true },
  epsGrowth: { good: 0.1, warning: 0, isHigherGood: true },
};

// Helper function to get ratio color
export function getRatioColor(ratio: number | null | undefined, metric: keyof Omit<Fundamentals, 'updatedAt' | 'sector' | 'industry'>): string {
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

export interface Technicals {
  rsi: number | null;
  macd: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  ema50: number | null;
  adx: number | null;
  pdi: number | null;
  mdi: number | null;
  updatedAt: string;
} 