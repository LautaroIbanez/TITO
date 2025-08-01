import { promises as fs } from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { PriceData, Technicals } from '@/types/finance';
import {
  RSI,
  MACD,
  SMA,
  EMA,
  ADX,
} from 'technicalindicators';

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
async function writeJson(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Helper: Rate limit check for crypto
async function canRequestCrypto(symbol: string, type: 'history' | 'technicals', minIntervalSec = 5) {
  const logPath = path.join(process.cwd(), 'data', 'request-log.json');
  const now = dayjs();
  const log = (await readJsonSafe<Record<string, any>>(logPath)) || {};
  const last = log?.[`crypto-${symbol}`]?.[type];
  if (last && now.diff(dayjs(last), 'second') < minIntervalSec) {
    return false;
  }
  // Update log
  log[`crypto-${symbol}`] = log[`crypto-${symbol}`] || {};
  log[`crypto-${symbol}`][type] = now.toISOString();
  await writeJson(logPath, log);
  return true;
}

// Helper: Convert Binance kline to PriceData format
function binanceKlineToPriceData(kline: unknown): PriceData {
  const arr = kline as [number, string, string, string, string, string];
  return {
    date: new Date(arr[0]).toISOString().split('T')[0], // Convert timestamp to date string
    open: parseFloat(arr[1]),
    high: parseFloat(arr[2]),
    low: parseFloat(arr[3]),
    close: parseFloat(arr[4]),
    volume: parseFloat(arr[5]),
  };
}

// Helper: Fetch data from Binance API
async function fetchBinanceData(symbol: string, interval: string, limit: number = 1000): Promise<unknown[][]> {
  const baseUrl = 'https://api.binance.com/api/v3/klines';
  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval,
    limit: limit.toString(),
  });
  
  const response = await fetch(`${baseUrl}?${params}`);
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data as unknown[][];
}

export async function getCryptoPrices(symbol: string, interval: '1d' | '1wk' = '1d'): Promise<PriceData[]> {
  // Map our intervals to Binance intervals
  const binanceInterval = interval === '1d' ? '1d' : '1w';
  const suffix = interval === '1d' ? '' : `.${interval}`;
  const filePath = path.join(process.cwd(), 'data', 'crypto', `${symbol}${suffix}.json`);
  
  let prices: PriceData[] = [];
  let fileExists = false;
  
  try {
    await fs.access(filePath);
    fileExists = true;
  } catch {}

  if (!fileExists) {
    // No file, fetch all data
    if (!(await canRequestCrypto(symbol, 'history'))) {
      console.log(`[${symbol}] Skipping crypto history fetch due to rate limit.`);
      return [];
    }
    
    try {
      // Fetch 5 years of data (approximately 1825 days for daily, 260 weeks for weekly)
      const limit = interval === '1d' ? 1825 : 260;
      const data = await fetchBinanceData(symbol, binanceInterval, limit);
      
      prices = data.map(binanceKlineToPriceData);
      await writeJson(filePath, prices);
      console.log(`[${symbol}] Fetched and saved crypto history (${interval}).`);
      return prices;
    } catch (err) {
      console.error(`[${symbol}] Error fetching crypto history (${interval}):`, err);
      return [];
    }
  } else {
    // File exists, check last date
    prices = (await readJsonSafe<PriceData[]>(filePath)) || [];
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
      // Fetch missing data
      if (!(await canRequestCrypto(symbol, 'history'))) {
        console.log(`[${symbol}] Skipping incremental crypto history fetch due to rate limit.`);
        return prices;
      }
      
      try {
        // Fetch recent data to append
        const recentData = await fetchBinanceData(symbol, binanceInterval, 100);
        const newPrices = recentData.map(binanceKlineToPriceData);
        
        // Merge and remove duplicates
        const merged = [...prices, ...newPrices.filter((np: PriceData) => !prices.some(p => p.date === np.date))];
        await writeJson(filePath, merged);
        console.log(`[${symbol}] Appended ${newPrices.length} new crypto ${interval === '1d' ? 'days' : 'weeks'}.`);
        return merged;
      } catch (err) {
        console.error(`[${symbol}] Error fetching incremental crypto history (${interval}):`, err);
        return prices;
      }
    }
  }
}

export async function getCryptoTechnicals(symbol: string, interval: '1d' | '1wk' = '1d'): Promise<Technicals | null> {
  const suffix = interval === '1d' ? '' : `.${interval}`;
  const filePath = path.join(process.cwd(), 'data', 'crypto-technicals', `${symbol}${suffix}.json`);
  let technicals: Technicals | null = null;

  // Check for recent file first
  try {
    const fileContent = await readJsonSafe<Technicals & { updatedAt: string }>(filePath);
    if (fileContent && dayjs().diff(dayjs(fileContent.updatedAt), interval === '1d' ? 'day' : 'week') < 1) {
      return fileContent;
    }
  } catch {}

  // If not recent, calculate
  const prices = await getCryptoPrices(symbol, interval);
  if (!prices || prices.length < 200) { // Need enough data for SMA 200
    console.log(`[${symbol}] Not enough crypto price data to calculate technicals (${interval}).`);
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
    console.log(`[${symbol}] Calculated and saved crypto technicals (${interval}).`);
    return technicals;
  } catch (err) {
    console.error(`[${symbol}] Error calculating crypto technicals (${interval}):`, err);
    return null;
  }
}

// Helper function to get current crypto price
export async function getCurrentCryptoPrice(symbol: string): Promise<number | null> {
  try {
    const prices = await getCryptoPrices(symbol, '1d');
    if (prices && prices.length > 0) {
      return prices[prices.length - 1].close;
    }
    return null;
  } catch (err) {
    console.error(`[${symbol}] Error getting current crypto price:`, err);
    return null;
  }
} 