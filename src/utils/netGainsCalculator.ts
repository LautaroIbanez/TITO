import type { DailyPortfolioRecord } from './portfolioHistoryClient';

/**
 * Calculates cumulative net gains from a sorted list of daily portfolio records
 * by summing differences in total portfolio values between consecutive days.
 */
export function calculateCumulativeNetGains(records: DailyPortfolioRecord[]): {
  cumulativeARS: number;
  cumulativeUSD: number;
  dailyGains: Array<{ date: string; gainARS: number; gainUSD: number }>;
} {
  if (records.length === 0) {
    return {
      cumulativeARS: 0,
      cumulativeUSD: 0,
      dailyGains: []
    };
  }

  if (records.length === 1) {
    return {
      cumulativeARS: 0,
      cumulativeUSD: 0,
      dailyGains: [{
        date: records[0].fecha,
        gainARS: 0,
        gainUSD: 0
      }]
    };
  }

  let cumulativeARS = 0;
  let cumulativeUSD = 0;
  const dailyGains: Array<{ date: string; gainARS: number; gainUSD: number }> = [];

  // Sort records by date to ensure chronological order
  const sortedRecords = [...records].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  for (let i = 1; i < sortedRecords.length; i++) {
    const previousRecord = sortedRecords[i - 1];
    const currentRecord = sortedRecords[i];

    const dailyGainARS = currentRecord.total_portfolio_ars - previousRecord.total_portfolio_ars;
    const dailyGainUSD = currentRecord.total_portfolio_usd - previousRecord.total_portfolio_usd;

    cumulativeARS += dailyGainARS;
    cumulativeUSD += dailyGainUSD;

    dailyGains.push({
      date: currentRecord.fecha,
      gainARS: dailyGainARS,
      gainUSD: dailyGainUSD
    });
  }

  return {
    cumulativeARS,
    cumulativeUSD,
    dailyGains
  };
}

/**
 * Gets the latest cumulative net gains from a sorted list of daily portfolio records.
 * Returns the cumulative gains up to the most recent record.
 */
export function getLatestCumulativeNetGains(records: DailyPortfolioRecord[]): {
  cumulativeARS: number;
  cumulativeUSD: number;
} {
  const { cumulativeARS, cumulativeUSD } = calculateCumulativeNetGains(records);
  return { cumulativeARS, cumulativeUSD };
}

/**
 * Calculates net gains for a specific date range from daily portfolio records.
 */
export function calculateNetGainsForDateRange(
  records: DailyPortfolioRecord[],
  startDate: string,
  endDate: string
): {
  netGainsARS: number;
  netGainsUSD: number;
} {
  const filteredRecords = records.filter(record => 
    record.fecha >= startDate && record.fecha <= endDate
  );

  const { cumulativeARS, cumulativeUSD } = calculateCumulativeNetGains(filteredRecords);
  return {
    netGainsARS: cumulativeARS,
    netGainsUSD: cumulativeUSD
  };
}

/**
 * Recalculates net gains for all records in a portfolio history.
 * Updates each record's ganancias_netas_ars and ganancias_netas_usd fields.
 */
export function recalculateNetGainsForRecords(records: DailyPortfolioRecord[]): DailyPortfolioRecord[] {
  if (records.length === 0) return records;

  const sortedRecords = [...records].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  const updatedRecords: DailyPortfolioRecord[] = [];

  for (let i = 0; i < sortedRecords.length; i++) {
    const currentRecord = { ...sortedRecords[i] };
    
    if (i === 0) {
      // First record has no gains
      currentRecord.ganancias_netas_ars = 0;
      currentRecord.ganancias_netas_usd = 0;
    } else {
      // Calculate cumulative gains up to this record
      const recordsUpToThis = sortedRecords.slice(0, i + 1);
      const { cumulativeARS, cumulativeUSD } = calculateCumulativeNetGains(recordsUpToThis);
      currentRecord.ganancias_netas_ars = cumulativeARS;
      currentRecord.ganancias_netas_usd = cumulativeUSD;
    }

    updatedRecords.push(currentRecord);
  }

  return updatedRecords;
} 