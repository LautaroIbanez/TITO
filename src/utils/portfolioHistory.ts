import fs from 'fs/promises';
import path from 'path';
import { getUserData } from './userData';
import { calculatePortfolioSummaryHistory } from './portfolioSummaryHistory';
import { getPortfolioData } from './portfolioData';
import { calculateCurrentValueByCurrency } from './calculatePortfolioValue';
import { calculateInvestedCapital } from './investedCapital';
import { calculateNetGainsByCurrency } from './positionGains';
import { recalculateNetGains } from './netGainsCalculator';

export interface DailyPortfolioRecord {
  fecha: string; // YYYY-MM-DD
  total_portfolio_ars: number;
  total_portfolio_usd: number;
  capital_invertido_ars: number;
  capital_invertido_usd: number;
  ganancias_netas_ars: number | null;
  ganancias_netas_usd: number | null;
  efectivo_disponible_ars: number;
  efectivo_disponible_usd: number;
  incompleto?: boolean; // New field to indicate incomplete data
}

/**
 * Appends a daily portfolio record to the user's history file
 * @param username The username
 * @param record The daily portfolio record to append
 */
export async function appendDailyRecord(username: string, record: DailyPortfolioRecord): Promise<void> {
  try {
    // Ensure the data/history directory exists
    const historyDir = path.join(process.cwd(), 'data', 'history');
    try {
      await fs.access(historyDir);
    } catch {
      await fs.mkdir(historyDir, { recursive: true });
    }

    // Define the file path
    const filePath = path.join(historyDir, `${username}.json`);

    // Load existing history or create new array
    let history: DailyPortfolioRecord[] = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      history = JSON.parse(fileContent);
    } catch {
      // File doesn't exist or is empty, start with empty array
    }

    // Check if a record for this date already exists
    const existingIndex = history.findIndex(entry => entry.fecha === record.fecha);
    
    if (existingIndex !== -1) {
      // Update existing record
      history[existingIndex] = record;
    } else {
      // Append new record
      history.push(record);
    }

    // Sort by date to maintain chronological order
    history.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error(`Error appending daily record for ${username}:`, error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Loads the portfolio history for a user
 * @param username The username
 * @returns Array of daily portfolio records
 */
export async function loadPortfolioHistory(username: string): Promise<DailyPortfolioRecord[]> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'history', `${username}.json`);
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch {
      // File doesn't exist, return empty array
      return [];
    }
  } catch (error) {
    console.error(`Error loading portfolio history for ${username}:`, error);
    return [];
  }
} 

export async function loadOrGeneratePortfolioHistory(username: string): Promise<DailyPortfolioRecord[]> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'history', `${username}.json`);
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch {
      // File doesn't exist, generate from user data
      const user = await getUserData(username);
      if (!user) return [];
      // Use user's transactions, price history, and initial cash
      const transactions = user.transactions || [];
      // Try to get price history if present (may be in user.portfolioData or similar)
      const priceHistory = (user as any).historicalPrices || {};
      const initialCash = user.cash || { ARS: 0, USD: 0 };
      // Generate summary history
      const summary = await calculatePortfolioSummaryHistory(transactions, priceHistory, { initialCash });
      // Convert to DailyPortfolioRecord[]
      return summary.map(entry => ({
        fecha: entry.date,
        total_portfolio_ars: entry.totalARS,
        total_portfolio_usd: entry.totalUSD,
        capital_invertido_ars: entry.investedARS,
        capital_invertido_usd: entry.investedUSD,
        ganancias_netas_ars: entry.totalARS - entry.investedARS,
        ganancias_netas_usd: entry.totalUSD - entry.investedUSD,
        efectivo_disponible_ars: entry.cashARS,
        efectivo_disponible_usd: entry.cashUSD,
      }));
    }
  } catch (error) {
    console.error(`Error loading or generating portfolio history for ${username}:`, error);
    return [];
  }
} 

/**
 * Saves a daily portfolio snapshot for a user
 * @param username The username
 * @returns Promise<void>
 */
export async function guardarSnapshotDiario(username: string): Promise<void> {
  try {
    // Load the user's current portfolio data
    const portfolioData = await getPortfolioData(username);
    
    // Calculate current portfolio values
    const { ARS: totalARS, USD: totalUSD } = calculateCurrentValueByCurrency(
      portfolioData.positions || [],
      portfolioData.cash || { ARS: 0, USD: 0 },
      portfolioData.historicalPrices || {}
    );
    
    // Calculate invested capital
    const investedARS = calculateInvestedCapital(portfolioData.transactions || [], 'ARS');
    const investedUSD = calculateInvestedCapital(portfolioData.transactions || [], 'USD');
    
    // Calculate net gains
    const { ARS: netGainsARS, USD: netGainsUSD, skipped } = calculateNetGainsByCurrency(
      portfolioData.positions || [],
      portfolioData.historicalPrices || {}
    );
    
    // Check if any metrics couldn't be computed
    const hasInvalidMetrics = !Number.isFinite(totalARS) || 
                             !Number.isFinite(totalUSD) || 
                             !Number.isFinite(investedARS) || 
                             !Number.isFinite(investedUSD) || 
                             !Number.isFinite(netGainsARS) || 
                             !Number.isFinite(netGainsUSD) ||
                             !Number.isFinite(portfolioData.cash?.ARS) ||
                             !Number.isFinite(portfolioData.cash?.USD);
    
    // Create today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Check if a record for today already exists
    const historyDir = path.join(process.cwd(), 'data', 'history');
    const filePath = path.join(historyDir, `${username}.json`);
    
    let history: DailyPortfolioRecord[] = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      history = JSON.parse(fileContent);
    } catch {
      // File doesn't exist, start with empty array
    }
    
    const existingRecordIndex = history.findIndex(entry => entry.fecha === today);
    
    if (existingRecordIndex === -1) {
      // Create snapshot object with standardized net gains calculation
      const snapshot: DailyPortfolioRecord = {
        fecha: today,
        total_portfolio_ars: Number.isFinite(totalARS) ? totalARS : 0,
        total_portfolio_usd: Number.isFinite(totalUSD) ? totalUSD : 0,
        capital_invertido_ars: Number.isFinite(investedARS) ? investedARS : 0,
        capital_invertido_usd: Number.isFinite(investedUSD) ? investedUSD : 0,
        ganancias_netas_ars: null, // Will be calculated using standardized formula
        ganancias_netas_usd: null, // Will be calculated using standardized formula
        efectivo_disponible_ars: Number.isFinite(portfolioData.cash?.ARS) ? portfolioData.cash.ARS : 0,
        efectivo_disponible_usd: Number.isFinite(portfolioData.cash?.USD) ? portfolioData.cash.USD : 0,
      };
      
      // Calculate net gains using standardized formula
      const netGains = recalculateNetGains(snapshot);
      snapshot.ganancias_netas_ars = netGains.ARS;
      snapshot.ganancias_netas_usd = netGains.USD;
      
      // Add incompleto flag if any metrics couldn't be computed
      if (hasInvalidMetrics) {
        snapshot.incompleto = true;
      }
      
      // Append the daily record
      await appendDailyRecord(username, snapshot);
      
      console.log(`Daily snapshot saved for ${username} on ${today}${hasInvalidMetrics ? ' (incomplete data)' : ''}`);
    } else {
      console.log(`Daily snapshot already exists for ${username} on ${today}`);
    }
  } catch (error) {
    console.error(`Error saving daily snapshot for ${username}:`, error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Gets the latest portfolio snapshot from an array of daily records
 * @param history Array of daily portfolio records
 * @returns The latest record or null if no records exist
 */
export function getLatestPortfolioSnapshot(history: DailyPortfolioRecord[]): DailyPortfolioRecord | null {
  if (!history || history.length === 0) {
    return null;
  }
  
  // Sort by date to ensure we get the latest record
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );
  
  return sortedHistory[sortedHistory.length - 1];
}

/**
 * Normalizes portfolio history records by ensuring ganancias_netas_* values
 * match the calculated values (total_portfolio_* - capital_invertido_*)
 * @param records Array of daily portfolio records to normalize
 * @returns Array of normalized records
 */
export function normalizePortfolioHistory(records: DailyPortfolioRecord[]): DailyPortfolioRecord[] {
  return records.map(record => {
    const calculatedGainsARS = record.total_portfolio_ars - record.capital_invertido_ars;
    const calculatedGainsUSD = record.total_portfolio_usd - record.capital_invertido_usd;
    
    // Check if the stored gains differ from calculated gains
    const gainsARSChanged = record.ganancias_netas_ars !== calculatedGainsARS;
    const gainsUSDChanged = record.ganancias_netas_usd !== calculatedGainsUSD;
    
    if (gainsARSChanged || gainsUSDChanged) {
      return {
        ...record,
        ganancias_netas_ars: calculatedGainsARS,
        ganancias_netas_usd: calculatedGainsUSD,
      };
    }
    
    return record;
  });
}

/**
 * Loads and normalizes portfolio history for a user
 * @param username The username
 * @returns Promise<DailyPortfolioRecord[]> Normalized portfolio history
 */
export async function loadAndNormalizePortfolioHistory(username: string): Promise<DailyPortfolioRecord[]> {
  const records = await loadPortfolioHistory(username);
  const normalizedRecords = normalizePortfolioHistory(records);
  
  // Save the normalized records if any changes were made
  const hasChanges = normalizedRecords.some((record, index) => 
    record.ganancias_netas_ars !== records[index]?.ganancias_netas_ars ||
    record.ganancias_netas_usd !== records[index]?.ganancias_netas_usd
  );
  
  if (hasChanges) {
    try {
      const historyDir = path.join(process.cwd(), 'data', 'history');
      const filePath = path.join(historyDir, `${username}.json`);
      await fs.writeFile(filePath, JSON.stringify(normalizedRecords, null, 2));
      console.log(`Normalized portfolio history for ${username}`);
    } catch (error) {
      console.error(`Error saving normalized history for ${username}:`, error);
    }
  }
  
  return normalizedRecords;
}