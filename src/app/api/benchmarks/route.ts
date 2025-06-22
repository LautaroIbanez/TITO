import { NextResponse } from 'next/server';
import { DEFAULT_BENCHMARKS } from '@/utils/returnCalculator';
import dayjs from 'dayjs';
import path from 'path';
import { promises as fs } from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const benchmarksPath = path.join(process.cwd(), 'data', 'benchmarks.json');
  try {
    const fileContent = await fs.readFile(benchmarksPath, 'utf-8');
    const data = JSON.parse(fileContent);
    const fileDate = dayjs(data.timestamp);
    const oneWeekAgo = dayjs().subtract(1, 'week');
    if (fileDate.isBefore(oneWeekAgo)) {
      return NextResponse.json(DEFAULT_BENCHMARKS);
    }
    // Convert to flat Record<string, number>
    const result: Record<string, number> = {};
    for (const [name, benchmark] of Object.entries(data.benchmarks)) {
      result[name] = (benchmark as any).oneYearReturn;
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(DEFAULT_BENCHMARKS);
  }
} 