import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioData } from '@/utils/portfolioData';
import { getFundamentals, getHistoricalPrices, getTechnicals } from '@/utils/financeData';
import { getBaseTicker, ensureBaSuffix } from '@/utils/tickers';
import { getUserData } from '@/utils/userData';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
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

    return NextResponse.json({
      ...data,
      historicalPrices,
      fundamentals,
      technicals,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.error('Error in /api/portfolio/data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 