import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioData } from '@/utils/portfolioData';
import yahooFinance from 'yahoo-finance2';
import NodeCache from 'node-cache';
import { promises as fs } from 'fs';
import path from 'path';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutos

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
    // Primero obtenemos los datos base del usuario (posiciones, transacciones, etc)
    const data = await getPortfolioData(username);
    // Para cada acción, intentamos obtener el precio en vivo y cachearlo
    const stockSymbols = data.positions.filter((pos: any) => pos.type === 'Stock').map((pos: any) => pos.symbol);
    const historicalPrices: Record<string, any[]> = {};
    for (const symbol of stockSymbols) {
      const cacheKey = `stock-${symbol}`;
      let prices: any[] = [];
      const cachedPrices = cache.get(cacheKey);

      if (Array.isArray(cachedPrices)) {
        prices = cachedPrices;
      } else {
        try {
          // Yahoo Finance historical prices (últimos 90 días)
          const livePrices = await yahooFinance.historical(symbol, { period1: '90d' });
          prices = livePrices;
          cache.set(cacheKey, prices);
        } catch {
          // Fallback: leer archivo local
          try {
            const filePath = path.join(process.cwd(), 'data', 'stocks', `${symbol}.json`);
            const file = await fs.readFile(filePath, 'utf-8');
            prices = JSON.parse(file);
          } catch {
            prices = [];
          }
        }
      }
      historicalPrices[symbol] = prices;
    }
    // Devuelve el resto de los datos como antes, pero con precios actualizados
    return NextResponse.json({
      ...data,
      historicalPrices,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Generic server error for other cases
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 