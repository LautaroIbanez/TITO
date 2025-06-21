import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

const depositsDataPath = path.join(process.cwd(), 'data', 'deposits.json');

export async function GET() {
  try {
    const fileContents = await fs.readFile(depositsDataPath, 'utf8');
    const deposits = JSON.parse(fileContents);
    return NextResponse.json(deposits);
  } catch (error) {
    console.error('Failed to read deposits data:', error);
    return NextResponse.json({ message: 'Error reading deposits data file.' }, { status: 500 });
  }
} 