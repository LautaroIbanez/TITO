import { PortfolioPosition, StockPosition, CryptoPosition, FixedTermDepositPosition, CaucionPosition } from '@/types';

/**
 * Computes the gain/loss in currency for a portfolio position.
 * - For stocks/crypto: (currentPrice - averagePrice) * quantity
 * - For fixed-term deposits/cauciones: amount * annualRate * (days/365)
 * @param pos PortfolioPosition
 * @param currentPrice (for stocks/crypto)
 * @param today (optional, for deposits/cauciones)
 * @returns gain in currency (positive = gain, negative = loss)
 */
export function computePositionGain(
  pos: PortfolioPosition,
  currentPrice?: number,
  today: Date = new Date()
): number {
  if (pos.type === 'Stock' || pos.type === 'Crypto') {
    if (typeof currentPrice !== 'number') return 0;
    return (currentPrice - pos.averagePrice) * pos.quantity;
  }
  if (pos.type === 'FixedTermDeposit' || pos.type === 'Caucion') {
    const start = new Date(pos.startDate);
    const end = new Date(pos.maturityDate);
    // If matured, use full term, else use days so far
    const days = today > end
      ? Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      : Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 0;
    return pos.amount * (pos.annualRate / 100) * (days / 365);
  }
  return 0;
} 