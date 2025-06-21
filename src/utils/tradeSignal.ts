import { Technicals } from '@/types/finance';

export type TradeSignal = 'buy' | 'sell' | 'hold';

/**
 * Determines a trade signal based on common technical indicators.
 *
 * The logic is prioritized as follows:
 * 1. Strong RSI signals (overbought/oversold) take precedence.
 * 2. If RSI is neutral, EMA crossover (golden/death cross) determines the signal.
 * 3. If no clear signal is found, it defaults to 'hold'.
 *
 * @param tech - The technical indicators for a stock.
 * @returns A trade signal: 'buy', 'sell', or 'hold'.
 */
export function getTradeSignal(tech: Technicals | null | undefined): TradeSignal {
  if (!tech) {
    return 'hold';
  }

  const { rsi, ema12, ema26 } = tech;

  // 1. Check for strong overbought/oversold signals from RSI
  if (rsi !== null) {
    if (rsi > 70) {
      return 'sell'; // Overbought
    }
    if (rsi < 30) {
      return 'buy'; // Oversold
    }
  }

  // 2. Check for EMA crossover signals if RSI is neutral
  if (ema12 !== null && ema26 !== null) {
    if (ema12 > ema26) {
      return 'buy'; // Golden cross
    }
    if (ema12 < ema26) {
      return 'sell'; // Death cross
    }
  }

  // 3. Default to 'hold' if no clear signal
  return 'hold';
} 