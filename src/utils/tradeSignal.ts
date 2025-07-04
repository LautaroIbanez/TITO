import { Technicals } from '@/types/finance';

export type TradeSignal = 'buy' | 'sell' | 'hold';

/**
 * Determines a trade signal by scoring multiple technical indicators.
 * Each indicator contributes to a total score, which then determines the final signal.
 * - Score > +2: Strong Buy
 * - Score < -2: Strong Sell
 * - Otherwise: Hold
 *
 * @param technicals The technical indicators for a stock.
 * @param currentPrice The current price of the stock, used for SMA/EMA comparison.
 * @returns A trade signal: 'buy', 'sell', or 'hold'.
 */
export function getTradeSignal(
  technicals: Technicals | null | undefined,
  currentPrice: number | null | undefined
): TradeSignal {
  if (!technicals || currentPrice == null) {
    return 'hold';
  }

  let score = 0;
  const { rsi, macd, sma200, sma40, ema25, ema50, ema150, ema12, ema26, adx, pdi, mdi, koncorde } = technicals;

  // 1. RSI
  if (rsi != null) {
    if (rsi < 30) score++; // Oversold, buy signal
    if (rsi > 70) score--; // Overbought, sell signal
  }

  // 2. MACD
  if (macd != null) {
    if (typeof macd === 'object' && macd !== null && 'MACD' in macd) {
      const macdValue = (macd as any).MACD;
      if (typeof macdValue === 'number') {
        if (macdValue > 0) score++; // Bullish
        if (macdValue < 0) score--; // Bearish
      }
    } else if (typeof macd === 'number') {
      if (macd > 0) score++; // Bullish
      if (macd < 0) score--; // Bearish
    }
  }

  // 3. Moving Averages
  if (sma200 != null && currentPrice > sma200) score++; // Bullish trend
  if (sma200 != null && currentPrice < sma200) score--; // Bearish trend
  
  if (sma40 != null && currentPrice > sma40) score++; // Bullish trend
  if (sma40 != null && currentPrice < sma40) score--; // Bearish trend
  
  if (ema50 != null && currentPrice > ema50) score++; // Bullish trend
  if (ema50 != null && currentPrice < ema50) score--; // Bearish trend

  // 4. EMA Crossovers
  if (ema12 != null && ema26 != null) {
    if (ema12 > ema26) score++; // Golden cross
    if (ema12 < ema26) score--; // Death cross
  }

  if (ema25 != null && ema150 != null) {
    if (ema25 > ema150) score++; // Long-term bullish
    if (ema25 < ema150) score--; // Long-term bearish
  }

  // 5. ADX + PDI/MDI
  if (adx != null && adx > 25 && pdi != null && mdi != null) {
    if (pdi > mdi) score++; // Strong uptrend
    if (mdi > pdi) score--; // Strong downtrend
  }

  // 6. KONCORDE Indicator
  if (koncorde != null) {
    if (koncorde.bullish && koncorde.strength > 50) score++; // Strong bullish signal
    if (koncorde.bearish && koncorde.strength > 50) score--; // Strong bearish signal
    if (koncorde.neutral) score += 0; // Neutral, no change
  }

  // Adjusted thresholds for more indicators
  if (score >= 3) return 'buy';
  if (score <= -3) return 'sell';
  return 'hold';
}

export function getTechnicalColor(indicator: string, value: number, currentPrice?: number): string {
  const name = indicator.toUpperCase();

  if (name.includes('RSI')) {
    if (value > 70) return 'text-red-600'; // Sobrecompra
    if (value < 30) return 'text-green-600'; // Sobreventa
  }

  if (name.includes('MACD')) {
    if (value > 0) return 'text-green-600'; // Alcista
    if (value < 0) return 'text-red-600'; // Bajista
  }

  if (name.includes('SMA') || name.includes('EMA')) {
    if (currentPrice) {
      if (currentPrice > value) return 'text-green-600'; // Precio por encima de la media
      if (currentPrice < value) return 'text-red-600'; // Precio por debajo de la media
    }
  }

  if (name.includes('ADX')) {
    if (value > 25) return 'text-green-600'; // Tendencia fuerte
  }

  if (name.includes('KONCORDE')) {
    // KONCORDE color logic would be handled separately since it's an object
    return 'text-gray-600'; // Default neutral
  }

  return 'text-gray-600'; // Neutral
} 