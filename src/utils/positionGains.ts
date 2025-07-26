import { PortfolioPosition, StockPosition, CryptoPosition, FixedTermDepositPosition, CaucionPosition, MutualFundPosition } from '@/types';
import { validatePositionPrice } from './priceValidation';
import getPurchasePrice from './getPurchasePrice';

/**
 * Detects if a mutual fund is a Money Market fund based on name and category
 */
export function isMoneyMarketFund(fund: MutualFundPosition): boolean {
  return fund.name.toLowerCase().includes('money market') || 
         fund.category.toLowerCase().includes('money market') ||
         fund.name.toLowerCase().includes('mercado monetario') ||
         fund.category.toLowerCase().includes('mercado monetario');
}

/**
 * Calculates Money Market fund returns based on annual rate and time elapsed since startDate
 * @param fund MutualFundPosition
 * @param today Date to use as 'now' (defaults to new Date())
 * @returns Object with gainCurrency, currentValue, and gainPct
 */
export function calculateMoneyMarketReturns(
  fund: MutualFundPosition,
  today: Date = new Date()
): { gainCurrency: number; currentValue: number; gainPct: number } {
  if (!fund.annualRate || !fund.startDate) {
    return { gainCurrency: 0, currentValue: fund.amount, gainPct: 0 };
  }

  const startDate = new Date(fund.startDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / msPerDay));

  const annualRate = fund.annualRate / 100;
  const dailyRate = annualRate / 365;

  const gainCurrency = fund.amount * dailyRate * daysElapsed;
  const currentValue = fund.amount + gainCurrency;
  const gainPct = (gainCurrency / fund.amount) * 100;

  return { gainCurrency, currentValue, gainPct };
}

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
    const daysElapsed = Math.max(0, (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    let term: number;
    if (pos.type === 'FixedTermDeposit') {
      term = pos.termDays ?? 30;
    } else {
      term = pos.term;
    }
    
    const pct = Math.min(daysElapsed, term) / term * pos.annualRate;
    return (pct / 100) * pos.amount;
  }
  if (pos.type === 'MutualFund') {
    if (isMoneyMarketFund(pos)) {
      const { gainCurrency } = calculateMoneyMarketReturns(pos, today);
      return gainCurrency;
    }
    // For non-Money Market funds, return 0 as we don't have price data
    return 0;
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

/**
 * Calculates portfolio net gains with detailed information per position.
 * Returns gains per position, totals by currency, and list of excluded positions.
 * @param positions Array of portfolio positions
 * @param priceHistory Price data for stocks/bonds/crypto
 * @param today Optional date for calculations (defaults to current date)
 * @returns Object with position gains, currency totals, and excluded positions
 */
export function getPortfolioNetGains(
  positions: PortfolioPosition[],
  priceHistory: Record<string, any>,
  today: Date = new Date()
): {
  positionGains: Map<string, number>;
  totals: { ARS: number; USD: number };
  excludedPositions: Array<{ position: PortfolioPosition; reason: string }>;
} {
  const positionGains = new Map<string, number>();
  let ARS = 0;
  let USD = 0;
  const excludedPositions: Array<{ position: PortfolioPosition; reason: string }> = [];

  for (const pos of positions) {
    const validation = validatePositionPrice(pos, priceHistory);
    
    if (!validation.hasValidPrice || typeof validation.currentPrice !== 'number') {
      excludedPositions.push({ position: pos, reason: validation.reason || 'Precio no disponible' });
      continue;
    }

    const gain = computePositionGain(pos, validation.currentPrice, today);
    
    // For stocks/crypto, validate that both purchase and current prices are finite
    if (pos.type === 'Stock' || pos.type === 'Crypto') {
      const purchasePrice = getPurchasePrice(pos);
      if (!Number.isFinite(purchasePrice) || !Number.isFinite(validation.currentPrice)) {
        excludedPositions.push({ position: pos, reason: 'Precio de compra o actual no válido' });
        continue;
      }
    }

    // Generate unique key for position
    const positionKey = pos.type === 'Stock' || pos.type === 'Crypto' 
      ? `${pos.symbol}-${pos.currency}`
      : pos.type === 'Bond'
      ? `${pos.ticker}-${pos.currency}`
      : pos.id;

    positionGains.set(positionKey, gain);

    if (pos.currency === 'ARS') {
      ARS += gain;
    } else if (pos.currency === 'USD') {
      USD += gain;
    }
  }

  return {
    positionGains,
    totals: { ARS, USD },
    excludedPositions
  };
}

/**
 * Calculates daily yield percentage from annual rate or price history.
 * For deposits/cauciones/mutual funds: converts annual rate to daily rate.
 * For stocks/crypto: calculates daily return from price history.
 * @param position PortfolioPosition
 * @param priceHistory Price data for stocks/crypto
 * @param today Optional date for calculations (defaults to current date)
 * @returns Daily yield as percentage (e.g., 0.05 for 0.05%)
 */
export function getDailyYield(
  position: PortfolioPosition,
  priceHistory: Record<string, any>,
  today: Date = new Date()
): number {
  if (position.type === 'FixedTermDeposit' || position.type === 'Caucion') {
    // For deposits and cauciones, calculate based on term days
    if (!position.annualRate || !position.startDate) return 0;
    
    const startDate = new Date(position.startDate);
    const daysElapsed = Math.max(0, (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let term: number;
    if (position.type === 'FixedTermDeposit') {
      term = position.termDays ?? 30;
    } else {
      term = position.term;
    }
    
    const pct = Math.min(daysElapsed, term) / term * position.annualRate;
    
    return pct;
  }
  
  if (position.type === 'MutualFund') {
    if (isMoneyMarketFund(position)) {
      // For Money Market funds, use monthlyYield / 30 if available, otherwise fallback to annualRate / 365
      if (position.monthlyYield) {
        return position.monthlyYield / 30;
      }
      if (position.annualRate) {
        return position.annualRate / 365;
      }
      return 0;
    }
    // For other mutual funds, return 0 as we don't have price data
    return 0;
  }
  
  if (position.type === 'Stock' || position.type === 'Crypto') {
    // For stocks and crypto, calculate daily return from price history
    const prices = priceHistory[position.symbol];
    if (!prices || prices.length < 2) return 0;
    
    const currentPrice = prices[prices.length - 1]?.close;
    const previousPrice = prices[prices.length - 2]?.close;
    
    if (!currentPrice || !previousPrice || currentPrice === 0 || previousPrice === 0) return 0;
    
    // Calculate daily return as percentage
    const dailyReturn = ((currentPrice - previousPrice) / previousPrice) * 100;
    return dailyReturn;
  }
  
  if (position.type === 'Bond') {
    // For bonds, we could calculate from bond prices if available
    // For now, return 0 as bond pricing is complex
    return 0;
  }
  
  return 0;
} 