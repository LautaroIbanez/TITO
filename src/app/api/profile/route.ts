import { NextResponse, NextRequest } from 'next/server';
import { getUserData, saveUserData } from '@/utils/userData';
import { UserData, InvestorProfile } from '@/types';

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

    if (profile.investmentSharePct < 0 || profile.investmentSharePct > 100) {
      return NextResponse.json(
        { error: 'Investment share percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    try {
      // Read existing user data
      const userData = await getUserData(username);
      
      if (!userData) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Update user data with profile and initial cash balances
      const updatedUserData: UserData = {
        ...userData,
        profileCompleted: true,
        profile,
        cash: {
          ARS: profile.initialBalanceARS || 0,
          USD: profile.initialBalanceUSD || 0,
        },
        transactions: userData.transactions ? [...userData.transactions] : [],
      };

      // Add Deposit transactions for initial balances if > 0
      const now = new Date().toISOString().slice(0, 10);
      if (profile.initialBalanceARS && profile.initialBalanceARS > 0) {
        updatedUserData.transactions.push({
          id: `deposit-ARS-initial`,
          date: now,
          type: 'Deposit',
          amount: profile.initialBalanceARS,
          currency: 'ARS',
        });
      }
      if (profile.initialBalanceUSD && profile.initialBalanceUSD > 0) {
        updatedUserData.transactions.push({
          id: `deposit-USD-initial`,
          date: now,
          type: 'Deposit',
          amount: profile.initialBalanceUSD,
          currency: 'USD',
        });
      }

      // Save updated user data
      await saveUserData(username, updatedUserData);

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