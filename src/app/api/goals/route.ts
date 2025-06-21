import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { UserData, InvestmentGoal } from '@/types';

const dataDir = path.join(process.cwd(), 'data', 'users');

async function getUserData(username: string): Promise<UserData | null> {
  const filePath = path.join(dataDir, `${username}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function saveUserData(username: string, data: UserData): Promise<void> {
  const filePath = path.join(dataDir, `${username}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ message: 'Username is required' }, { status: 400 });
  }

  const userData = await getUserData(username);

  if (!userData) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(userData.goals || []);
}

export async function POST(request: Request) {
  const { username, goal } = await request.json();

  if (!username || !goal) {
    return NextResponse.json({ message: 'Username and goal are required' }, { status: 400 });
  }

  const userData = await getUserData(username);

  if (!userData) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const newGoal: InvestmentGoal = { ...goal, id: Date.now().toString() };
  userData.goals = [...(userData.goals || []), newGoal];

  await saveUserData(username, userData);

  return NextResponse.json(newGoal, { status: 201 });
} 