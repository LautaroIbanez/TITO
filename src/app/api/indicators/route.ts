import { NextRequest, NextResponse } from 'next/server';
import { fetchEconomicIndicators, getMockEconomicIndicators } from '@/services/indicators';
import { EconomicIndicators } from '@/types/indicators';
import { promises as fs } from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'indicators.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

async function loadCachedData() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    const cached = JSON.parse(data);
    
    // Check if cache is still valid (less than 24 hours old)
    const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
    if (cacheAge < CACHE_DURATION) {
      return cached;
    }
  } catch {
    // Cache file doesn't exist or is invalid
    console.log('No valid cache found, will fetch fresh data');
  }
  return null;
}

async function saveToCache(data: EconomicIndicators) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(CACHE_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Save data with current timestamp
    const dataToSave = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(CACHE_FILE, JSON.stringify(dataToSave, null, 2));
    console.log('Economic indicators cached successfully');
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if we should use mock data (for development)
    const useMock = request.nextUrl.searchParams.get('mock') === 'true';
    
    let indicators;
    
    if (useMock) {
      indicators = getMockEconomicIndicators();
    } else {
      // Try to load from cache first
      const cachedData = await loadCachedData();
      
      if (cachedData) {
        console.log('Using cached economic indicators');
        indicators = cachedData;
      } else {
        // Fetch fresh data and cache it
        console.log('Fetching fresh economic indicators');
        indicators = await fetchEconomicIndicators();
        await saveToCache(indicators);
      }
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