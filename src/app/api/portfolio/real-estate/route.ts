import { NextRequest, NextResponse } from 'next/server';
import { getUserData, saveUserData } from '@/utils/userData';
import { RealEstatePosition, RealEstateTransaction } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const userData = await getUserData(username);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const realEstatePositions = userData.positions.filter(
      (pos): pos is RealEstatePosition => pos.type === 'RealEstate'
    );

    return NextResponse.json({ positions: realEstatePositions });
  } catch (error) {
    console.error('Error fetching real estate positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real estate positions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, name, amount, annualRate, currency } = await request.json();

    if (!username || !name || !amount || annualRate === undefined || !currency) {
      return NextResponse.json(
        { error: 'Username, name, amount, annualRate, and currency are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (annualRate < 0 || annualRate > 100) {
      return NextResponse.json(
        { error: 'Annual rate must be between 0 and 100' },
        { status: 400 }
      );
    }

    const userData = await getUserData(username);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const positionId = `re-${Date.now()}`;
    const newPosition: RealEstatePosition = {
      type: 'RealEstate',
      id: positionId,
      name,
      amount,
      annualRate,
      currency,
    };

    const newTransaction: RealEstateTransaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: 'Create',
      assetType: 'RealEstate',
      name,
      amount,
      annualRate,
      currency,
    };

    // Add position and transaction
    userData.positions.push(newPosition);
    userData.transactions.push(newTransaction);

    await saveUserData(username, userData);

    return NextResponse.json({ 
      success: true, 
      position: newPosition,
      message: 'Real estate position created successfully' 
    });
  } catch (error) {
    console.error('Error creating real estate position:', error);
    return NextResponse.json(
      { error: 'Failed to create real estate position' },
      { status: 500 }
    );
  }
} 