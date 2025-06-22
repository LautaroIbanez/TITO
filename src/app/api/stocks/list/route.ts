import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import NodeCache from 'node-cache';
import { promises as fs } from 'fs';
import path from 'path';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutos

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
    // Fallback: leer archivo local
    try {
      const filePath = path.join(process.cwd(), 'data', 'stocks-list.json');
      const file = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(file);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'No se pudo obtener la lista en vivo ni el archivo local.' }, { status: 500 });
    }
  }
} 