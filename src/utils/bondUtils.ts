/**
 * Sanitizes a numeric value, treating undefined, null, or NaN as null
 */
export function sanitizeNumericValue(value: number | null | undefined): number | null {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  return value;
}

/**
 * Formats a numeric value for display, showing "-" for null/undefined/NaN values
 */
export function formatNumericValue(value: number | null | undefined, decimals: number = 2): string {
  const sanitized = sanitizeNumericValue(value);
  if (sanitized === null) {
    return '-';
  }
  return sanitized.toFixed(decimals);
}

/**
 * Formats a percentage value for display
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 2): string {
  const sanitized = sanitizeNumericValue(value);
  if (sanitized === null) {
    return '-';
  }
  return `${sanitized.toFixed(decimals)}%`;
}

/**
 * Formats volume in millions
 */
export function formatVolume(value: number | null | undefined): string {
  const sanitized = sanitizeNumericValue(value);
  if (sanitized === null) {
    return '-';
  }
  return `${sanitized.toFixed(2)}M`;
}

/**
 * Logs warnings for missing key metrics
 */
export function logMissingMetrics(bond: Record<string, unknown>): void {
  const keyMetrics = ['price', 'tir', 'tna', 'duration'];
  const missingMetrics = keyMetrics.filter(metric => {
    const value = bond[metric];
    return value === null || value === undefined || (typeof value === 'number' && isNaN(value));
  });
  
  if (missingMetrics.length > 0) {
    console.warn(`Missing key metrics for bond ${bond.ticker}:`, missingMetrics);
  }
} 