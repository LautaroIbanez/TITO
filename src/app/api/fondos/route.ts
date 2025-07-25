import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const INDICATORS_FILE = path.join(process.cwd(), 'data', 'indicators.json');

export async function GET(request: NextRequest) {
  try {
    // Load indicators data
    const data = await fs.readFile(INDICATORS_FILE, 'utf-8');
    const indicators = JSON.parse(data);
    
    // Extract mutual funds data
    const { mutualFunds } = indicators;
    
    if (!mutualFunds) {
      return NextResponse.json(
        { error: 'No se encontraron datos de fondos mutuos' },
        { status: 500 }
      );
    }

    // Return the mutual funds data with categories
    return NextResponse.json({
      moneyMarket: mutualFunds.moneyMarket || [],
      rentaFija: mutualFunds.rentaFija || [],
      rentaVariable: mutualFunds.rentaVariable || [],
      rentaMixta: mutualFunds.rentaMixta || []
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