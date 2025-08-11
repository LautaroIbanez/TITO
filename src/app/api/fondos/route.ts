import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { fetchEconomicIndicators } from '@/services/indicators';

export const dynamic = 'force-dynamic';

const INDICATORS_FILE = path.join(process.cwd(), 'data', 'indicators.json');

export async function GET() {
  try {
    let indicators;
    
    try {
      // Try to load indicators data from file
      const data = await fs.readFile(INDICATORS_FILE, 'utf-8');
      indicators = JSON.parse(data);
      
      // Check if the file is empty or missing mutual funds data
      if (!indicators || !indicators.mutualFunds || Object.keys(indicators.mutualFunds).length === 0) {
        throw new Error('Indicators file is empty or missing mutual funds data');
      }
    } catch {
      console.log('Indicators file missing or empty, fetching fresh data...');
      
      // Fetch fresh indicators data
      indicators = await fetchEconomicIndicators();
      
      // Write the fresh data to the file
      try {
        await fs.writeFile(INDICATORS_FILE, JSON.stringify(indicators, null, 2));
        console.log('Fresh indicators data written to file');
      } catch (writeError) {
        console.error('Error writing indicators data to file:', writeError);
        // Continue with the fresh data even if writing fails
      }
    }
    
    // Extract mutual funds data
    const { mutualFunds } = indicators;
    
    if (!mutualFunds) {
      return NextResponse.json(
        { error: 'No se encontraron datos de fondos mutuos' },
        { status: 500 }
      );
    }

    // Extract other funds data
    const { otherFunds } = indicators;
    
    // Return the mutual funds data with categories
    return NextResponse.json({
      moneyMarket: mutualFunds.moneyMarket || [],
      rentaFija: mutualFunds.rentaFija || [],
      rentaVariable: mutualFunds.rentaVariable || [],
      rentaMixta: mutualFunds.rentaMixta || [],
      otros: otherFunds?.data || []
    });

  } catch (error) {
    console.error('Error loading mutual funds data:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Error al cargar fondos mutuos: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor al cargar fondos mutuos' },
      { status: 500 }
    );
  }
} 