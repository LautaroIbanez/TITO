const path = require('path');
const fs = require('fs').promises;
const yahooFinance = require('yahoo-finance2').default;
const dayjs = require('dayjs');

// Benchmark definitions
const BENCHMARKS: Record<string, string> = {
  'S&P 500': '^GSPC',
  'Gold': 'GC=F',
  'US 10-Year Treasury': '^TNX',
  'NASDAQ': '^IXIC',
  'Dow Jones': '^DJI',
  'Russell 2000': '^RUT',
  'VIX': '^VIX',
  'Bitcoin': 'BTC-USD',
  'Ethereum': 'ETH-USD',
  'US Dollar Index': 'DX-Y.NYB'
};

const benchmarksDataPath = path.join(process.cwd(), 'data', 'benchmarks.json');

interface BenchmarkData {
  symbol: string;
  name: string;
  oneYearReturn: number;
  currentPrice: number;
  previousPrice: number;
  lastUpdated: string;
}

interface BenchmarksFile {
  timestamp: string;
  benchmarks: Record<string, BenchmarkData>;
}

async function fetchBenchmarkData(symbol: string, name: string) {
  try {
    console.log(`📊 Fetching data for ${name} (${symbol})...`);
    // Get current quote
    const quote = await yahooFinance.quote(symbol);
    // Get historical data for 1 year ago
    const oneYearAgo = dayjs().subtract(1, 'year').format('YYYY-MM-DD');
    const today = dayjs().format('YYYY-MM-DD');
    const historical = await yahooFinance.historical(symbol, {
      period1: oneYearAgo,
      period2: today,
      interval: '1d'
    });
    if (!historical || historical.length === 0) {
      throw new Error(`No historical data available for ${symbol}`);
    }
    const currentPrice = quote.regularMarketPrice || 0;
    const previousPrice = historical[0].close || 0;
    // Calculate 1-year return
    const oneYearReturn = previousPrice > 0 
      ? ((currentPrice - previousPrice) / previousPrice) * 100 
      : 0;
    return {
      symbol,
      name,
      oneYearReturn: Math.round(oneYearReturn * 100) / 100, // Round to 2 decimal places
      currentPrice: Math.round(currentPrice * 100) / 100,
      previousPrice: Math.round(previousPrice * 100) / 100,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Error fetching data for ${name} (${symbol}):`, error);
    throw error;
  }
}

async function updateBenchmarks() {
  console.log('🚀 Starting benchmark data update...');
  const startTime = Date.now();
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(benchmarksDataPath);
    await fs.mkdir(dataDir, { recursive: true });
    const results: Record<string, any> = {};
    const errors: string[] = [];
    // Fetch data for each benchmark
    for (const [name, symbol] of Object.entries(BENCHMARKS)) {
      try {
        const data = await fetchBenchmarkData(symbol, name);
        results[name] = data;
        console.log(`✅ ${name}: ${data.oneYearReturn}% (${data.currentPrice})`);
      } catch (error) {
        errors.push(`${name} (${symbol}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log(`⚠️  Skipping ${name} due to error`);
      }
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // Prepare the data structure
    const benchmarksData = {
      timestamp: new Date().toISOString(),
      benchmarks: results
    };
    // Write to file
    await fs.writeFile(benchmarksDataPath, JSON.stringify(benchmarksData, null, 2));
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n📊 Benchmark Update Summary:`);
    console.log(`⏱️  Total execution time: ${duration}s`);
    console.log(`✅ Successfully updated: ${Object.keys(results).length} benchmarks`);
    console.log(`❌ Failed to update: ${errors.length} benchmarks`);
    console.log(`📁 Data saved to: ${benchmarksDataPath}`);
    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      errors.forEach((error: any) => console.log(`  - ${error}`));
    }
    // Log successful benchmarks
    if (Object.keys(results).length > 0) {
      console.log(`\n✅ Updated benchmarks:`);
      Object.values(results).forEach((benchmark: any) => {
        console.log(`  - ${benchmark.name}: ${benchmark.oneYearReturn}% (${benchmark.currentPrice})`);
      });
    }
    console.log(`\n🎉 Benchmark update completed in ${duration}s`);
  } catch (error) {
    console.error('💥 Fatal error during benchmark update:', error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Benchmark update interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Benchmark update terminated');
  process.exit(0);
});

updateBenchmarks(); 