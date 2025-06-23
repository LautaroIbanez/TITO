// For now, using a hardcoded exchange rate.
// This can be replaced with a call to a live exchange rate API.
const MOCK_EXCHANGE_RATE_USD_TO_ARS = 1000;

/**
 * Gets the current exchange rate for a given currency pair.
 * @param from - The currency to convert from.
 * @param to - The currency to convert to.
 * @returns The exchange rate.
 */
export function getExchangeRate(from: 'USD' | 'ARS', to: 'USD' | 'ARS'): number {
  if (from === to) {
    return 1;
  }
  if (from === 'USD' && to === 'ARS') {
    return MOCK_EXCHANGE_RATE_USD_TO_ARS;
  }
  if (from === 'ARS' && to === 'USD') {
    return 1 / MOCK_EXCHANGE_RATE_USD_TO_ARS;
  }
  return 1; // Should not happen with current types
}

/**
 * Converts an amount from one currency to another.
 * @param amount The amount to convert.
 * @param from The currency of the amount.
 * @param to The target currency.
 * @returns The converted amount.
 */
export function convertCurrency(amount: number, from: 'USD' | 'ARS', to: 'USD' | 'ARS'): number {
    const rate = getExchangeRate(from, to);
    return amount * rate;
} 