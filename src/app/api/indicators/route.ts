import { NextRequest, NextResponse } from 'next/server';
import { fetchEconomicIndicators, getMockEconomicIndicators } from '@/services/indicators';

export async function GET(request: NextRequest) {
  try {
    // Check if we should use mock data (for development)
    const useMock = request.nextUrl.searchParams.get('mock') === 'true';
    
    let indicators;
    
    if (useMock) {
      indicators = getMockEconomicIndicators();
    } else {
      // In production, fetch real data
      indicators = await fetchEconomicIndicators();
    }

    return NextResponse.json(indicators);
  } catch (error) {
    console.error('Error fetching economic indicators:', error);
    
    // Fallback to mock data if real data fails
    try {
      const mockData = getMockEconomicIndicators();
      return NextResponse.json(mockData);
    } catch (fallbackError) {
      console.error('Error with fallback mock data:', fallbackError);
      return NextResponse.json(
        { error: 'No se pudieron cargar los indicadores económicos' },
        { status: 500 }
      );
    }
  }
} 