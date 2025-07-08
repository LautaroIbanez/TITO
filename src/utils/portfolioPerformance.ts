import { PortfolioValueHistory } from './calculatePortfolioValue';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrBefore);

export interface PerformanceMetrics {
  monthlyReturnARS: number;
  monthlyReturnUSD: number;
  annualReturnARS: number;
  annualReturnUSD: number;
  monthlyReturnARSReal: number;
  monthlyReturnUSDReal: number;
  annualReturnARSReal: number;
  annualReturnUSDReal: number;
}

export interface InflationData {
  argentina: {
    monthly: number;
    annual: number;
  };
  usa: {
    monthly: number;
    annual: number;
  };
}

/**
 * Calculates portfolio performance metrics from value history
 */
export function calculatePortfolioPerformance(
  valueHistory: PortfolioValueHistory[],
  inflationData?: InflationData
): PerformanceMetrics {
  if (!valueHistory || valueHistory.length < 2) {
    return {
      monthlyReturnARS: 0,
      monthlyReturnUSD: 0,
      annualReturnARS: 0,
      annualReturnUSD: 0,
      monthlyReturnARSReal: 0,
      monthlyReturnUSDReal: 0,
      annualReturnARSReal: 0,
      annualReturnUSDReal: 0,
    };
  }

  // Sort by date to ensure chronological order
  const sortedHistory = [...valueHistory].sort((a, b) => 
    dayjs(a.date).diff(dayjs(b.date))
  );

  const current = sortedHistory[sortedHistory.length - 1];
  const referenceDate = dayjs(current.date);
  const oneMonthAgo = referenceDate.subtract(1, 'month');
  const oneYearAgo = referenceDate.subtract(1, 'year');

  // Find values from 1 month ago - use reverse search to get the last entry on or before the date
  let monthlyARS = sortedHistory.slice().reverse().find(h => dayjs(h.date).isSameOrBefore(oneMonthAgo, 'day'));
  let monthlyUSD = sortedHistory.slice().reverse().find(h => dayjs(h.date).isSameOrBefore(oneMonthAgo, 'day'));
  if (!monthlyARS) {
    // Fallback: earliest record within the range, or first record overall
    monthlyARS = sortedHistory.find(h => dayjs(h.date).isAfter(oneMonthAgo, 'day')) || sortedHistory[0];
  }
  if (!monthlyUSD) {
    monthlyUSD = sortedHistory.find(h => dayjs(h.date).isAfter(oneMonthAgo, 'day')) || sortedHistory[0];
  }

  let yearlyARS = sortedHistory.slice().reverse().find(h => dayjs(h.date).isSameOrBefore(oneYearAgo, 'day'));
  let yearlyUSD = sortedHistory.slice().reverse().find(h => dayjs(h.date).isSameOrBefore(oneYearAgo, 'day'));
  if (!yearlyARS) {
    yearlyARS = sortedHistory.find(h => dayjs(h.date).isAfter(oneYearAgo, 'day')) || sortedHistory[0];
  }
  if (!yearlyUSD) {
    yearlyUSD = sortedHistory.find(h => dayjs(h.date).isAfter(oneYearAgo, 'day')) || sortedHistory[0];
  }

  // Calculate monthly returns with zero checks
  const monthlyReturnARS = monthlyARS && monthlyARS.valueARS !== 0 ? 
    ((current.valueARS - monthlyARS.valueARS) / monthlyARS.valueARS) * 100 : 0;
  const monthlyReturnUSD = monthlyUSD && monthlyUSD.valueUSD !== 0 ? 
    ((current.valueUSD - monthlyUSD.valueUSD) / monthlyUSD.valueUSD) * 100 : 0;

  // Calculate annual returns with zero checks
  const annualReturnARS = yearlyARS && yearlyARS.valueARS !== 0 ? 
    ((current.valueARS - yearlyARS.valueARS) / yearlyARS.valueARS) * 100 : 0;
  const annualReturnUSD = yearlyUSD && yearlyUSD.valueUSD !== 0 ? 
    ((current.valueUSD - yearlyUSD.valueUSD) / yearlyUSD.valueUSD) * 100 : 0;

  // Calculate real returns (adjusted for inflation)
  let monthlyReturnARSReal = monthlyReturnARS;
  let monthlyReturnUSDReal = monthlyReturnUSD;
  let annualReturnARSReal = annualReturnARS;
  let annualReturnUSDReal = annualReturnUSD;

  if (inflationData) {
    // Real return = (1 + nominal/100) / (1 + inflation/100) - 1
    monthlyReturnARSReal = ((1 + monthlyReturnARS/100) / (1 + inflationData.argentina.monthly/100) - 1) * 100;
    monthlyReturnUSDReal = ((1 + monthlyReturnUSD/100) / (1 + inflationData.usa.monthly/100) - 1) * 100;
    annualReturnARSReal = ((1 + annualReturnARS/100) / (1 + inflationData.argentina.annual/100) - 1) * 100;
    annualReturnUSDReal = ((1 + annualReturnUSD/100) / (1 + inflationData.usa.annual/100) - 1) * 100;
  }

  return {
    monthlyReturnARS,
    monthlyReturnUSD,
    annualReturnARS,
    annualReturnUSD,
    monthlyReturnARSReal,
    monthlyReturnUSDReal,
    annualReturnARSReal,
    annualReturnUSDReal,
  };
}

/**
 * Fetches inflation data from the API
 */
export async function fetchInflationData(): Promise<InflationData | null> {
  try {
    const response = await fetch('/api/inflation');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch inflation data:', error);
  }
  return null;
}

/**
 * Formats performance percentage with color coding
 */
export function formatPerformance(percentage: number, isReal = false): {
  formatted: string;
  color: string;
  label: string;
} {
  const formatted = `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  
  let color = 'text-gray-600';
  if (percentage > 0) {
    color = 'text-green-600';
  } else if (percentage < 0) {
    color = 'text-red-600';
  }

  const label = isReal ? 'Real' : 'Nominal';
  
  return { formatted, color, label };
} 