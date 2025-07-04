import { NextRequest, NextResponse } from 'next/server';
import { getTradeSignal } from '@/utils/tradeSignal';
import { getTechnicals } from '@/utils/financeData';
import { getCryptoTechnicals } from '@/utils/cryptoData';

export async function POST(request: NextRequest) {
  try {
    const { symbol, type = 'stock' } = await request.json();
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    let technicals;
    if (type === 'crypto') {
      technicals = await getCryptoTechnicals(symbol);
    } else {
      technicals = await getTechnicals(symbol);
    }

    if (!technicals) {
      return NextResponse.json({ error: 'No technical data available' }, { status: 404 });
    }

    // Get current price from the last technical data point
    const currentPrice = technicals.sma200 || technicals.ema50 || 0;
    const tradeSignal = getTradeSignal(technicals, currentPrice);

    return NextResponse.json({
      symbol,
      tradeSignal,
      technicals,
      currentPrice
    });

  } catch (error) {
    console.error('Error analyzing trade signals:', error);
    return NextResponse.json(
      { error: 'Failed to analyze trade signals' },
      { status: 500 }
    );
  }
} 