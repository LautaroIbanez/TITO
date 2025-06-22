import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import NodeCache from 'node-cache';
import { promises as fs } from 'fs';
import path from 'path';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutos

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
    // Fallback: leer archivo local
    try {
      const filePath = path.join(process.cwd(), 'data', 'stocks-list.json');
      const file = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(file);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'No se pudo obtener los trending stocks en vivo ni el archivo local.' }, { status: 500 });
    }
  }
} 