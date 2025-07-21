// Client-safe portfolio history utilities
// These functions don't require Node.js APIs and can be used in browser components

export interface DailyPortfolioRecord {
  fecha: string; // YYYY-MM-DD
  total_portfolio_ars: number;
  total_portfolio_usd: number;
  capital_invertido_ars: number;
  capital_invertido_usd: number;
  ganancias_netas_ars: number | null;
  ganancias_netas_usd: number | null;
  efectivo_disponible_ars: number;
  efectivo_disponible_usd: number;
  incompleto?: boolean; // New field to indicate incomplete data
}

/**
 * Gets the latest portfolio snapshot from an array of daily records
 * @param history Array of daily portfolio records
 * @returns The latest record or null if no records exist
 */
export function getLatestPortfolioSnapshot(history: DailyPortfolioRecord[]): DailyPortfolioRecord | null {
  if (!history || history.length === 0) {
    return null;
  }
  
  // Sort by date to ensure we get the latest record
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );
  
  return sortedHistory[sortedHistory.length - 1];
}

/**
 * Normalizes portfolio history records by ensuring ganancias_netas_* values
 * match the calculated values (total_portfolio_* - capital_invertido_*)
 * @param records Array of daily portfolio records to normalize
 * @returns Array of normalized records
 */
export function normalizePortfolioHistory(records: DailyPortfolioRecord[]): DailyPortfolioRecord[] {
  return records.map(record => {
    const calculatedGainsARS = record.total_portfolio_ars - record.capital_invertido_ars;
    const calculatedGainsUSD = record.total_portfolio_usd - record.capital_invertido_usd;
    
    // Check if the stored gains differ from calculated gains
    const gainsARSChanged = record.ganancias_netas_ars !== calculatedGainsARS;
    const gainsUSDChanged = record.ganancias_netas_usd !== calculatedGainsUSD;
    
    if (gainsARSChanged || gainsUSDChanged) {
      return {
        ...record,
        ganancias_netas_ars: calculatedGainsARS,
        ganancias_netas_usd: calculatedGainsUSD,
      };
    }
    
    return record;
  });
} 