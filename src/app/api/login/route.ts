import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData } from '@/types';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data', 'users');
    await fs.mkdir(dataDir, { recursive: true });

    const userFilePath = path.join(dataDir, `${username}.json`);
    let userData: UserData;

    try {
      // Try to read existing user data
      const fileContent = await fs.readFile(userFilePath, 'utf-8');
      userData = JSON.parse(fileContent);
    } catch (error) {
      // If file doesn't exist, create new user data
      userData = {
        username,
        createdAt: new Date().toISOString(),
        profileCompleted: false,
        positions: [],
        transactions: []
      };

      // Save the new user data
      await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 