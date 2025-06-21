import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

const bondsDataPath = path.join(process.cwd(), 'data', 'bonds.json');

export async function GET() {
  try {
    const fileContents = await fs.readFile(bondsDataPath, 'utf8');
    const bonds = JSON.parse(fileContents);
    return NextResponse.json(bonds);
  } catch (error) {
    console.error('Failed to read bonds data:', error);
    return NextResponse.json({ message: 'Error reading bonds data file.' }, { status: 500 });
  }
} 