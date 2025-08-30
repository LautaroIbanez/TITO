import { PortfolioPosition, StockPosition, BondPosition, CryptoPosition } from '@/types';
import { PriceData } from '@/types/finance';
import { getBondPriceFromJson, getBondPriceFromCache } from './calculatePortfolioValue';

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
      console.warn(`Missing price data for ${symbol}: No hay datos de precio disponibles`);
      return {
        hasValidPrice: false,
        reason: 'No hay datos de precio disponibles'
      };
    }
    
    // Find the most recent non-zero price
    const recentPrices = prices.slice().reverse().slice(0, 10); // Check last 10 prices
    const validPriceEntry = recentPrices.find(p => p.close > 0);
    
    if (!validPriceEntry) {
      console.warn(`Invalid price data for ${symbol}: Precios recientes son cero o inválidos`);
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
      // Try fallback from bonds.json synchronously
      const fallbackPrice = getBondPriceFromCache(ticker, position.currency);
      if (fallbackPrice !== undefined) {
        return {
          hasValidPrice: true,
          currentPrice: fallbackPrice
        };
      }
      
      console.warn(`Missing price data for bond ${ticker}: No hay datos de precio disponibles`);
      return {
        hasValidPrice: false,
        reason: 'No hay datos de precio disponibles'
      };
    }
    
    // Find the most recent non-zero price
    const recentPrices = prices.slice().reverse().slice(0, 10);
    const validPriceEntry = recentPrices.find(p => p.close > 0);
    
    if (!validPriceEntry) {
      // Try fallback from bonds.json synchronously
      const fallbackPrice = getBondPriceFromCache(ticker, position.currency);
      if (fallbackPrice !== undefined) {
        return {
          hasValidPrice: true,
          currentPrice: fallbackPrice
        };
      }
      
      console.warn(`Invalid price data for bond ${ticker}: Precios recientes son cero o inválidos`);
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
  
  // Fixed-term deposits, cauciones, and mutual funds don't need price validation
  if (position.type === 'FixedTermDeposit' || position.type === 'Caucion' || position.type === 'MutualFund') {
    return {
      hasValidPrice: true,
      currentPrice: position.amount // Use the amount as the "price"
    };
  }
  
  console.warn(`Unsupported asset type for ${position.type}: Tipo de activo no soportado`);
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
  if (position.type === 'MutualFund') {
    return position.name;
  }
  return 'Activo desconocido';
} 