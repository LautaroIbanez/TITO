import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const bondsPath = path.join(process.cwd(), 'data', 'bonds.json');
    
    if (!fs.existsSync(bondsPath)) {
      return NextResponse.json(
        { error: 'Bonds data not found. Run the scraper first.' },
        { status: 404 }
      );
    }

    const bondsData = fs.readFileSync(bondsPath, 'utf-8');
    const parsedData = JSON.parse(bondsData);

    return NextResponse.json(parsedData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error reading bonds data:', error);
    return NextResponse.json(
      { error: 'Failed to read bonds data' },
      { status: 500 }
    );
  }
} 