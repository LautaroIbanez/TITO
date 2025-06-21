import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getHistoricalPrices, getFundamentals, getTechnicals } from '@/utils/financeData';

export async function GET() {
  const listPath = path.join(process.cwd(), 'data', 'stocks-list.json');
  let symbols: string[] = [];
  try {
    const data = await fs.readFile(listPath, 'utf-8');
    symbols = JSON.parse(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const [prices, fundamentals, technicals] = await Promise.all([
        getHistoricalPrices(symbol),
        getFundamentals(symbol),
        getTechnicals(symbol),
      ]);
      return {
        symbol,
        prices,
        fundamentals,
        technicals,
      };
    })
  );

  return NextResponse.json(results);
} 