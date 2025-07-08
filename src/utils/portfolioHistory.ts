import fs from 'fs/promises';
import path from 'path';
import { getUserData } from './userData';
import { calculatePortfolioSummaryHistory } from './portfolioSummaryHistory';

export interface DailyPortfolioRecord {
  fecha: string; // YYYY-MM-DD
  total_portfolio_ars: number;
  total_portfolio_usd: number;
  capital_invertido_ars: number;
  capital_invertido_usd: number;
  ganancias_netas_ars: number;
  ganancias_netas_usd: number;
  efectivo_disponible_ars: number;
  efectivo_disponible_usd: number;
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