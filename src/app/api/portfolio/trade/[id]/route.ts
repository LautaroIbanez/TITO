import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserData } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { username, commissionPct, purchaseFeePct } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    if (commissionPct === undefined && purchaseFeePct === undefined) {
      return NextResponse.json({ error: 'At least one commission field is required' }, { status: 400 });
    }

    const userFile = path.join(process.cwd(), 'data', 'users', `${username}.json`);
    const userData: UserData = JSON.parse(await fs.readFile(userFile, 'utf-8'));

    // Find the transaction to update
    const transactionIndex = userData.transactions.findIndex(tx => tx.id === params.id);
    if (transactionIndex === -1) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const transaction = userData.transactions[transactionIndex];
    
    // Only allow updates for Buy/Sell transactions
    if (transaction.type !== 'Buy' && transaction.type !== 'Sell') {
      return NextResponse.json({ error: 'Only trade transactions can be updated' }, { status: 400 });
    }

    // Update the transaction with new commission values
    const updatedTransaction = {
      ...transaction,
      commissionPct: commissionPct !== undefined ? (commissionPct > 0 ? commissionPct : undefined) : transaction.commissionPct,
      purchaseFeePct: purchaseFeePct !== undefined ? (purchaseFeePct > 0 ? purchaseFeePct : undefined) : transaction.purchaseFeePct,
    };

    // Recalculate the position's purchase price if this is a buy transaction
    if (transaction.type === 'Buy') {
      const baseAmount = transaction.quantity * transaction.price;
      const oldCommissionAmount = (transaction.commissionPct || 0) * baseAmount / 100;
      const oldPurchaseFeeAmount = (transaction.purchaseFeePct || 0) * baseAmount / 100;
      const oldTotalCost = baseAmount + oldCommissionAmount + oldPurchaseFeeAmount;

      const newCommissionAmount = (updatedTransaction.commissionPct || 0) * baseAmount / 100;
      const newPurchaseFeeAmount = (updatedTransaction.purchaseFeePct || 0) * baseAmount / 100;
      const newTotalCost = baseAmount + newCommissionAmount + newPurchaseFeeAmount;

      // Find the corresponding position
      let positionIndex = -1;
      if ('symbol' in transaction && transaction.assetType === 'Stock') {
        positionIndex = userData.positions.findIndex(pos => 
          pos.type === 'Stock' && pos.symbol === transaction.symbol && pos.market === transaction.market
        );
      } else if ('ticker' in transaction && transaction.assetType === 'Bond') {
        positionIndex = userData.positions.findIndex(pos => 
          pos.type === 'Bond' && pos.ticker === transaction.ticker
        );
      } else if ('symbol' in transaction && transaction.assetType === 'Crypto') {
        positionIndex = userData.positions.findIndex(pos => 
          pos.type === 'Crypto' && pos.symbol === transaction.symbol
        );
      }

      if (positionIndex !== -1) {
        const position = userData.positions[positionIndex];
        if ('purchasePrice' in position && 'quantity' in position) {
          const prevTotalCost = position.purchasePrice * position.quantity;
          const newTotalCostWithPosition = prevTotalCost - oldTotalCost + newTotalCost;
          (position as any).purchasePrice = newTotalCostWithPosition / position.quantity;
        }
      }

      // Update cash balance
      const cashDifference = oldTotalCost - newTotalCost;
      userData.cash[transaction.currency] += cashDifference;
    } else if (transaction.type === 'Sell') {
      // For sell transactions, update cash balance based on proceeds difference
      const baseAmount = transaction.quantity * transaction.price;
      const oldCommissionAmount = (transaction.commissionPct || 0) * baseAmount / 100;
      const oldPurchaseFeeAmount = (transaction.purchaseFeePct || 0) * baseAmount / 100;
      const oldTotalProceeds = baseAmount - oldCommissionAmount - oldPurchaseFeeAmount;

      const newCommissionAmount = (updatedTransaction.commissionPct || 0) * baseAmount / 100;
      const newPurchaseFeeAmount = (updatedTransaction.purchaseFeePct || 0) * baseAmount / 100;
      const newTotalProceeds = baseAmount - newCommissionAmount - newPurchaseFeeAmount;

      // Update cash balance
      const proceedsDifference = newTotalProceeds - oldTotalProceeds;
      userData.cash[transaction.currency] += proceedsDifference;
    }

    // Update the transaction
    userData.transactions[transactionIndex] = updatedTransaction;

    // Save the updated data
    await fs.writeFile(userFile, JSON.stringify(userData, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating trade:', error);
    return NextResponse.json(
      { error: 'Failed to update trade' },
      { status: 500 }
    );
  }
} 