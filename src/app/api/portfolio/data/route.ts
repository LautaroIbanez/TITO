import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioData } from '@/utils/portfolioData';
import { getFundamentals, getHistoricalPrices, getTechnicals } from '@/utils/financeData';
import { getBaseTicker, ensureBaSuffix } from '@/utils/tickers';
import { getUserData } from '@/utils/userData';
import { calculateCurrentValueByCurrency } from '@/utils/calculatePortfolioValue';
import { calculateInvestedCapital } from '@/utils/investedCapital';
import { getLatestCumulativeNetGains } from '@/utils/netGainsCalculator';
import { appendDailyRecord, loadPortfolioHistory } from '@/utils/portfolioHistory';
import NodeCache from 'node-cache';

// Cache for portfolio data with 5-minute TTL
const portfolioCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
    // Check cache first
    const cacheKey = `portfolio_data_${username}`;
    const cachedData = portfolioCache.get(cacheKey);
    if (cachedData) {
      console.log(`[Portfolio Data] Returning cached data for ${username}`);
      return NextResponse.json(cachedData);
    }

    // Validate username before proceeding
    const user = await getUserData(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await getPortfolioData(username);
    
    const stockSymbols = data.positions
      .filter((pos: any) => pos.type === 'Stock')
      .map((pos: any) => {
        let symbol = getBaseTicker(pos.symbol);
        if (pos.market === 'BCBA') symbol = ensureBaSuffix(symbol);
        return symbol;
      });

    const historicalPrices: Record<string, any[]> = {};
    const fundamentals: Record<string, any> = {};
    const technicals: Record<string, any> = {};

    // Build a map of base tickers to avoid duplicate fundamentals calls
    const baseTickerMap = new Map<string, string[]>();
    stockSymbols.forEach(symbol => {
      const baseTicker = getBaseTicker(symbol);
      if (!baseTickerMap.has(baseTicker)) {
        baseTickerMap.set(baseTicker, []);
      }
      baseTickerMap.get(baseTicker)!.push(symbol);
    });

    // Load fundamentals once per base ticker
    const fundamentalsCache = new Map<string, any>();
    await Promise.all(
      Array.from(baseTickerMap.keys()).map(async (baseTicker) => {
        const fund = await getFundamentals(baseTicker);
        fundamentalsCache.set(baseTicker, fund);
      })
    );

    // Load all data with optimized fundamentals
    await Promise.all(stockSymbols.map(async (symbol: string, idx: number) => {
      const baseTicker = getBaseTicker(symbol);
      const [prices, tech] = await Promise.all([
        getHistoricalPrices(symbol),
        getTechnicals(symbol)
      ]);
      
      historicalPrices[symbol] = prices;
      fundamentals[symbol] = fundamentalsCache.get(baseTicker);
      technicals[symbol] = tech;
    }));

    // Compute portfolio metrics for daily record with loaded price history
    const { ARS, USD } = calculateCurrentValueByCurrency(data.positions, data.cash, historicalPrices);
    const investedARS = calculateInvestedCapital(data.transactions, 'ARS');
    const investedUSD = calculateInvestedCapital(data.transactions, 'USD');
    
    // Create today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Create the daily record
    const dailyRecord = {
      fecha: today,
      total_portfolio_ars: ARS,
      total_portfolio_usd: USD,
      capital_invertido_ars: investedARS,
      capital_invertido_usd: investedUSD,
      ganancias_netas_ars: 0, // Will be calculated by recalculateNetGains
      ganancias_netas_usd: 0, // Will be calculated by recalculateNetGains
      efectivo_disponible_ars: data.cash.ARS,
      efectivo_disponible_usd: data.cash.USD,
    };
    
    // Load existing history to calculate cumulative gains
    const existingHistory = await loadPortfolioHistory(username);
    const updatedHistory = [...existingHistory, dailyRecord];
    const { cumulativeARS, cumulativeUSD } = getLatestCumulativeNetGains(updatedHistory);
    
    // Update the record with calculated cumulative gains
    dailyRecord.ganancias_netas_ars = cumulativeARS;
    dailyRecord.ganancias_netas_usd = cumulativeUSD;
    
    // Append daily record to user's history
    appendDailyRecord(username, dailyRecord);

    const responseData = {
      ...data,
      historicalPrices,
      fundamentals,
      technicals,
    };

    // Cache the result
    portfolioCache.set(cacheKey, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.error('Error in /api/portfolio/data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 