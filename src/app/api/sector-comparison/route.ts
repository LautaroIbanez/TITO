import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Fundamentals } from '@/types/finance';

// Helper: Read JSON file safely
async function readJsonSafe<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

// Helper: Calculate percentile rank of a value in an array
function calculatePercentileRank(values: number[], targetValue: number): number {
  if (values.length === 0) return 0;
  const sortedValues = [...values].sort((a, b) => a - b);
  const index = sortedValues.findIndex(val => val >= targetValue);
  if (index === -1) return 100; // Target value is higher than all values
  if (index === 0) return 0; // Target value is lower than all values
  return (index / values.length) * 100;
}

// Helper: Calculate the value at a given percentile (e.g., 20th, 80th)
function getPercentileValue(values: number[], percentile: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((percentile / 100) * (sorted.length - 1));
  return sorted[idx];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const sector = searchParams.get('sector');

  if (!symbol || !sector) {
    return NextResponse.json({ error: 'Symbol and sector are required' }, { status: 400 });
  }

  try {
    const fundamentalsDir = path.join(process.cwd(), 'data', 'fundamentals');
    const files = await fs.readdir(fundamentalsDir);
    const fundamentalsFiles = files.filter(file => file.endsWith('.json'));
    const sectorFundamentals: Fundamentals[] = [];
    for (const file of fundamentalsFiles) {
      const filePath = path.join(fundamentalsDir, file);
      const fundamental = await readJsonSafe<Fundamentals>(filePath);
      if (fundamental && fundamental.sector === sector) {
        sectorFundamentals.push(fundamental);
      }
    }
    if (sectorFundamentals.length === 0) {
      return NextResponse.json({ averages: {}, percentiles: {} });
    }
    const ratios = ['peRatio', 'pbRatio', 'evToEbitda', 'roe', 'roa', 'debtToEquity', 'debtToEbitda', 'netMargin', 'priceToFCF'] as const;
    const averages: Record<string, number | null> = {};
    const percentiles: Record<string, { p20: number | null; p80: number | null } | null> = {};
    // Get current stock fundamentals
    const currentStockPath = path.join(fundamentalsDir, `${symbol}.json`);
    const currentStockFundamentals = await readJsonSafe<Fundamentals>(currentStockPath);
    for (const ratio of ratios) {
      const validValues = sectorFundamentals
        .map(f => f[ratio])
        .filter((value): value is number => value !== null && !isNaN(value) && isFinite(value));
      if (validValues.length > 0) {
        averages[ratio] = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        percentiles[ratio] = {
          p20: getPercentileValue(validValues, 20),
          p80: getPercentileValue(validValues, 80),
        };
      } else {
        averages[ratio] = null;
        percentiles[ratio] = null;
      }
    }
    return NextResponse.json({ averages, percentiles });
  } catch (error) {
    console.error(`Error calculating sector ratios for ${symbol}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 