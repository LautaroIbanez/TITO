import { PortfolioTransaction, CryptoTradeTransaction } from '@/types';

/**
 * Calculates the total capital invested based on market transactions.
 * This includes the cost of all buy transactions and fixed-term deposits,
 * minus the proceeds from all sell transactions for a specific currency.
 * @param transactions - An array of all portfolio transactions.
 * @param currency - The currency to calculate the invested capital for.
 * @returns The net invested capital for the specified currency.
 */
function isCryptoTradeTransaction(tx: PortfolioTransaction): tx is CryptoTradeTransaction {
  return (
    'assetType' in tx &&
    tx.assetType === 'Crypto' &&
    'originalCurrency' in tx &&
    typeof (tx as any).originalCurrency === 'string' &&
    'originalAmount' in tx &&
    typeof (tx as any).originalAmount === 'number'
  );
}

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
        if (isCryptoTradeTransaction(tx)) {
          if (tx.originalCurrency === currency && typeof tx.originalAmount === 'number') {
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
        if (tx.assetType === 'FixedTermDeposit' || tx.assetType === 'Caucion') {
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
        isCryptoTradeTransaction(tx) &&
        tx.originalCurrency === currency &&
        typeof tx.originalAmount === 'number'
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
      const isCrypto = isCryptoTradeTransaction(tx);
      if (isCrypto && 'currency' in tx) {
        const cryptoTx = tx as CryptoTradeTransaction;
        const currency = (tx as { currency: 'ARS' | 'USD' }).currency;
        if (cryptoTx.originalCurrency === currency && typeof cryptoTx.originalAmount === 'number') {
          if (currency === 'ARS') investedARS += cryptoTx.originalAmount;
          // @ts-expect-error: currency solo puede ser 'ARS' o 'USD' aquí
          if (currency === 'USD') investedUSD += cryptoTx.originalAmount;
        }
      } else if ('price' in tx && 'quantity' in tx && 'currency' in tx) {
        const commission = (tx as any).commissionPct ?? 0;
        const purchaseFee = (tx as any).purchaseFeePct ?? 0;
        const currency = (tx as { currency: 'ARS' | 'USD' }).currency;
        if (currency === 'ARS') {
          investedARS += (tx as any).price * (tx as any).quantity * (1 + commission / 100 + purchaseFee / 100);
        }
        if (currency === 'USD') {
          investedUSD += (tx as any).price * (tx as any).quantity * (1 + commission / 100 + purchaseFee / 100);
        }
      }
    }
    result.push({ date: dateStr, investedARS, investedUSD });
    current.setDate(current.getDate() + 1);
  }
  return result;
} 