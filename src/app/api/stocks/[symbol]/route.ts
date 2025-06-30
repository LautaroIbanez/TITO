import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import NodeCache from 'node-cache';
import { promises as fs } from 'fs';
import path from 'path';
import { getFundamentals, getTechnicals, getHistoricalPrices } from '@/utils/financeData';
import { getBaseTicker } from '@/utils/tickers';

export const dynamic = 'force-dynamic';

const cache = new NodeCache({ stdTTL: 600 }); // 10-minute cache

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const dataType = req.nextUrl.searchParams.get('type');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    switch (dataType) {
      case 'fundamentals':
        const fundamentals = await getFundamentals(getBaseTicker(symbol));
        if (fundamentals === null) {
          return NextResponse.json({ error: `Symbol ${symbol} not supported on Yahoo Finance` }, { status: 404 });
        }
        return NextResponse.json(fundamentals);
      
      case 'technicals':
        const technicals = await getTechnicals(symbol);
        if (technicals === null) {
          return NextResponse.json({ error: `Symbol ${symbol} not supported on Yahoo Finance` }, { status: 404 });
        }
        return NextResponse.json(technicals);

      case 'prices':
        const prices = await getHistoricalPrices(symbol);
        if (prices.length === 0) {
          return NextResponse.json({ error: `Symbol ${symbol} not supported on Yahoo Finance` }, { status: 404 });
        }
        return NextResponse.json(prices);

      default:
        // Default behavior: get full quote summary
        const cacheKey = `stock-quote-${symbol}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          return NextResponse.json(cachedData);
        }

        try {
          const quote = await yahooFinance.quote(symbol);
          if (!quote) {
            return NextResponse.json({ error: `Symbol ${symbol} not supported on Yahoo Finance` }, { status: 404 });
          }
          
          cache.set(cacheKey, quote);
          return NextResponse.json(quote);
        } catch (quoteError) {
          const errorMessage = quoteError instanceof Error ? quoteError.message : String(quoteError);
          if (errorMessage.includes('No data found') || 
              errorMessage.includes('Invalid symbol') || 
              errorMessage.includes('not found') ||
              errorMessage.includes('No data available')) {
            return NextResponse.json({ error: `Symbol ${symbol} not supported on Yahoo Finance` }, { status: 404 });
          }
          throw quoteError;
        }
    }
  } catch (error) {
    console.error(`Error fetching data for ${symbol} (type: ${dataType}):`, error);
    // The error from yahoo-finance might have a specific message
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 