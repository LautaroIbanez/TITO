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
  const cacheKey = 'stock-list';
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    // Yahoo Finance no tiene un endpoint directo para "all symbols", pero podemos usar search con un filtro
    // Aquí, como ejemplo, devolvemos los símbolos del S&P 500
    const sp500 = await yahooFinance.search('S&P 500');
    const results = sp500.quotes || [];
    cache.set(cacheKey, results);
    return NextResponse.json(results);
  } catch (e) {
    // Fallback: usar la lista de categorías
    try {
      const data = getAllTickers();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'No se pudo obtener la lista en vivo ni la lista local.' }, { status: 500 });
    }
  }
} 