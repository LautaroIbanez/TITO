import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import NodeCache from 'node-cache';
import { getFundamentals, getTechnicals, getHistoricalPrices } from '@/utils/financeData';

export const dynamic = 'force-dynamic';

const cache = new NodeCache({ stdTTL: 600 }); // 10-minute cache

export async function GET(req: NextRequest, context: { params: { symbol: string } }) {
  const symbol = context.params.symbol;
  const dataType = req.nextUrl.searchParams.get('type');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    switch (dataType) {
      case 'fundamentals':
        const fundamentals = await getFundamentals(symbol);
        return NextResponse.json(fundamentals);
      
      case 'technicals':
        const technicals = await getTechnicals(symbol);
        return NextResponse.json(technicals);

      case 'prices':
        const prices = await getHistoricalPrices(symbol);
        return NextResponse.json(prices);

      default:
        // Default behavior: get full quote summary
        const cacheKey = `stock-quote-${symbol}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          return NextResponse.json(cachedData);
        }

        const quote = await yahooFinance.quote(symbol);
        if (!quote) {
          return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
        }
        
        cache.set(cacheKey, quote);
        return NextResponse.json(quote);
    }
  } catch (error) {
    console.error(`Error fetching data for ${symbol} (type: ${dataType}):`, error);
    // The error from yahoo-finance might have a specific message
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 