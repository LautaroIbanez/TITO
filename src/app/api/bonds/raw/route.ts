import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const BONDS_FILE = path.join(process.cwd(), 'data', 'bonds.json');

export async function GET() {
  try {
    const data = await fs.readFile(BONDS_FILE, 'utf-8');
    const bonds = JSON.parse(data);
    return NextResponse.json(bonds);
  } catch (error) {
    console.error('Error loading bonds data:', error);
    return NextResponse.json(
      { error: 'Error al cargar datos de bonos' },
      { status: 500 }
    );
  }
} 