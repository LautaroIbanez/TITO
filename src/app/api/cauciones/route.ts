import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const caucionesFile = path.join(process.cwd(), 'data', 'cauciones.json');
    const data = await fs.readFile(caucionesFile, 'utf-8');
    const cauciones = JSON.parse(data);
    
    return NextResponse.json(cauciones);
  } catch (error) {
    console.error('Failed to fetch cauciones data:', error);
    return NextResponse.json({ error: 'Failed to fetch cauciones data' }, { status: 500 });
  }
} 