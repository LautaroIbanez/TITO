import fs from 'fs';
import path from 'path';

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
export function appendDailyRecord(username: string, record: DailyPortfolioRecord): void {
  try {
    // Ensure the data/history directory exists
    const historyDir = path.join(process.cwd(), 'data', 'history');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    // Define the file path
    const filePath = path.join(historyDir, `${username}.json`);

    // Load existing history or create new array
    let history: DailyPortfolioRecord[] = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      history = JSON.parse(fileContent);
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
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
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
export function loadPortfolioHistory(username: string): DailyPortfolioRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'data', 'history', `${username}.json`);
    
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading portfolio history for ${username}:`, error);
    return [];
  }
} 