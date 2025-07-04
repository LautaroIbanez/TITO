import { PortfolioTransaction, PortfolioPosition } from '@/types';

/**
 * Type guard to check if a transaction has an assetType property
 */
export function hasAssetType(tx: PortfolioTransaction): tx is PortfolioTransaction & { assetType: 'Stock' | 'Bond' | 'FixedTermDeposit' | 'Caucion' | 'Crypto' | 'RealEstate' } {
  return 'assetType' in tx;
}

/**
 * Type guard to check if a transaction is a trade transaction (Buy/Sell)
 */
export function isTradeTransaction(tx: PortfolioTransaction): tx is PortfolioTransaction & { 
  type: 'Buy' | 'Sell';
  assetType: 'Stock' | 'Bond' | 'Crypto';
  quantity: number;
  price: number;
  currency: 'ARS' | 'USD';
} {
  return (tx.type === 'Buy' || tx.type === 'Sell') && hasAssetType(tx);
}

/**
 * Type guard to check if a transaction is a creation transaction (Create)
 */
export function isCreationTransaction(tx: PortfolioTransaction): tx is PortfolioTransaction & {
  type: 'Create';
  assetType: 'FixedTermDeposit' | 'Caucion' | 'RealEstate';
  amount: number;
  currency: 'ARS' | 'USD';
} {
  return tx.type === 'Create' && hasAssetType(tx);
}

/**
 * Type guard to check if a position has a ticker/symbol property
 */
export function hasTickerOrSymbol(pos: PortfolioPosition): pos is PortfolioPosition & { 
  symbol?: string; 
  ticker?: string; 
} {
  return pos.type === 'Stock' || pos.type === 'Bond' || pos.type === 'Crypto';
}

/**
 * Get the ticker or symbol from a position safely
 */
export function getPositionIdentifier(pos: PortfolioPosition): string | null {
  if (pos.type === 'Stock' || pos.type === 'Crypto') {
    return pos.symbol;
  }
  if (pos.type === 'Bond') {
    return pos.ticker;
  }
  return null;
}

/**
 * Get the ticker or symbol from a trade transaction safely
 */
export function getTransactionIdentifier(tx: PortfolioTransaction): string | null {
  if (!isTradeTransaction(tx)) {
    return null;
  }
  
  if (tx.assetType === 'Stock' || tx.assetType === 'Crypto') {
    return 'symbol' in tx ? tx.symbol : null;
  }
  if (tx.assetType === 'Bond') {
    return 'ticker' in tx ? tx.ticker : null;
  }
  
  return null;
} 