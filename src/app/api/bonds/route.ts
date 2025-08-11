import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const BONDS_FILE = path.join(process.cwd(), 'data', 'bonds.json');

interface Bond {
  type: string;
  currency: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const data = await fs.readFile(BONDS_FILE, 'utf-8');
    const bonds = JSON.parse(data) as Bond[];
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const currency = searchParams.get('currency');
    
    let filteredBonds = bonds;
    
    // Filter by type if specified
    if (type) {
      filteredBonds = filteredBonds.filter((bond: Bond) => bond.type === type);
    }
    
    // Filter by currency if specified
    if (currency) {
      filteredBonds = filteredBonds.filter((bond: Bond) => bond.currency === currency);
    }
    
    return NextResponse.json(filteredBonds);
  } catch {
    console.error('Error loading bonds data');
    return NextResponse.json(
      { error: 'Error al cargar datos de bonos' },
      { status: 500 }
    );
  }
} 