import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, InvestorProfile } from '@/types';

async function getUserData(username: string): Promise<UserData | null> {
  const userFilePath = path.join(process.cwd(), 'data', 'users', `${username}.json`);
  try {
    const fileContent = await fs.readFile(userFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const userData = await getUserData(username);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!userData.profile) {
      return NextResponse.json({ error: 'Profile not completed' }, { status: 404 });
    }
    return NextResponse.json(userData.profile);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { username, profile }: { username: string; profile: InvestorProfile & { initialBalanceARS?: number; initialBalanceUSD?: number; } } = await request.json();

    if (!username || !profile) {
      return NextResponse.json(
        { error: 'Username and profile data are required' },
        { status: 400 }
      );
    }

    // Validate profile data
    if (!profile.instrumentsUsed || profile.instrumentsUsed.length === 0) {
      return NextResponse.json(
        { error: 'At least one instrument must be selected' },
        { status: 400 }
      );
    }

    if (profile.investmentAmount <= 0) {
      return NextResponse.json(
        { error: 'Investment amount must be greater than 0' },
        { status: 400 }
      );
    }

    const userFilePath = path.join(process.cwd(), 'data', 'users', `${username}.json`);

    try {
      // Read existing user data
      const fileContent = await fs.readFile(userFilePath, 'utf-8');
      const userData: UserData = JSON.parse(fileContent);

      // Update user data with profile and initial cash balances
      const updatedUserData: UserData = {
        ...userData,
        profileCompleted: true,
        profile,
        cash: {
          ARS: profile.initialBalanceARS || 0,
          USD: profile.initialBalanceUSD || 0,
        },
      };

      // Save updated user data
      await fs.writeFile(userFilePath, JSON.stringify(updatedUserData, null, 2));

      return NextResponse.json(updatedUserData);
    } catch (error) {
      console.error('Error reading/writing user file:', error);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 