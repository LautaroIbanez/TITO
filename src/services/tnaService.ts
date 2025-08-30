import { MutualFundPosition } from '@/types';
import { fetchFondosTNA } from './cafciService';

export interface TnaData {
  date: string;
  tna: number;
}

/**
 * Fetches TNA data for a specific mutual fund from CAFCI
 */
export async function fetchFundTNA(fundName: string): Promise<number | null> {
  try {
    const response = await fetchFondosTNA({ search: fundName });
    
    if (!response.success || !response.data || response.data.length === 0) {
      console.warn(`No TNA data found for fund: ${fundName}`);
      return null;
    }
    
    // Find the exact fund match
    const fund = response.data.find(f => 
      f.fondo.toLowerCase().includes(fundName.toLowerCase()) ||
      fundName.toLowerCase().includes(f.fondo.toLowerCase())
    );
    
    if (!fund || fund.tna === null) {
      console.warn(`No valid TNA found for fund: ${fundName}`);
      return null;
    }
    
    return fund.tna;
  } catch (error) {
    console.error(`Error fetching TNA for fund ${fundName}:`, error);
    return null;
  }
}

/**
 * Updates TNA history for a mutual fund position
 */
export function updateFundTNAHistory(
  fund: MutualFundPosition,
  newTna: number
): MutualFundPosition {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Initialize tnaHistory if it doesn't exist
  const tnaHistory = fund.tnaHistory || [];
  
  // Check if we already have TNA for today
  const todayIndex = tnaHistory.findIndex(entry => entry.date === today);
  
  if (todayIndex >= 0) {
    // Update existing entry
    tnaHistory[todayIndex] = { date: today, tna: newTna };
  } else {
    // Add new entry
    tnaHistory.push({ date: today, tna: newTna });
  }
  
  return {
    ...fund,
    tnaHistory,
    currentTna: newTna
  };
}

/**
 * Fetches and updates TNA data for all mutual fund positions
 */
export async function updateAllFundsTNA(
  funds: MutualFundPosition[]
): Promise<MutualFundPosition[]> {
  const updatedFunds: MutualFundPosition[] = [];
  
  for (const fund of funds) {
    try {
      const tna = await fetchFundTNA(fund.name);
      
      if (tna !== null) {
        const updatedFund = updateFundTNAHistory(fund, tna);
        updatedFunds.push(updatedFund);
      } else {
        // Keep the fund as is if TNA couldn't be fetched
        updatedFunds.push(fund);
      }
    } catch (error) {
      console.error(`Error updating TNA for fund ${fund.name}:`, error);
      // Keep the fund as is if there was an error
      updatedFunds.push(fund);
    }
  }
  
  return updatedFunds;
}

/**
 * Gets TNA for a specific date from the fund's history
 */
export function getTNAForDate(
  fund: MutualFundPosition,
  date: string
): number | null {
  if (!fund.tnaHistory) return null;
  
  const entry = fund.tnaHistory.find(entry => entry.date === date);
  return entry ? entry.tna : null;
}

/**
 * Gets the most recent TNA from the fund's history
 */
export function getLatestTNA(fund: MutualFundPosition): number | null {
  if (!fund.tnaHistory || fund.tnaHistory.length === 0) {
    return fund.currentTna || null;
  }
  
  // Sort by date and get the most recent
  const sortedHistory = [...fund.tnaHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return sortedHistory[0].tna;
}
