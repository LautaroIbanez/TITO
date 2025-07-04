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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const sector = searchParams.get('sector');

  if (!symbol || !sector) {
    return NextResponse.json({ error: 'Symbol and sector are required' }, { status: 400 });
  }

  try {
    const fundamentalsDir = path.join(process.cwd(), 'data', 'fundamentals');
    
    // Read all fundamentals files
    const files = await fs.readdir(fundamentalsDir);
    const fundamentalsFiles = files.filter(file => file.endsWith('.json'));
    
    const sectorFundamentals: Fundamentals[] = [];
    
    // Read all fundamentals and filter by sector
    for (const file of fundamentalsFiles) {
      const filePath = path.join(fundamentalsDir, file);
      const fundamental = await readJsonSafe<Fundamentals>(filePath);
      
      if (fundamental && fundamental.sector === sector) {
        sectorFundamentals.push(fundamental);
      }
    }
    
    if (sectorFundamentals.length === 0) {
      return NextResponse.json({ averages: {} });
    }
    
    // Calculate averages for each ratio
    const ratios = ['peRatio', 'pbRatio', 'evToEbitda', 'roe', 'roa', 'debtToEquity', 'debtToEbitda', 'netMargin', 'priceToFCF'] as const;
    const averages: Record<string, number | null> = {};
    
    for (const ratio of ratios) {
      const validValues = sectorFundamentals
        .map(f => f[ratio])
        .filter((value): value is number => value !== null && !isNaN(value) && isFinite(value));
      
      if (validValues.length > 0) {
        averages[ratio] = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
      } else {
        averages[ratio] = null;
      }
    }
    
    return NextResponse.json({ averages });
  } catch (error) {
    console.error(`Error calculating sector ratios for ${symbol}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 