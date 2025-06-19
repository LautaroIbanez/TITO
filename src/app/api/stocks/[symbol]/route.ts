import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  const { symbol } = params;
  const baseDir = process.cwd();

  async function readJsonSafe(filePath: string) {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  const prices = await readJsonSafe(path.join(baseDir, 'data', 'stocks', `${symbol}.json`));
  const fundamentals = await readJsonSafe(path.join(baseDir, 'data', 'fundamentals', `${symbol}.json`));
  const technicals = await readJsonSafe(path.join(baseDir, 'data', 'technicals', `${symbol}.json`));

  return NextResponse.json({
    symbol,
    prices,
    fundamentals,
    technicals,
  });
} 