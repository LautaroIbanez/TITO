import { NextRequest, NextResponse } from 'next/server';
import { sellAsset } from '@/utils/portfolioActions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, assetType } = body;
    if (!username || !assetType) {
      return NextResponse.json({ error: 'Username and assetType are required' }, { status: 400 });
    }
    try {
      const result = await sellAsset(username, assetType, body);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Sell route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 