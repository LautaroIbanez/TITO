import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

const indicatorsDataPath = path.join(process.cwd(), 'data', 'indicators.json');
const depositsDataPath = path.join(process.cwd(), 'data', 'deposits.json');

interface FixedTermEntry {
  entidad: string;
  tnaClientes: number;
  tnaNoClientes: number;
  fecha_consulta: string;
}

interface Deposit {
  id: string;
  provider: string;
  termDays: number;
  annualRate: number;
  currency: string;
}

export async function GET() {
  try {
    // Try to read indicators.json first
    try {
      const indicatorsContents = await fs.readFile(indicatorsDataPath, 'utf8');
      const indicators = JSON.parse(indicatorsContents);
      
      // Check if fixedTerm.top10 exists
      if (indicators.fixedTerm?.top10 && Array.isArray(indicators.fixedTerm.top10)) {
        // Map the data to the required format
        const deposits: Deposit[] = indicators.fixedTerm.top10.map((entry: FixedTermEntry, index: number) => ({
          id: `deposit-${index + 1}`,
          provider: entry.entidad,
          termDays: 30,
          annualRate: entry.tnaClientes * 100, // Convert to percentage
          currency: 'ARS'
        }));
        
        // Sort by annualRate descending
        deposits.sort((a: Deposit, b: Deposit) => b.annualRate - a.annualRate);
        
        return NextResponse.json(deposits);
      }
    } catch (indicatorsError) {
      console.warn('Failed to read indicators.json, falling back to deposits.json:', indicatorsError);
    }
    
    // Fallback to deposits.json
    const depositsContents = await fs.readFile(depositsDataPath, 'utf8');
    const deposits = JSON.parse(depositsContents);
    return NextResponse.json(deposits);
    
  } catch (error) {
    console.error('Failed to read deposits data:', error);
    return NextResponse.json({ message: 'Error reading deposits data file.' }, { status: 500 });
  }
} 