import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData, InvestorProfile } from '@/types';

export async function POST(request: Request) {
  try {
    const { username, profile }: { username: string; profile: InvestorProfile } = await request.json();

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

      // Update user data with profile
      const updatedUserData: UserData = {
        ...userData,
        profileCompleted: true,
        profile,
        availableCash: profile.investmentAmount,
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