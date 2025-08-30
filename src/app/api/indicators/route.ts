import { NextRequest, NextResponse } from 'next/server';
import { fetchEconomicIndicators, getMockEconomicIndicators } from '@/services/indicators';
import { EconomicIndicators } from '@/types/indicators';
import { cafciCache } from '@/server/cafci/cache';
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
    
    // Check for future dates (corrupted cache)
    if (cacheAge < 0) {
      console.warn('Cache has future date, invalidating:', cached.lastUpdated);
      return null;
    }
    
    if (cacheAge < CACHE_DURATION) {
      // Validate critical fields have data
      const criticalFields = [
        { field: 'inflation.data', data: cached.inflation?.data },
        { field: 'dollars.data', data: cached.dollars?.data },
        { field: 'fixedTerm.data', data: cached.fixedTerm?.data },
        { field: 'otherFunds.data', data: cached.otherFunds?.data }
      ];
      
      for (const { field, data } of criticalFields) {
        if (!Array.isArray(data) || data.length === 0) {
          console.warn(`Cache validation failed: ${field} is empty or invalid`);
          return null;
        }
      }
      
      // Validate lastUpdated is a past date
      const lastUpdated = new Date(cached.lastUpdated);
      if (isNaN(lastUpdated.getTime()) || lastUpdated > new Date()) {
        console.warn('Cache validation failed: invalid or future lastUpdated date');
        return null;
      }
      
      return cached;
    }
  } catch (error) {
    // Cache file doesn't exist or is invalid
    console.log('No valid cache found, will fetch fresh data:', error);
  }
  return null;
}

async function getMutualFundsFromCafci(): Promise<EconomicIndicators['mutualFunds']> {
  try {
    console.log('🔄 Fetching mutual funds data from CAFCI cache...');
    
    // Get all fund data from CAFCI cache
    const allFunds = await cafciCache.getFundData();
    
    // Group funds by category
    const moneyMarket = allFunds.filter(fund => fund.categoria === 'Money Market');
    const rentaFija = allFunds.filter(fund => fund.categoria === 'Renta Fija');
    const rentaVariable = allFunds.filter(fund => fund.categoria === 'Renta Variable');
    const rentaMixta = allFunds.filter(fund => fund.categoria === 'Renta Mixta');
    
    // Convert to the expected format
    const convertFunds = (funds: any[]) => funds.map(fund => ({
      fondo: fund.fondo,
      tna: fund.tna || 0,
      rendimiento_mensual: fund.rendimiento_mensual || 0,
      categoria: fund.categoria
    }));
    
    return {
      moneyMarket: convertFunds(moneyMarket),
      rentaFija: convertFunds(rentaFija),
      rentaVariable: convertFunds(rentaVariable),
      rentaMixta: convertFunds(rentaMixta)
    };
  } catch (error) {
    console.error('Error fetching mutual funds from CAFCI:', error);
    // Return empty arrays if CAFCI fails
    return {
      moneyMarket: [],
      rentaFija: [],
      rentaVariable: [],
      rentaMixta: []
    };
  }
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
        
        // Check if mutual funds data is empty or outdated
        const hasMutualFundsData = cachedData.mutualFunds && 
          Object.values(cachedData.mutualFunds).some(funds => Array.isArray(funds) && funds.length > 0);
        
        if (!hasMutualFundsData) {
          console.log('Mutual funds data is empty, fetching from CAFCI...');
          // Replace mutual funds data with fresh CAFCI data
          cachedData.mutualFunds = await getMutualFundsFromCafci();
          // Update cache with new mutual funds data
          await saveToCache(cachedData);
        }
        
        indicators = cachedData;
      } else {
        // Fetch fresh data and cache it
        console.log('Fetching fresh economic indicators');
        indicators = await fetchEconomicIndicators();
        
        // Replace mutual funds with CAFCI data
        indicators.mutualFunds = await getMutualFundsFromCafci();
        
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