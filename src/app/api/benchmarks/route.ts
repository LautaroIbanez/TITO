import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const BENCHMARKS_FILE = path.join(process.cwd(), 'data', 'benchmarks.json');

export async function GET(request: NextRequest) {
  try {
    const data = await fs.readFile(BENCHMARKS_FILE, 'utf-8');
    const benchmarks = JSON.parse(data);
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    let filteredBenchmarks = benchmarks;
    
    // Filter by type if specified
    if (type) {
      filteredBenchmarks = filteredBenchmarks.filter((benchmark: { type: string }) => benchmark.type === type);
    }
    
    return NextResponse.json(filteredBenchmarks);
  } catch {
    console.error('Error loading benchmarks data');
    return NextResponse.json(
      { error: 'Error al cargar datos de benchmarks' },
      { status: 500 }
    );
  }
} 