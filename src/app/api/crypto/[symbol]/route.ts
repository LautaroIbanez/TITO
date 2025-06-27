import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { getCryptoPrices, getCryptoTechnicals } from '@/utils/cryptoData';

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
      case 'prices': {
        const cacheKey = `crypto-prices-${symbol}`;
        const cached = cache.get(cacheKey);
        if (cached) return NextResponse.json(cached);
        const prices = await getCryptoPrices(symbol);
        cache.set(cacheKey, prices);
        return NextResponse.json(prices);
      }
      case 'technicals': {
        const cacheKey = `crypto-technicals-${symbol}`;
        const cached = cache.get(cacheKey);
        if (cached) return NextResponse.json(cached);
        const technicals = await getCryptoTechnicals(symbol);
        cache.set(cacheKey, technicals);
        return NextResponse.json(technicals);
      }
      default:
        return NextResponse.json({ error: 'Invalid or missing type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error fetching crypto data for ${symbol} (type: ${dataType}):`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 