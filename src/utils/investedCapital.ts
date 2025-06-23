import { PortfolioTransaction } from '@/types';

/**
 * Calculates the total capital invested based on market transactions.
 * This includes the cost of all buy transactions and fixed-term deposits,
 * minus the proceeds from all sell transactions. Simple cash deposits are ignored.
 * @param transactions - An array of all portfolio transactions.
 * @returns The net invested capital.
 */
export function calculateInvestedCapital(transactions: PortfolioTransaction[]): number {
  let investedCapital = 0;

  for (const tx of transactions) {
    switch (tx.type) {
      case 'Buy':
        investedCapital += tx.price * tx.quantity;
        break;
      case 'Sell':
        investedCapital -= tx.price * tx.quantity;
        break;
      case 'Create':
        if (tx.assetType === 'FixedTermDeposit') {
          investedCapital += tx.amount;
        }
        break;
      // Deposit and other transaction types are explicitly ignored.
    }
  }

  return investedCapital;
} 