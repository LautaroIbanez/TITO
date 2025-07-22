#!/usr/bin/env tsx

/**
 * Migration script to recompute all portfolio history files using the new
 * cumulative daily differences approach for net gains calculation.
 * 
 * This script will:
 * 1. Load all existing portfolio history files
 * 2. Recompute ganancias_netas_ars and ganancias_netas_usd using calculateCumulativeNetGains
 * 3. Save the updated files
 */

import fs from 'fs/promises';
import path from 'path';
import { calculateCumulativeNetGains } from '../src/utils/netGainsCalculator';
import type { DailyPortfolioRecord } from '../src/utils/portfolioHistoryClient';

const HISTORY_DIR = path.join(process.cwd(), 'data', 'history');

async function migrateHistoryFile(filePath: string): Promise<void> {
  try {
    console.log(`Processing ${path.basename(filePath)}...`);
    
    // Read the history file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const history: DailyPortfolioRecord[] = JSON.parse(fileContent);
    
    if (history.length === 0) {
      console.log(`  Skipping empty file`);
      return;
    }
    
    // Sort records by date to ensure chronological order
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
    
    // Calculate cumulative gains
    const { cumulativeARS, cumulativeUSD, dailyGains } = calculateCumulativeNetGains(sortedHistory);
    
    // Update each record with cumulative gains up to that point
    const updatedHistory: DailyPortfolioRecord[] = [];
    
    for (let i = 0; i < sortedHistory.length; i++) {
      const record = { ...sortedHistory[i] };
      
      if (i === 0) {
        // First record has no gains
        record.ganancias_netas_ars = 0;
        record.ganancias_netas_usd = 0;
      } else {
        // Calculate cumulative gains up to this record
        const recordsUpToThis = sortedHistory.slice(0, i + 1);
        const { cumulativeARS: gainsUpToThisARS, cumulativeUSD: gainsUpToThisUSD } = calculateCumulativeNetGains(recordsUpToThis);
        record.ganancias_netas_ars = gainsUpToThisARS;
        record.ganancias_netas_usd = gainsUpToThisUSD;
      }
      
      updatedHistory.push(record);
    }
    
    // Write the updated history back to file
    await fs.writeFile(filePath, JSON.stringify(updatedHistory, null, 2));
    
    console.log(`  Updated ${updatedHistory.length} records`);
    console.log(`  Final cumulative gains: ARS ${cumulativeARS.toFixed(2)}, USD ${cumulativeUSD.toFixed(2)}`);
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

async function main(): Promise<void> {
  try {
    console.log('Starting net gains migration...');
    console.log(`History directory: ${HISTORY_DIR}`);
    
    // Check if history directory exists
    try {
      await fs.access(HISTORY_DIR);
    } catch {
      console.log('History directory does not exist. Nothing to migrate.');
      return;
    }
    
    // Get all JSON files in the history directory
    const files = await fs.readdir(HISTORY_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      console.log('No history files found to migrate.');
      return;
    }
    
    console.log(`Found ${jsonFiles.length} history files to migrate.`);
    
    // Process each file
    for (const file of jsonFiles) {
      const filePath = path.join(HISTORY_DIR, file);
      await migrateHistoryFile(filePath);
    }
    
    console.log('\nMigration completed successfully!');
    console.log('\nNote: All portfolio history files have been updated to use the new');
    console.log('cumulative daily differences approach for net gains calculation.');
    console.log('This ensures consistency with the new DashboardSummary and chart components.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  main();
} 