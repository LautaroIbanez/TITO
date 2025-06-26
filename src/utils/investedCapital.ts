import { PortfolioTransaction } from '@/types';

/**
 * Calculates the total capital invested based on market transactions.
 * This includes the cost of all buy transactions and fixed-term deposits,
 * minus the proceeds from all sell transactions for a specific currency.
 * @param transactions - An array of all portfolio transactions.
 * @param currency - The currency to calculate the invested capital for.
 * @returns The net invested capital for the specified currency.
 */
export function calculateInvestedCapital(transactions: PortfolioTransaction[], currency: 'ARS' | 'USD'): number {
  let investedCapital = 0;

  for (const tx of transactions) {
    if (tx.currency !== currency) {
      continue;
    }

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

/**
 * Calculates the net contributions (cash flows) based on all transactions.
 * This includes deposits, withdrawals, buy/sell transactions, and fixed-term deposits.
 * @param transactions - An array of all portfolio transactions.
 * @param currency - The currency to calculate the net contributions for.
 * @returns The net contributions for the specified currency.
 */
export function calculateNetContributions(transactions: PortfolioTransaction[], currency: 'ARS' | 'USD'): number {
  let netContributions = 0;

  for (const tx of transactions) {
    if (tx.currency !== currency) {
      continue;
    }

    switch (tx.type) {
      case 'Deposit':
        netContributions += tx.amount;
        break;
      case 'Withdrawal':
        netContributions -= tx.amount;
        break;
      case 'Buy':
        netContributions += tx.price * tx.quantity;
        break;
      case 'Sell':
        netContributions -= tx.price * tx.quantity;
        break;
      case 'Create':
        if (tx.assetType === 'FixedTermDeposit') {
          netContributions += tx.amount;
        }
        break;
    }
  }

  return netContributions;
} 