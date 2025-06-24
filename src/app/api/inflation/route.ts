import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'inflation.json');
    const inflationData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    return NextResponse.json(inflationData);
  } catch (error) {
    console.error('Error reading inflation data:', error);
    return NextResponse.json(
      { error: 'Failed to load inflation data' },
      { status: 500 }
    );
  }
} 