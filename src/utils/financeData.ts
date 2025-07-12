import yahooFinance from 'yahoo-finance2';
import dayjs from 'dayjs';
import { promises as fs } from 'fs';
import path from 'path';
import { PriceData, Fundamentals, Technicals } from '@/types/finance';
import {
  RSI,
  MACD,
  SMA,
  EMA,
  ADX,
} from 'technicalindicators';
import { getBaseTicker } from './tickers';

// KONCORDE indicator calculation (placeholder for manual configuration)
function calculateKoncordeIndicator(prices: number[], currentPrice: number) {
  if (prices.length < 20) return null;
  
  // Simple placeholder implementation - can be replaced with actual KONCORDE logic
  const recentPrices = prices.slice(-20);
  const avgPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
  const volatility = Math.sqrt(recentPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / recentPrices.length);
  
  // Determine trend based on price vs average and volatility
  const priceVsAvg = currentPrice / avgPrice;
  const strength = Math.min(100, Math.abs(priceVsAvg - 1) * 100);
  
  return {
    bullish: priceVsAvg > 1.02,
    bearish: priceVsAvg < 0.98,
    neutral: priceVsAvg >= 0.98 && priceVsAvg <= 1.02,
    strength: Math.round(strength)
  };
}

// Helper: Read JSON file safely
async function readJsonSafe<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
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
  const baseSymbol = getBaseTicker(symbol);
  const logPath = path.join(process.cwd(), 'data', 'request-log.json');
  const now = dayjs();
  const log = (await readJsonSafe<Record<string, any>>(logPath)) || {};
  const last = log?.[baseSymbol]?.[type];
  if (last && now.diff(dayjs(last), 'second') < minIntervalSec) {
    return false;
  }
  // Update log
  log[baseSymbol] = log[baseSymbol] || {};
  log[baseSymbol][type] = now.toISOString();
  await writeJson(logPath, log);
  return true;
}

export async function getHistoricalPrices(symbol: string, interval: '1d' | '1wk' = '1d'): Promise<PriceData[]> {
  const suffix = interval === '1d' ? '' : `.${interval}`;
  const filePath = path.join(process.cwd(), 'data', 'stocks', `${symbol}${suffix}.json`);
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
        interval,
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
      console.log(`[${symbol}] Fetched and saved 5y history (${interval}).`);
      return prices;
          } catch (err) {
        // Check if it's an unsupported symbol error
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('No data found') || 
            errorMessage.includes('Invalid symbol') || 
            errorMessage.includes('not found') ||
            errorMessage.includes('No data available')) {
          console.log(`Symbol ${symbol} not supported on Yahoo Finance`);
          return [];
        }
        console.error(`[${symbol}] Error fetching history (${interval}):`, err);
        // Return existing prices as fallback if available
        return prices;
      }
  } else {
    // File exists, check last date
    prices = (await readJsonSafe(filePath)) || [];
    if (!prices.length) return [];
    const lastDate = dayjs(prices[prices.length - 1].date);
    const today = dayjs().startOf('day');
    const yesterday = today.subtract(1, 'day');
    if (interval === '1d' && (lastDate.isSame(today, 'day') || lastDate.isSame(yesterday, 'day'))) {
      // Up to date for daily
      return prices;
    } else if (interval === '1wk' && lastDate.isAfter(today.subtract(7, 'day'))) {
      // Up to date for weekly
      return prices;
    } else {
      // Fetch missing days/weeks
      if (!(await canRequest(symbol, 'history'))) {
        console.log(`[${symbol}] Skipping incremental history fetch due to rate limit.`);
        return prices;
      }
      try {
        const fromDate = lastDate.add(interval === '1d' ? 1 : 7, 'day').format('YYYY-MM-DD');
        const result = await yahooFinance.historical(symbol, {
          period1: fromDate,
          period2: dayjs().format('YYYY-MM-DD'),
          interval,
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
        console.log(`[${symbol}] Appended ${newPrices.length} new ${interval === '1d' ? 'days' : 'weeks'} to history.`);
        return merged;
              } catch (err) {
          // Check if it's an unsupported symbol error
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (errorMessage.includes('No data found') || 
              errorMessage.includes('Invalid symbol') || 
              errorMessage.includes('not found') ||
              errorMessage.includes('No data available')) {
            console.log(`Symbol ${symbol} not supported on Yahoo Finance`);
            return prices;
          }
          console.error(`[${symbol}] Error fetching incremental history (${interval}):`, err);
          return prices;
        }
    }
  }
}

export async function getFundamentals(symbol: string): Promise<Fundamentals | null> {
  const baseSymbol = getBaseTicker(symbol);
  const filePath = path.join(process.cwd(), 'data', 'fundamentals', `${baseSymbol}.json`);
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
      if (dayjs().diff(updated, 'day') < 7) { // Revert to 7 days
        // Not older than 7 days
        return fundamentals;
      }
    }
  }

  // Fetch new fundamentals
  if (!(await canRequest(symbol, 'fundamentals'))) {
    console.log(`[${baseSymbol}] Skipping fundamentals fetch due to rate limit.`);
    return fundamentals;
  }
  try {
    const summary: any = await yahooFinance.quoteSummary(baseSymbol, { 
      modules: [
        'defaultKeyStatistics', 
        'financialData', 
        'summaryDetail',
        'incomeStatementHistory',
        'earningsTrend',
        'summaryProfile',
      ] 
    });
    const stats = summary?.defaultKeyStatistics || {};
    const fin = summary?.financialData || {};
    const detail = summary?.summaryDetail || {};
    const income = summary?.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
    const trend = summary?.earningsTrend?.trend?.[3] || {}; // 0=current q, 1=next q, 2=current year, 3=next year
    const profile = summary?.summaryProfile || {};

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
      ebitda: fin?.ebitda ?? income?.ebitda?.raw ?? null,
      revenueGrowth: fin?.revenueGrowth ?? null, // Quarterly
      epsGrowth: trend?.earningsEstimate?.growth?.raw ?? null, // Next year
      beta: stats?.beta ?? null,
      sector: profile?.sector ?? null,
      industry: profile?.industry ?? null,
      updatedAt: dayjs().toISOString(),
    };
    await writeJson(filePath, fundamentals);
    console.log(`[${baseSymbol}] Fetched and saved fundamentals.`);
    return fundamentals;
  } catch (err) {
    // Check if it's an unsupported symbol error
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('No data found') || 
        errorMessage.includes('Invalid symbol') || 
        errorMessage.includes('not found') ||
        errorMessage.includes('No data available')) {
      console.log(`Symbol ${baseSymbol} not supported on Yahoo Finance`);
      return fundamentals; // Return existing fundamentals as fallback
    }
    console.error(`[${baseSymbol}] Error fetching fundamentals:`, err);
    return fundamentals;
  }
}

export async function getTechnicals(symbol: string, interval: '1d' | '1wk' = '1d'): Promise<Technicals | null> {
  const suffix = interval === '1d' ? '' : `.${interval}`;
  const filePath = path.join(process.cwd(), 'data', 'technicals', `${symbol}${suffix}.json`);
  let technicals: Technicals | null = null;

  // Check for recent file first
  try {
    const fileContent = await readJsonSafe<Technicals>(filePath);
    if (
      fileContent &&
      typeof fileContent === 'object' &&
      'updatedAt' in fileContent &&
      dayjs().diff(dayjs(fileContent.updatedAt), interval === '1d' ? 'day' : 'week') < 1
    ) {
      return fileContent;
    }
  } catch {}

  // If not recent, calculate
  const prices = await getHistoricalPrices(symbol, interval);
  if (!prices || prices.length < 200) { // Need enough data for SMA 200
    console.log(`[${symbol}] Not enough price data to calculate technicals (${interval}).`);
    return null;
  }

  const closePrices = prices.map(p => p.close);
  const highPrices = prices.map(p => p.high);
  const lowPrices = prices.map(p => p.low);

  try {
    // RSI
    const rsiResult = RSI.calculate({ values: closePrices, period: 14 });
    // MACD
    const macdResult = MACD.calculate({
      values: closePrices,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    // SMA
    const sma200Result = SMA.calculate({ values: closePrices, period: 200 });
    const sma40Result = SMA.calculate({ values: closePrices, period: 40 });
    // EMA
    const ema12Result = EMA.calculate({ values: closePrices, period: 12 });
    const ema25Result = EMA.calculate({ values: closePrices, period: 25 });
    const ema26Result = EMA.calculate({ values: closePrices, period: 26 });
    const ema50Result = EMA.calculate({ values: closePrices, period: 50 });
    const ema150Result = EMA.calculate({ values: closePrices, period: 150 });
    // DMI / ADX
    const adxResult = ADX.calculate({
      close: closePrices,
      high: highPrices,
      low: lowPrices,
      period: 14,
    });

    const lastAdx = adxResult[adxResult.length - 1];

    // KONCORDE indicator (placeholder for manual configuration)
    const currentPrice = closePrices[closePrices.length - 1];
    const koncordeIndicator = calculateKoncordeIndicator(closePrices, currentPrice);

    technicals = {
      rsi: rsiResult[rsiResult.length - 1] || null,
      macd: macdResult[macdResult.length - 1]?.MACD || null,
      sma200: sma200Result[sma200Result.length - 1] || null,
      sma40: sma40Result[sma40Result.length - 1] || null,
      ema12: ema12Result[ema12Result.length - 1] || null,
      ema25: ema25Result[ema25Result.length - 1] || null,
      ema26: ema26Result[ema26Result.length - 1] || null,
      ema50: ema50Result[ema50Result.length - 1] || null,
      ema150: ema150Result[ema150Result.length - 1] || null,
      adx: lastAdx?.adx || null,
      pdi: lastAdx?.pdi || null,
      mdi: lastAdx?.mdi || null,
      koncorde: koncordeIndicator,
      updatedAt: dayjs().toISOString(),
    };

    await writeJson(filePath, technicals);
    console.log(`[${symbol}] Calculated and saved technicals (${interval}).`);
    return technicals;
  } catch (err) {
    // Check if it's an unsupported symbol error
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('No data found') || 
        errorMessage.includes('Invalid symbol') || 
        errorMessage.includes('not found') ||
        errorMessage.includes('No data available')) {
      console.log(`Symbol ${symbol} not supported on Yahoo Finance`);
      return null;
    }
    console.error(`[${symbol}] Error calculating technicals (${interval}):`, err);
    return null;
  }
}

export async function ensureStockData(symbol: string): Promise<boolean> {
  try {
    await getHistoricalPrices(symbol);
    await getFundamentals(symbol);
    await getTechnicals(symbol);
    return true;
  } catch (error) {
    console.error(`[${symbol}] Error ensuring stock data:`, error);
    return false;
  }
}

export async function ensureStocksData(symbols: string[]): Promise<boolean[]> {
  const results = await Promise.allSettled(
    symbols.map(symbol => ensureStockData(symbol))
  );
  
  return results.map(result => 
    result.status === 'fulfilled' ? result.value : false
  );
} 

 