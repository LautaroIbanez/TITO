import { NextRequest, NextResponse } from 'next/server';
import { getUserData, saveUserData } from '@/utils/userData';
import { RealEstatePosition, RealEstateTransaction } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { username, name, amount, annualRate, currency } = await request.json();
    const positionId = params.id;

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

    const positionIndex = userData.positions.findIndex(
      (pos): pos is RealEstatePosition => pos.type === 'RealEstate' && pos.id === positionId
    );

    if (positionIndex === -1) {
      return NextResponse.json({ error: 'Real estate position not found' }, { status: 404 });
    }

    // Update the position
    const updatedPosition: RealEstatePosition = {
      type: 'RealEstate',
      id: positionId,
      name,
      amount,
      annualRate,
      currency,
    };

    userData.positions[positionIndex] = updatedPosition;

    // Add update transaction
    const updateTransaction: RealEstateTransaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: 'Update',
      assetType: 'RealEstate',
      name,
      amount,
      annualRate,
      currency,
    };

    userData.transactions.push(updateTransaction);

    await saveUserData(username, userData);

    return NextResponse.json({
      success: true,
      position: updatedPosition,
      message: 'Real estate position updated successfully'
    });
  } catch (error) {
    console.error('Error updating real estate position:', error);
    return NextResponse.json(
      { error: 'Failed to update real estate position' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const positionId = params.id;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const userData = await getUserData(username);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const positionIndex = userData.positions.findIndex(
      (pos): pos is RealEstatePosition => pos.type === 'RealEstate' && pos.id === positionId
    );

    if (positionIndex === -1) {
      return NextResponse.json({ error: 'Real estate position not found' }, { status: 404 });
    }

    const deletedPosition = userData.positions[positionIndex] as RealEstatePosition;

    // Remove the position
    userData.positions.splice(positionIndex, 1);

    // Add delete transaction
    const deleteTransaction: RealEstateTransaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: 'Delete',
      assetType: 'RealEstate',
      name: deletedPosition.name,
      amount: deletedPosition.amount,
      annualRate: deletedPosition.annualRate,
      currency: deletedPosition.currency,
    };

    userData.transactions.push(deleteTransaction);

    await saveUserData(username, userData);

    return NextResponse.json({
      success: true,
      message: 'Real estate position deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting real estate position:', error);
    return NextResponse.json(
      { error: 'Failed to delete real estate position' },
      { status: 500 }
    );
  }
} 