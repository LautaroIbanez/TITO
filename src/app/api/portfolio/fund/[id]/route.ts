import { NextRequest, NextResponse } from 'next/server';
import { getUserData } from '@/utils/userData';
import { loadUserData, saveUserData } from '@/utils/userData';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  if (!params.id) {
    return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
  }

  try {
    // Validate user exists
    const user = await getUserData(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find and remove the mutual fund transaction
    const transactionIndex = user.transactions.findIndex(tx => 
      tx.id === params.id && 
      tx.type === 'Create' && 
      tx.assetType === 'MutualFund'
    );

    if (transactionIndex === -1) {
      return NextResponse.json({ error: 'Mutual fund transaction not found' }, { status: 404 });
    }

    // Remove the transaction
    user.transactions.splice(transactionIndex, 1);

    // Also remove the corresponding position if it exists
    const positionIndex = user.positions.findIndex(pos => 
      pos.type === 'MutualFund' && 
      pos.id === params.id
    );

    if (positionIndex !== -1) {
      user.positions.splice(positionIndex, 1);
    }

    // Save updated user data
    await saveUserData(username, user);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting mutual fund transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 