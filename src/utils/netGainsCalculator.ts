import type { DailyPortfolioRecord } from './portfolioHistory';

export interface NetGains {
  ARS: number;
  USD: number;
}

/**
 * Calculates net gains for a portfolio record using the standardized formula:
 * total_portfolio - capital_invertido
 */
export function recalculateNetGains(record: DailyPortfolioRecord): NetGains {
  return {
    ARS: record.total_portfolio_ars - record.capital_invertido_ars,
    USD: record.total_portfolio_usd - record.capital_invertido_usd
  };
}

/**
 * Calculates net gains for an array of portfolio records
 */
export function recalculateNetGainsForRecords(records: DailyPortfolioRecord[]): NetGains[] {
  return records.map(recalculateNetGains);
}

/**
 * Gets the latest net gains from an array of portfolio records
 */
export function getLatestNetGains(records: DailyPortfolioRecord[]): NetGains | null {
  if (!records || records.length === 0) {
    return null;
  }
  
  const latestRecord = records[records.length - 1];
  return recalculateNetGains(latestRecord);
} 