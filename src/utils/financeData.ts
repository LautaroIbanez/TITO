import yahooFinance from 'yahoo-finance2';
import dayjs from 'dayjs';
import { promises as fs } from 'fs';
import path from 'path';
import { PriceData, Fundamentals } from '@/types/finance';

// Helper: Read JSON file safely
async function readJsonSafe(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Helper: Write JSON file
async function writeJson(filePath: string, data: any) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Helper: Rate limit check
async function canRequest(symbol: string, type: 'history' | 'fundamentals', minIntervalSec = 10) {
  const logPath = path.join(process.cwd(), 'data', 'request-log.json');
  const now = dayjs();
  let log = await readJsonSafe(logPath) || {};
  const last = log?.[symbol]?.[type];
  if (last && now.diff(dayjs(last), 'second') < minIntervalSec) {
    return false;
  }
  // Update log
  log[symbol] = log[symbol] || {};
  log[symbol][type] = now.toISOString();
  await writeJson(logPath, log);
  return true;
}

export async function getHistoricalPrices(symbol: string): Promise<PriceData[]> {
  const filePath = path.join(process.cwd(), 'data', 'stocks', `${symbol}.json`);
  let prices: PriceData[] = [];
  let fileExists = false;
  try {
    await fs.access(filePath);
    fileExists = true;
  } catch {}

  if (!fileExists) {
    // No file, fetch all data
    if (!(await canRequest(symbol, 'history'))) {
      console.log(`[${symbol}] Skipping history fetch due to rate limit.`);
      return [];
    }
    try {
      const result = await yahooFinance.historical(symbol, {
        period1: dayjs().subtract(5, 'year').format('YYYY-MM-DD'),
        period2: dayjs().format('YYYY-MM-DD'),
        interval: '1d',
      });
      prices = (result || []).map((d: any) => ({
        date: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));
      await writeJson(filePath, prices);
      console.log(`[${symbol}] Fetched and saved 5y history.`);
      return prices;
    } catch (err) {
      console.error(`[${symbol}] Error fetching history:`, err);
      return [];
    }
  } else {
    // File exists, check last date
    prices = (await readJsonSafe(filePath)) || [];
    if (!prices.length) return [];
    const lastDate = dayjs(prices[prices.length - 1].date);
    const today = dayjs().startOf('day');
    const yesterday = today.subtract(1, 'day');
    if (lastDate.isSame(today, 'day') || lastDate.isSame(yesterday, 'day')) {
      // Up to date
      return prices;
    } else {
      // Fetch missing days
      if (!(await canRequest(symbol, 'history'))) {
        console.log(`[${symbol}] Skipping incremental history fetch due to rate limit.`);
        return prices;
      }
      try {
        const fromDate = lastDate.add(1, 'day').format('YYYY-MM-DD');
        const result = await yahooFinance.historical(symbol, {
          period1: fromDate,
          period2: dayjs().format('YYYY-MM-DD'),
          interval: '1d',
        });
        const newPrices = (result || []).map((d: any) => ({
          date: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        }));
        const merged = [...prices, ...newPrices.filter(np => !prices.some(p => p.date === np.date))];
        await writeJson(filePath, merged);
        console.log(`[${symbol}] Appended ${newPrices.length} new days to history.`);
        return merged;
      } catch (err) {
        console.error(`[${symbol}] Error fetching incremental history:`, err);
        return prices;
      }
    }
  }
}

export async function getFundamentals(symbol: string): Promise<Fundamentals | null> {
  const filePath = path.join(process.cwd(), 'data', 'fundamentals', `${symbol}.json`);
  let fileExists = false;
  try {
    await fs.access(filePath);
    fileExists = true;
  } catch {}

  let fundamentals: Fundamentals | null = null;
  if (fileExists) {
    fundamentals = await readJsonSafe(filePath);
    if (fundamentals && fundamentals.updatedAt) {
      const updated = dayjs(fundamentals.updatedAt);
      if (dayjs().diff(updated, 'day') < 7) {
        // Not older than 7 days
        return fundamentals;
      }
    }
  }

  // Fetch new fundamentals
  if (!(await canRequest(symbol, 'fundamentals'))) {
    console.log(`[${symbol}] Skipping fundamentals fetch due to rate limit.`);
    return fundamentals;
  }
  try {
    const summary: any = await yahooFinance.quoteSummary(symbol, { 
      modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail'] 
    });
    const stats = summary?.defaultKeyStatistics || {};
    const fin = summary?.financialData || {};
    const detail = summary?.summaryDetail || {};

    fundamentals = {
      peRatio: fin?.trailingPE ?? stats?.trailingPE ?? null,
      pbRatio: stats?.priceToBook ?? null,
      evToEbitda: fin?.enterpriseToEbitda ?? null,
      roe: fin?.returnOnEquity ?? null,
      roa: fin?.returnOnAssets ?? null,
      debtToEquity: fin?.debtToEquity ?? null,
      debtToEbitda: fin?.totalDebt && fin?.ebitda ? (fin.totalDebt / fin.ebitda) : null,
      netMargin: fin?.profitMargins ?? null,
      freeCashFlow: fin?.freeCashflow ?? null,
      priceToFCF: fin?.freeCashflow && detail?.marketCap ? (detail.marketCap / fin.freeCashflow) : null,
      updatedAt: dayjs().toISOString(),
    };
    await writeJson(filePath, fundamentals);
    console.log(`[${symbol}] Fetched and saved fundamentals.`);
    return fundamentals;
  } catch (err) {
    console.error(`[${symbol}] Error fetching fundamentals:`, err);
    return fundamentals;
  }
} 