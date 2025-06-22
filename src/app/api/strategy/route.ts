import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, InvestmentStrategy } from '@/types';
import { generateInvestmentStrategy } from '@/utils/strategyAdvisor';

async function getUserData(username: string): Promise<UserData | null> {
  const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  try {
    const data = await fs.readFile(userFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function generateAndSaveStrategy(username: string): Promise<InvestmentStrategy> {
  const user = await getUserData(username);
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.profile) {
    throw new Error('User profile not completed');
  }

  // Generate strategy
  const strategy = generateInvestmentStrategy({
    profile: user.profile,
    goals: user.goals || [],
    positions: user.positions || [],
    availableCash: user.availableCash || 0
  });

  // Save strategy to user data
  user.investmentStrategy = strategy;
  await fs.writeFile(path.join(process.cwd(), 'data', 'users', `${username}.json`), JSON.stringify(user, null, 2));

  return strategy;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const strategy = await generateAndSaveStrategy(username);
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

    const strategy = await generateAndSaveStrategy(username);
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