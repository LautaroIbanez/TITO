/**
 * Generates a hash of price data to detect changes in historical prices.
 * This can be used in useEffect dependency arrays to trigger recalculation
 * when new price data is loaded even without new transactions.
 */

export function generatePriceDataHash(historicalPrices: Record<string, any[]>): string {
  if (!historicalPrices || Object.keys(historicalPrices).length === 0) {
    return 'empty';
  }

  // Create a simplified representation of the price data
  const priceSummary: Record<string, { count: number; lastPrice?: number; lastDate?: string }> = {};
  
  for (const [symbol, prices] of Object.entries(historicalPrices)) {
    if (prices && prices.length > 0) {
      const lastPrice = prices[prices.length - 1];
      priceSummary[symbol] = {
        count: prices.length,
        lastPrice: lastPrice?.close,
        lastDate: lastPrice?.date
      };
    }
  }

  // Convert to string and create a simple hash
  const summaryString = JSON.stringify(priceSummary);
  let hash = 0;
  for (let i = 0; i < summaryString.length; i++) {
    const char = summaryString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString();
}

/**
 * Generates a hash that combines portfolio version and price data hash.
 * This ensures recalculation when either portfolio data or price data changes.
 */
export function generatePortfolioHash(
  portfolioVersion: number, 
  historicalPrices: Record<string, any[]>
): string {
  const priceHash = generatePriceDataHash(historicalPrices);
  return `${portfolioVersion}-${priceHash}`;
} 