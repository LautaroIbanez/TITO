import { PortfolioPosition, StockPosition, CryptoPosition, FixedTermDepositPosition, CaucionPosition } from '@/types';
import { validatePositionPrice } from './priceValidation';
import getPurchasePrice from './getPurchasePrice';

/**
 * Computes the gain/loss in currency for a portfolio position.
 * - For stocks/crypto: (currentPrice - purchasePrice) * quantity
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
    if (typeof currentPrice !== 'number' || !Number.isFinite(currentPrice)) return 0;
    
    const purchasePrice = getPurchasePrice(pos);
    if (!Number.isFinite(purchasePrice)) return 0;
    
    return (currentPrice - purchasePrice) * pos.quantity;
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

/**
 * Calculates net gains by currency for all positions with valid current price.
 * Returns { ARS, USD, skipped: Array<{ position, reason }> }
 */
export function calculateNetGainsByCurrency(
  positions: PortfolioPosition[],
  priceHistory: Record<string, any>,
  today: Date = new Date()
): { ARS: number; USD: number; skipped: Array<{ position: PortfolioPosition; reason: string }> } {
  let ARS = 0;
  let USD = 0;
  const skipped: Array<{ position: PortfolioPosition; reason: string }> = [];

  for (const pos of positions) {
    const validation = validatePositionPrice(pos, priceHistory);
    if (!validation.hasValidPrice || typeof validation.currentPrice !== 'number') {
      skipped.push({ position: pos, reason: validation.reason || 'Precio no disponible' });
      continue;
    }
    const gain = computePositionGain(pos, validation.currentPrice, today);
    // If stock/crypto and gain is 0 due to non-finite purchase/current price, skip
    if ((pos.type === 'Stock' || pos.type === 'Crypto')) {
      const purchasePrice = getPurchasePrice(pos);
      if (!Number.isFinite(purchasePrice) || !Number.isFinite(validation.currentPrice)) {
        skipped.push({ position: pos, reason: 'Precio de compra o actual no válido' });
        continue;
      }
    }
    if (pos.currency === 'ARS') {
      ARS += gain;
    } else if (pos.currency === 'USD') {
      USD += gain;
    }
  }
  return { ARS, USD, skipped };
} 