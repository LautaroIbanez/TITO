import path from 'path';
import { promises as fs } from 'fs';
import { getHistoricalPrices } from '../src/utils/financeData';
import { getFundamentals } from '../src/utils/financeData';
import { getTechnicals } from '../src/utils/financeData';

const stocksListPath = path.join(process.cwd(), 'data', 'stocks-list.json');

async function updateAllData() {
  console.log('Starting data update process...');

  try {
    const stocksFile = await fs.readFile(stocksListPath, 'utf-8');
    const stocksList = JSON.parse(stocksFile);
    
    if (!Array.isArray(stocksList) || stocksList.length === 0) {
      console.error('Error: stock list is empty or invalid.');
      return;
    }

    console.log(`Found ${stocksList.length} stocks to update: ${stocksList.join(', ')}`);

    for (const symbol of stocksList) {
      console.log(`\n--- Updating ${symbol} ---`);
      try {
        await Promise.all([
          getHistoricalPrices(symbol),
          getFundamentals(symbol),
          getTechnicals(symbol),
        ]);
        console.log(`✅ Successfully updated all data for ${symbol}`);
      } catch (error) {
        console.error(`❌ Failed to update data for ${symbol}:`, error);
      }
    }

    console.log('\nData update process finished.');
  } catch (error) {
    console.error('Fatal error during update process:', error);
  }
}

updateAllData(); 