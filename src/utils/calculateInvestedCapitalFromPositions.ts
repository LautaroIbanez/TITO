import { PortfolioPosition } from '@/types';
import getPurchasePrice from './getPurchasePrice';

/**
 * Calculates invested capital from positions by summing each position's purchase value.
 * 
 * For stocks/bonds/crypto: getPurchasePrice(pos) * quantity
 * For deposits/cauciones/mutual funds/real estate: use amount
 * 
 * @param positions Array of portfolio positions
 * @returns Object with totals per currency (ARS, USD)
 */
export function calculateInvestedCapitalFromPositions(positions: PortfolioPosition[]): {
  ARS: number;
  USD: number;
} {
  let ARS = 0;
  let USD = 0;

  for (const pos of positions) {
    let investedAmount = 0;

    if (pos.type === 'Stock' || pos.type === 'Crypto' || pos.type === 'Bond') {
      // For stocks/bonds/crypto: purchasePrice * quantity
      const purchasePrice = getPurchasePrice(pos);
      if (Number.isFinite(purchasePrice) && Number.isFinite(pos.quantity)) {
        investedAmount = purchasePrice * pos.quantity;
      }
    } else if (pos.type === 'FixedTermDeposit' || pos.type === 'Caucion' || pos.type === 'MutualFund' || pos.type === 'RealEstate') {
      // For deposits/cauciones/mutual funds/real estate: use amount
      if (Number.isFinite(pos.amount)) {
        investedAmount = pos.amount;
      }
    }

    // Add to the appropriate currency total
    if (pos.currency === 'ARS') {
      ARS += investedAmount;
    } else if (pos.currency === 'USD') {
      USD += investedAmount;
    }
  }

  return { ARS, USD };
} 