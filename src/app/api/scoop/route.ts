import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/utils/yahooFinance';
import NodeCache from 'node-cache';
import { promises as fs } from 'fs';
import path from 'path';
import { STOCK_CATEGORIES } from '@/utils/assetCategories';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutos

// Build a single ticker array from all category values
const getAllTickers = () => {
  const tickers = new Set<string>();
  Object.values(STOCK_CATEGORIES).forEach(category => {
    category.forEach(ticker => tickers.add(ticker));
  });
  return Array.from(tickers);
};

export async function GET(req: NextRequest) {
  const cacheKey = 'scoop-trending';
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    // Yahoo Finance trending symbols (US market)
    const trending = await yahooFinance.trendingSymbols('US');
    cache.set(cacheKey, trending);
    return NextResponse.json(trending);
  } catch (e) {
    // Fallback: usar la lista de categorías
    try {
      const data = getAllTickers();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'No se pudo obtener los trending stocks en vivo ni la lista local.' }, { status: 500 });
    }
  }
} 