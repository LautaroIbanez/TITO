import { NextResponse } from 'next/server';
import { getUserData, saveUserData } from '@/utils/userData';
import { InvestmentGoal } from '@/types';

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

export async function PUT(request: Request) {
  const { username, goal: updatedGoal } = await request.json();

  if (!username || !updatedGoal || !updatedGoal.id) {
    return NextResponse.json({ message: 'Username and a complete goal object are required' }, { status: 400 });
  }

  const userData = await getUserData(username);

  if (!userData || !userData.goals) {
    return NextResponse.json({ message: 'User or goals not found' }, { status: 404 });
  }

  const goalIndex = userData.goals.findIndex(g => g.id === updatedGoal.id);

  if (goalIndex === -1) {
    return NextResponse.json({ message: 'Goal not found' }, { status: 404 });
  }

  userData.goals[goalIndex] = { ...userData.goals[goalIndex], ...updatedGoal };

  await saveUserData(username, userData);

  return NextResponse.json(userData.goals[goalIndex]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const goalId = searchParams.get('goalId');

  if (!username || !goalId) {
    return NextResponse.json({ message: 'Username and goalId are required' }, { status: 400 });
  }

  const userData = await getUserData(username);

  if (!userData || !userData.goals) {
    return NextResponse.json({ message: 'User or goals not found' }, { status: 404 });
  }

  const initialLength = userData.goals.length;
  userData.goals = userData.goals.filter(g => g.id !== goalId);

  if (userData.goals.length === initialLength) {
    return NextResponse.json({ message: 'Goal not found' }, { status: 404 });
  }

  await saveUserData(username, userData);

  return NextResponse.json({ message: 'Goal deleted successfully' }, { status: 200 });
} 