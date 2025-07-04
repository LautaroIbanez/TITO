import { PortfolioTransaction, CryptoTradeTransaction } from '@/types';

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
          const cryptoTx = tx as CryptoTradeTransaction;
          if (cryptoTx.originalCurrency === currency && cryptoTx.originalAmount) {
            investedCapital += cryptoTx.originalAmount;
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
        (tx.originalCurrency as string) === currency
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

/**
 * Returns daily invested capital for ARS and USD over a date range.
 * @param transactions - All portfolio transactions.
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of { date, investedARS, investedUSD }
 */
export function calculateDailyInvestedCapital(
  transactions: PortfolioTransaction[],
  startDate: string,
  endDate: string
): { date: string; investedARS: number; investedUSD: number }[] {
  // Sort transactions by date ascending
  const txs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let investedARS = 0;
  let investedUSD = 0;
  const result: { date: string; investedARS: number; investedUSD: number }[] = [];

  // Build a map of transactions by date (YYYY-MM-DD)
  const txByDate = new Map<string, PortfolioTransaction[]>();
  for (const tx of txs) {
    const dateStr = new Date(tx.date).toISOString().slice(0, 10);
    if (!txByDate.has(dateStr)) txByDate.set(dateStr, []);
    txByDate.get(dateStr)!.push(tx);
  }

  let current = new Date(startDate);
  const last = new Date(endDate);
  while (current <= last) {
    const dateStr = current.toISOString().slice(0, 10);
    const todaysTxs = txByDate.get(dateStr) || [];
    for (const tx of todaysTxs) {
      // ARS
      if (tx.currency === 'ARS') {
        switch (tx.type) {
          case 'Buy': {
            const commission = tx.commissionPct ?? 0;
            const purchaseFee = tx.purchaseFeePct ?? 0;
            if (
              tx.assetType === 'Crypto' &&
              'originalCurrency' in tx &&
              'originalAmount' in tx &&
              typeof tx.originalCurrency === 'string' &&
              typeof tx.originalAmount === 'number'
            ) {
              if ((tx.originalCurrency as string) === 'ARS') investedARS += tx.originalAmount;
            } else {
              investedARS += tx.price * tx.quantity * (1 + commission / 100 + purchaseFee / 100);
            }
            break;
          }
          case 'Sell': {
            const commission = tx.commissionPct ?? 0;
            investedARS -= tx.price * tx.quantity * (1 - commission / 100);
            break;
          }
          case 'Create':
            if (tx.assetType === 'FixedTermDeposit') investedARS += tx.amount;
            break;
          case 'Deposit':
            if ((tx as any).source === 'FixedTermPayout') investedARS -= tx.amount;
            break;
        }
      }
      // USD
      if (tx.currency === 'USD') {
        switch (tx.type) {
          case 'Buy': {
            const commission = tx.commissionPct ?? 0;
            const purchaseFee = tx.purchaseFeePct ?? 0;
            if (
              tx.assetType === 'Crypto' &&
              'originalCurrency' in tx &&
              'originalAmount' in tx &&
              typeof tx.originalCurrency === 'string' &&
              typeof tx.originalAmount === 'number'
            ) {
              if ((tx.originalCurrency as string) === 'USD') investedUSD += tx.originalAmount;
            } else {
              investedUSD += tx.price * tx.quantity * (1 + commission / 100 + purchaseFee / 100);
            }
            break;
          }
          case 'Sell': {
            const commission = tx.commissionPct ?? 0;
            investedUSD -= tx.price * tx.quantity * (1 - commission / 100);
            break;
          }
          case 'Create':
            if (tx.assetType === 'FixedTermDeposit') investedUSD += tx.amount;
            break;
          case 'Deposit':
            if ((tx as any).source === 'FixedTermPayout') investedUSD -= tx.amount;
            break;
        }
      }
    }
    result.push({ date: dateStr, investedARS, investedUSD });
    current.setDate(current.getDate() + 1);
  }
  return result;
} 