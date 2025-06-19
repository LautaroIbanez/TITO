import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getHistoricalPrices, getFundamentals } from '@/utils/financeData';

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
      const [prices, fundamentals] = await Promise.all([
        getHistoricalPrices(symbol),
        getFundamentals(symbol),
      ]);
      return {
        symbol,
        prices,
        fundamentals,
      };
    })
  );

  return NextResponse.json(results);
} 