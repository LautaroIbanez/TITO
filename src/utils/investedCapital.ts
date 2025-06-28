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
      case 'Buy': {
        const commission = tx.commissionPct ?? 0;
        const purchaseFee = tx.purchaseFeePct ?? 0;
        // Manejo especial para compras de cripto pagadas en ARS pero registradas en USD
        if (
          tx.assetType === 'Crypto' &&
          'originalCurrency' in tx &&
          'originalAmount' in tx &&
          typeof tx.originalCurrency === 'string' &&
          typeof tx.originalAmount === 'number'
        ) {
          // Sumar el gasto real en la moneda original
          if (currency === tx.originalCurrency) {
            investedCapital += tx.originalAmount;
          }
        } else {
          investedCapital += tx.price * tx.quantity * (1 + commission / 100 + purchaseFee / 100);
        }
        break;
      }
      case 'Sell': {
        const commission = tx.commissionPct ?? 0;
        investedCapital -= tx.price * tx.quantity * (1 - commission / 100);
        break;
      }
      case 'Create':
        if (tx.assetType === 'FixedTermDeposit') {
          investedCapital += tx.amount;
        }
        break;
      case 'Deposit':
        if (tx.source === 'FixedTermPayout') {
          investedCapital -= tx.amount;
        }
        break;
      // Withdrawal y otros tipos siguen ignorados
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
      // Excepción: para crypto pagada en ARS pero registrada en USD
      if (
        tx.type === 'Buy' &&
        tx.assetType === 'Crypto' &&
        'originalCurrency' in tx &&
        'originalAmount' in tx &&
        typeof tx.originalCurrency === 'string' &&
        typeof tx.originalAmount === 'number' &&
        tx.originalCurrency === currency
      ) {
        netContributions += tx.originalAmount;
      }
      continue;
    }

    switch (tx.type) {
      case 'Deposit':
        if (!(tx as any).source || (tx as any).source !== 'FixedTermPayout') {
          netContributions += tx.amount;
        }
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