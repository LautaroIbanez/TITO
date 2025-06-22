import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import NodeCache from 'node-cache';
import { promises as fs } from 'fs';
import path from 'path';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutos

export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  const { symbol } = params;
  const cacheKey = `stock-${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const quote = await yahooFinance.quote(symbol);
    cache.set(cacheKey, quote);
    return NextResponse.json(quote);
  } catch (e) {
    // Fallback: leer archivo local
    try {
      const filePath = path.join(process.cwd(), 'data', 'stocks', `${symbol}.json`);
      const file = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(file);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: 'No se pudo obtener el precio en vivo ni el archivo local.' }, { status: 500 });
    }
  }
} 