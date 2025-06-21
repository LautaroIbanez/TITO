import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioData } from '@/utils/portfolioData';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
    const data = await getPortfolioData(username);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Generic server error for other cases
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 