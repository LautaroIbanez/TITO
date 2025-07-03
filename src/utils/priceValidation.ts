import { PortfolioPosition, StockPosition, BondPosition, CryptoPosition } from '@/types';
import { PriceData } from '@/types/finance';
import { getBondPriceFromJson } from './calculatePortfolioValue';

export interface PriceValidationResult {
  hasValidPrice: boolean;
  currentPrice?: number;
  reason?: string;
}

/**
 * Checks if a position has valid current price data
 * @param position Portfolio position to validate
 * @param priceHistory Price data for stocks/bonds/crypto
 * @returns Object indicating if price is valid and the current price
 */
export function validatePositionPrice(
  position: PortfolioPosition,
  priceHistory: Record<string, PriceData[]>
): PriceValidationResult {
  if (position.type === 'Stock' || position.type === 'Crypto') {
    const symbol = position.symbol;
    const prices = priceHistory[symbol];
    
    if (!prices || prices.length === 0) {
      return {
        hasValidPrice: false,
        reason: 'No hay datos de precio disponibles'
      };
    }
    
    // Find the most recent non-zero price
    const recentPrices = prices.slice().reverse().slice(0, 10); // Check last 10 prices
    const validPriceEntry = recentPrices.find(p => p.close > 0);
    
    if (!validPriceEntry) {
      return {
        hasValidPrice: false,
        reason: 'Precios recientes son cero o inválidos'
      };
    }
    
    return {
      hasValidPrice: true,
      currentPrice: validPriceEntry.close
    };
  }
  
  if (position.type === 'Bond') {
    const ticker = position.ticker;
    const prices = priceHistory[ticker];
    
    if (!prices || prices.length === 0) {
      // Try fallback from bonds.json
      const fallbackPrice = getBondPriceFromJson(ticker, position.currency);
      if (fallbackPrice !== undefined) {
        return {
          hasValidPrice: true,
          currentPrice: fallbackPrice
        };
      }
      
      return {
        hasValidPrice: false,
        reason: 'No hay datos de precio disponibles'
      };
    }
    
    // Find the most recent non-zero price
    const recentPrices = prices.slice().reverse().slice(0, 10);
    const validPriceEntry = recentPrices.find(p => p.close > 0);
    
    if (!validPriceEntry) {
      // Try fallback from bonds.json
      const fallbackPrice = getBondPriceFromJson(ticker, position.currency);
      if (fallbackPrice !== undefined) {
        return {
          hasValidPrice: true,
          currentPrice: fallbackPrice
        };
      }
      
      return {
        hasValidPrice: false,
        reason: 'Precios recientes son cero o inválidos'
      };
    }
    
    return {
      hasValidPrice: true,
      currentPrice: validPriceEntry.close
    };
  }
  
  // Fixed-term deposits and cauciones don't need price validation
  if (position.type === 'FixedTermDeposit' || position.type === 'Caucion') {
    return {
      hasValidPrice: true,
      currentPrice: position.amount // Use the amount as the "price"
    };
  }
  
  return {
    hasValidPrice: false,
    reason: 'Tipo de activo no soportado'
  };
}

/**
 * Filters positions to only include those with valid current prices
 * @param positions Array of portfolio positions
 * @param priceHistory Price data for stocks/bonds/crypto
 * @returns Object with filtered positions and excluded positions
 */
export function filterPositionsWithValidPrices(
  positions: PortfolioPosition[],
  priceHistory: Record<string, PriceData[]>
): {
  validPositions: PortfolioPosition[];
  excludedPositions: Array<{ position: PortfolioPosition; reason: string }>;
} {
  const validPositions: PortfolioPosition[] = [];
  const excludedPositions: Array<{ position: PortfolioPosition; reason: string }> = [];
  
  for (const position of positions) {
    const validation = validatePositionPrice(position, priceHistory);
    
    if (validation.hasValidPrice) {
      validPositions.push(position);
    } else {
      excludedPositions.push({
        position,
        reason: validation.reason || 'Precio no disponible'
      });
    }
  }
  
  return { validPositions, excludedPositions };
}

/**
 * Gets the display name for a position
 * @param position Portfolio position
 * @returns Display name for the position
 */
export function getPositionDisplayName(position: PortfolioPosition): string {
  if (position.type === 'Stock') {
    return position.symbol;
  }
  if (position.type === 'Bond') {
    return position.ticker;
  }
  if (position.type === 'Crypto') {
    return position.symbol;
  }
  if (position.type === 'FixedTermDeposit') {
    return `${position.provider} - Plazo Fijo`;
  }
  if (position.type === 'Caucion') {
    return `${position.provider} - Caución`;
  }
  return 'Activo desconocido';
} 