import { NextRequest, NextResponse } from 'next/server';
import { getUserData, saveUserData } from '@/utils/userData';
import { InvestmentStrategy } from '@/types';
import { generateInvestmentStrategy } from '@/utils/strategyAdvisor';
import NodeCache from 'node-cache';

// Cache for strategy data with 10-minute TTL
const strategyCache = new NodeCache({ stdTTL: 600 }); // 10 minutes

async function generateAndSaveStrategy(username: string): Promise<InvestmentStrategy> {
  const user = await getUserData(username);
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.profile) {
    throw new Error('User profile not completed');
  }

  const userCash = user.cash || { ARS: 0, USD: 0 };

  // Generate strategy
  const strategy = generateInvestmentStrategy({
    profile: user.profile,
    goals: user.goals || [],
    positions: user.positions || [],
    cash: userCash
  });

  // Save strategy to user data
  user.investmentStrategy = strategy;
  await saveUserData(username, user);

  return strategy;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `strategy_${username}`;
    const cachedStrategy = strategyCache.get<InvestmentStrategy>(cacheKey);
    if (cachedStrategy) {
      console.log(`[Strategy] Returning cached strategy for ${username}`);
      return NextResponse.json(cachedStrategy);
    }

    const strategy = await generateAndSaveStrategy(username);
    
    // Cache the result
    strategyCache.set(cacheKey, strategy);
    
    return NextResponse.json(strategy);
  } catch (error) {
    console.error('Strategy generation error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (error.message === 'User profile not completed') {
        return NextResponse.json({ error: 'User profile not completed' }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `strategy_${username}`;
    const cachedStrategy = strategyCache.get<InvestmentStrategy>(cacheKey);
    if (cachedStrategy) {
      console.log(`[Strategy] Returning cached strategy for ${username}`);
      return NextResponse.json(cachedStrategy);
    }

    const strategy = await generateAndSaveStrategy(username);
    
    // Cache the result
    strategyCache.set(cacheKey, strategy);
    
    return NextResponse.json(strategy);
  } catch (error) {
    console.error('Strategy generation error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (error.message === 'User profile not completed') {
        return NextResponse.json({ error: 'User profile not completed' }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 