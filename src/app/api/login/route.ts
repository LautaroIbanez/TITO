import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData } from '@/types';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate username length
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    // Sanitize username to prevent path traversal attacks
    // Only allow alphanumeric characters, hyphens, and underscores
    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    
    if (sanitizedUsername !== username.toLowerCase() || sanitizedUsername.length === 0) {
      return NextResponse.json(
        { error: 'Invalid username format. Only letters, numbers, hyphens, and underscores are allowed.' },
        { status: 400 }
      );
    }

    // Ensure data directory exists and is within the expected path
    const dataDir = path.resolve(process.cwd(), 'data', 'users');
    const expectedPrefix = path.resolve(process.cwd(), 'data');
    
    if (!dataDir.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: 'Invalid data directory path' },
        { status: 500 }
      );
    }

    await fs.mkdir(dataDir, { recursive: true });

    const userFilePath = path.join(dataDir, `${sanitizedUsername}.json`);
    
    // Verify the constructed path is still within the data directory
    if (!path.resolve(userFilePath).startsWith(dataDir)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 500 }
      );
    }

    let userData: UserData;

    try {
      // Try to read existing user data
      const fileContent = await fs.readFile(userFilePath, 'utf-8');
      userData = JSON.parse(fileContent);
    } catch (error) {
      // If file doesn't exist, create new user data
      userData = {
        username: sanitizedUsername,
        createdAt: new Date().toISOString(),
        profileCompleted: false,
        positions: [],
        transactions: [],
        goals: [],
        cash: { ARS: 0, USD: 0 }
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