/**
 * Shared technical indicators utilities
 */

export interface KoncordeIndicator {
  bullish: boolean;
  bearish: boolean;
  neutral: boolean;
  strength: number;
}

/**
 * KONCORDE indicator calculation (placeholder for manual configuration)
 * This is a simple placeholder implementation that can be replaced with actual KONCORDE logic
 */
export function calculateKoncordeIndicator(prices: number[], currentPrice: number): KoncordeIndicator | null {
  if (prices.length < 20) return null;
  
  // Simple placeholder implementation - can be replaced with actual KONCORDE logic
  const recentPrices = prices.slice(-20);
  const avgPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
  
  // Determine trend based on price vs average
  const priceVsAvg = currentPrice / avgPrice;
  const strength = Math.min(100, Math.abs(priceVsAvg - 1) * 100);
  
  return {
    bullish: priceVsAvg > 1.02,
    bearish: priceVsAvg < 0.98,
    neutral: priceVsAvg >= 0.98 && priceVsAvg <= 1.02,
    strength: Math.round(strength)
  };
}
