/**
 * Utility functions for handling ticker symbols and their variations
 */

/**
 * Removes suffixes like .BA, .AR from ticker symbols to get the base ticker
 * @param symbol - The ticker symbol (e.g., 'AAPL.BA', 'GGAL.AR', 'AAPL')
 * @returns The base ticker without suffixes (e.g., 'AAPL', 'GGAL', 'AAPL')
 */
export function getBaseTicker(symbol: string): string {
  if (!symbol) return '';
  
  // Remove known market suffixes only (not class identifiers like .B, .A)
  const baseTicker = symbol.replace(/\.(BA|AR|TO)$/i, '');
  
  return baseTicker;
}

/**
 * Determines the currency of a ticker symbol based on its suffix
 * @param symbol - The ticker symbol (e.g., 'AAPL.BA', 'AAPL', 'GGAL.AR')
 * @returns 'ARS' for .BA/.AR suffixes, 'USD' for others
 */
export function getTickerCurrency(symbol: string): 'USD' | 'ARS' {
  if (!symbol) return 'USD';
  
  // Check for Argentine market suffixes
  if (symbol.match(/\.(BA|AR)$/i)) {
    return 'ARS';
  }
  
  return 'USD';
}

/**
 * Determines the market for a ticker symbol based on its suffix
 * @param symbol - The ticker symbol (e.g., 'AAPL.BA', 'AAPL', 'GGAL.AR')
 * @returns 'BCBA' for .BA/.AR suffixes, 'NASDAQ' for others
 */
export function getTickerMarket(symbol: string): 'NASDAQ' | 'BCBA' {
  if (!symbol) return 'NASDAQ';
  
  // Check for Argentine market suffixes
  if (symbol.match(/\.(BA|AR)$/i)) {
    return 'BCBA';
  }
  
  return 'NASDAQ';
}

/**
 * Gets the display name for a ticker (removes suffixes for display)
 * @param symbol - The ticker symbol (e.g., 'AAPL.BA', 'AAPL')
 * @returns The display name (e.g., 'AAPL', 'AAPL')
 */
export function getTickerDisplayName(symbol: string): string {
  return getBaseTicker(symbol);
}

/**
 * Checks if two tickers represent the same underlying asset
 * @param ticker1 - First ticker symbol
 * @param ticker2 - Second ticker symbol
 * @returns true if they have the same base ticker
 */
export function isSameAsset(ticker1: string, ticker2: string): boolean {
  return getBaseTicker(ticker1) === getBaseTicker(ticker2);
}

/**
 * Returns a hint suggesting to try the BCBA version of a symbol if it lacks a .BA or .AR suffix
 * @param symbol - The ticker symbol (e.g., 'AAPL', 'GGAL')
 * @returns A hint string or empty string if symbol already has BCBA suffix
 */
export function getBcbaHint(symbol: string): string {
  if (!symbol) return '';
  
  // Check if symbol already has BCBA suffix
  if (symbol.match(/\.(BA|AR)$/i)) {
    return '';
  }
  
  return ` Try '${symbol}.BA' if it's listed on the BCBA.`;
}

/**
 * Ensures a symbol has a .BA suffix for BCBA market
 * @param symbol - The ticker symbol (e.g., 'AAPL', 'GGAL.BA', 'YPF.AR')
 * @returns The symbol with .BA suffix, or unchanged if it already has .BA or .AR suffix
 */
export function ensureBaSuffix(symbol: string): string {
  if (!symbol) return '';
  
  // If already has .BA or .AR suffix, return as is
  if (symbol.match(/\.(BA|AR)$/i)) {
    return symbol;
  }
  
  // Add .BA suffix
  return `${symbol}.BA`;
} 
