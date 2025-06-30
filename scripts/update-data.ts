import path from 'path';
import { promises as fs } from 'fs';
import pLimit from 'p-limit';
import { getHistoricalPrices } from '../src/utils/financeData';
import { getFundamentals } from '../src/utils/financeData';
import { getTechnicals } from '../src/utils/financeData';
import { ensureStocksData } from '../src/utils/financeData';
import { STOCK_CATEGORIES } from '../src/utils/assetCategories';

// Build a single ticker array from all category values
const getAllTickers = () => {
  const tickers = new Set<string>();
  Object.values(STOCK_CATEGORIES).forEach(category => {
    category.forEach(ticker => tickers.add(ticker));
  });
  return Array.from(tickers);
};

// Limit concurrent requests to avoid rate limiting
const limit = pLimit(2); // Process 2 stocks at a time for more conservative rate limiting

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry failed operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`⚠️  Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await delay(delayMs);
    }
  }
  throw new Error('Max retries exceeded');
}

async function updateAllData() {
  console.log('🚀 Starting data update process...');
  const startTime = Date.now();

  try {
    const stocksList = getAllTickers();
    
    if (!Array.isArray(stocksList) || stocksList.length === 0) {
      console.error('❌ Error: stock list is empty or invalid.');
      return;
    }

    console.log(`📋 Found ${stocksList.length} stocks to update: ${stocksList.join(', ')}`);
    console.log(`⚡ Processing with concurrency limit: 2 stocks at a time`);
    console.log(`🔄 Max retries per operation: ${MAX_RETRIES}`);

    // Use ensureStocksData for each ticker
    const updatePromises = stocksList.map((symbol, index) => 
      limit(async () => {
        const symbolStartTime = Date.now();
        console.log(`\n📊 [${index + 1}/${stocksList.length}] --- Updating ${symbol} ---`);
        
        try {
          // Use ensureStocksData to fetch all data types
          const success = await retryOperation(() => ensureStocksData([symbol]));
          
          const symbolDuration = ((Date.now() - symbolStartTime) / 1000).toFixed(1);
          if (success[0]) {
            console.log(`✅ Successfully updated all data for ${symbol} (${symbolDuration}s)`);
            return { symbol, success: true, duration: symbolDuration };
          } else {
            console.error(`❌ Failed to update data for ${symbol} (${symbolDuration}s)`);
            return { symbol, success: false, error: 'ensureStocksData returned false', duration: symbolDuration };
          }
        } catch (error) {
          const symbolDuration = ((Date.now() - symbolStartTime) / 1000).toFixed(1);
          console.error(`❌ Failed to update data for ${symbol} after ${MAX_RETRIES} retries (${symbolDuration}s):`, error);
          return { symbol, success: false, error, duration: symbolDuration };
        }
      })
    );

    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);
    
    // Calculate statistics
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgDuration = successful.length > 0 
      ? (successful.reduce((sum, r) => sum + parseFloat(r.duration), 0) / successful.length).toFixed(1)
      : '0.0';
    
    // Log detailed summary
    console.log(`\n📊 Update Summary:`);
    console.log(`⏱️  Total execution time: ${totalDuration}s`);
    console.log(`✅ Successfully updated: ${successful.length} stocks`);
    console.log(`❌ Failed to update: ${failed.length} stocks`);
    console.log(`📈 Average time per successful update: ${avgDuration}s`);
    
    if (successful.length > 0) {
      console.log(`\n✅ Successful updates:`);
      successful.forEach(r => console.log(`  - ${r.symbol} (${r.duration}s)`));
    }
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed updates:`);
      failed.forEach(r => {
        const errorMessage = r.error instanceof Error ? r.error.message : String(r.error);
        console.log(`  - ${r.symbol} (${r.duration}s): ${errorMessage || 'Unknown error'}`);
      });
    }

    console.log(`\n🎉 Data update process finished in ${totalDuration}s`);
  } catch (error) {
    console.error('💥 Fatal error during update process:', error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Update process interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Update process terminated');
  process.exit(0);
});

updateAllData(); 