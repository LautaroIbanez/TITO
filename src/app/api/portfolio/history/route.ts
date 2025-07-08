import { NextRequest, NextResponse } from 'next/server';
import { loadPortfolioHistory } from '@/utils/portfolioHistory';
import { getUserData } from '@/utils/userData';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
    // Validate username before proceeding
    const user = await getUserData(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Load portfolio history for the user
    const history = await loadPortfolioHistory(username);

    return NextResponse.json({
      username,
      history,
      count: history.length
    });
  } catch (error) {
    console.error('Error in /api/portfolio/history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 