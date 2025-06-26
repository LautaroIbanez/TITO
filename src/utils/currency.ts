// For now, using a hardcoded exchange rate as fallback.
const DEFAULT_EXCHANGE_RATE_USD_TO_ARS = 1000;
let cachedRate: number | null = null;
let lastFetch: number | null = null;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches the current USD to ARS exchange rate from exchangerate.host.
 * Falls back to DEFAULT_EXCHANGE_RATE_USD_TO_ARS if fetch fails.
 */
export async function fetchExchangeRateUSDToARS(): Promise<number> {
  const now = Date.now();
  if (cachedRate !== null && lastFetch !== null && now - lastFetch < CACHE_DURATION_MS) {
    return cachedRate;
  }
  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=ARS');
    if (!res.ok) throw new Error('Failed to fetch exchange rate');
    const data = await res.json();
    const rate = data.rates?.ARS;
    if (typeof rate === 'number' && rate > 0) {
      cachedRate = rate;
      lastFetch = now;
      return rate;
    }
  } catch (e) {
    // Fallback to default
  }
  cachedRate = DEFAULT_EXCHANGE_RATE_USD_TO_ARS;
  lastFetch = now;
  return DEFAULT_EXCHANGE_RATE_USD_TO_ARS;
}

/**
 * Gets the current exchange rate for a given currency pair (async).
 * @param from - The currency to convert from.
 * @param to - The currency to convert to.
 * @returns The exchange rate.
 */
export async function getExchangeRate(from: 'USD' | 'ARS', to: 'USD' | 'ARS'): Promise<number> {
  if (from === to) return 1;
  const usdToArs = await fetchExchangeRateUSDToARS();
  if (from === 'USD' && to === 'ARS') return usdToArs;
  if (from === 'ARS' && to === 'USD') return 1 / usdToArs;
  return 1;
}

/**
 * Converts an amount from one currency to another (async).
 * @param amount The amount to convert.
 * @param from The currency of the amount.
 * @param to The target currency.
 * @returns The converted amount.
 */
export async function convertCurrency(amount: number, from: 'USD' | 'ARS', to: 'USD' | 'ARS'): Promise<number> {
  const rate = await getExchangeRate(from, to);
  return amount * rate;
} 