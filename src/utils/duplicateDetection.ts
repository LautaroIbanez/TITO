import { PortfolioPosition } from '@/types';
import { isSameAsset } from './tickers';

export interface DuplicateGroup {
  baseTicker: string;
  positions: PortfolioPosition[];
  totalValue: number;
  warning: string;
}

export interface DuplicateDetectionResult {
  duplicates: DuplicateGroup[];
  hasDuplicates: boolean;
  warningMessage?: string;
}

/**
 * Detects duplicate assets in portfolio positions (e.g., AAPL and AAPL.BA)
 * @param positions Array of portfolio positions
 * @returns Object containing duplicate groups and warning information
 */
export function detectDuplicates(positions: PortfolioPosition[]): DuplicateDetectionResult {
  const duplicates: DuplicateGroup[] = [];
  const processed = new Set<string>();
  
  // Group positions by base ticker
  const groups = new Map<string, PortfolioPosition[]>();
  
  for (const position of positions) {
    if (position.type === 'Stock' || position.type === 'Bond') {
      const ticker = position.type === 'Stock' ? position.symbol : (position.type === 'Bond' ? position.ticker : '');
      const baseTicker = ticker.replace(/\.(BA|AR|TO)$/i, '');
      
      if (!groups.has(baseTicker)) {
        groups.set(baseTicker, []);
      }
      groups.get(baseTicker)!.push(position);
    }
  }
  
  // Find groups with multiple positions (duplicates)
  for (const [baseTicker, groupPositions] of groups) {
    if (groupPositions.length > 1) {
      // Calculate total value for this group
      let totalValue = 0;
      for (const pos of groupPositions) {
        if (pos.type === 'Stock') {
                totalValue += pos.quantity * (pos.purchasePrice || 0);
    } else if (pos.type === 'Bond') {
      totalValue += pos.quantity * pos.purchasePrice;
        }
      }
      
      // Create warning message
      const tickers = groupPositions.map(p => 
        p.type === 'Stock' ? p.symbol : (p.type === 'Bond' ? p.ticker : '')
      ).join(', ');
      
      const warning = `Posiciones duplicadas detectadas: ${tickers}. Considere consolidar en una sola posición.`;
      
      duplicates.push({
        baseTicker,
        positions: groupPositions,
        totalValue,
        warning
      });
      
      // Mark all positions in this group as processed
      for (const pos of groupPositions) {
        const ticker = pos.type === 'Stock' ? pos.symbol : (pos.type === 'Bond' ? pos.ticker : '');
        processed.add(ticker);
      }
    }
  }
  
  const hasDuplicates = duplicates.length > 0;
  const warningMessage = hasDuplicates 
    ? `Se detectaron ${duplicates.length} grupo(s) de activos duplicados. Revise las posiciones para evitar doble conteo.`
    : undefined;
  
  return {
    duplicates,
    hasDuplicates,
    warningMessage
  };
}

/**
 * Filters out duplicate positions, keeping only the one with the highest value
 * @param positions Array of portfolio positions
 * @returns Filtered positions with duplicates removed
 */
export function filterDuplicates(positions: PortfolioPosition[]): PortfolioPosition[] {
  const { duplicates } = detectDuplicates(positions);
  const duplicateTickers = new Set<string>();
  
  // Collect all tickers that are part of duplicate groups
  for (const group of duplicates) {
    for (const pos of group.positions) {
      if (pos.type === 'Stock' || pos.type === 'Bond') {
        const ticker = pos.type === 'Stock' ? pos.symbol : pos.ticker;
        duplicateTickers.add(ticker);
      }
    }
  }
  
  // Remove all duplicate positions
  return positions.filter(pos => {
    if (pos.type === 'Stock' || pos.type === 'Bond') {
      const ticker = pos.type === 'Stock' ? pos.symbol : (pos.type === 'Bond' ? pos.ticker : '');
      return !duplicateTickers.has(ticker);
    }
    return true; // Keep non-stock/bond positions
  });
}

/**
 * Consolidates duplicate positions by keeping the one with the highest value
 * @param positions Array of portfolio positions
 * @returns Consolidated positions with duplicates merged
 */
export function consolidateDuplicates(positions: PortfolioPosition[]): PortfolioPosition[] {
  const { duplicates } = detectDuplicates(positions);
  const result = [...positions];
  
  for (const group of duplicates) {
    // Find the position with the highest value
    let bestPosition = group.positions[0];
    let bestValue = 0;
    
    for (const pos of group.positions) {
      let value = 0;
      if (pos.type === 'Stock') {
              value = pos.quantity * (pos.purchasePrice || 0);
    } else if (pos.type === 'Bond') {
      value = pos.quantity * pos.purchasePrice;
      }
      
      if (value > bestValue) {
        bestValue = value;
        bestPosition = pos;
      }
    }
    
    // Remove all positions in this group from the result
    for (const pos of group.positions) {
      const index = result.findIndex(p => {
        if (p.type === 'Stock' && pos.type === 'Stock') {
          return p.symbol === pos.symbol && p.currency === pos.currency;
        }
        if (p.type === 'Bond' && pos.type === 'Bond') {
          return p.ticker === pos.ticker && p.currency === pos.currency;
        }
        return false;
      });
      
      if (index !== -1) {
        result.splice(index, 1);
      }
    }
    
    // Add back the best position
    result.push(bestPosition);
  }
  
  return result;
}

/**
 * Checks if two positions represent the same underlying asset
 * @param pos1 First position
 * @param pos2 Second position
 * @returns true if they represent the same asset
 */
export function areSameAsset(pos1: PortfolioPosition, pos2: PortfolioPosition): boolean {
  if (pos1.type !== pos2.type) return false;
  
  if (pos1.type === 'Stock' && pos2.type === 'Stock') {
    return isSameAsset(pos1.symbol, pos2.symbol); // Don't check currency for duplicate detection
  }
  
  if (pos1.type === 'Bond' && pos2.type === 'Bond') {
    return isSameAsset(pos1.ticker, pos2.ticker); // Don't check currency for duplicate detection
  }
  
  return false;
} 