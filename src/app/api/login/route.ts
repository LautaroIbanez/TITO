import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/utils/userData';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required and must be a string' },
        { status: 400 }
      );
    }

    try {
      const userData = await getOrCreateUser(username);
      return NextResponse.json(userData);
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 