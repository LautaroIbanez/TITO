import { promises as fs } from 'fs';
import path from 'path';
import { getCryptoPrices, getCryptoTechnicals } from '../src/utils/cryptoData';

const CRYPTOS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'ADAUSDT',
  'MATICUSDT',
  'DOGEUSDT',
];

async function updateAllCrypto() {
  for (const symbol of CRYPTOS) {
    try {
      console.log(`Fetching data for ${symbol}...`);
      const prices = await getCryptoPrices(symbol, '1d');
      const filePath = path.join(process.cwd(), 'data', 'crypto', `${symbol}.json`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(prices, null, 2));
      console.log(`Saved ${prices.length} days for ${symbol} to ${filePath}`);

      // Save technicals
      const technicals = await getCryptoTechnicals(symbol, '1d');
      if (technicals) {
        const techPath = path.join(process.cwd(), 'data', 'crypto-technicals', `${symbol}.json`);
        await fs.mkdir(path.dirname(techPath), { recursive: true });
        await fs.writeFile(techPath, JSON.stringify(technicals, null, 2));
        console.log(`Saved technicals for ${symbol} to ${techPath}`);
      }
    } catch (err) {
      console.error(`Error updating ${symbol}:`, err);
    }
  }
  console.log('✅ Crypto update complete.');
}

updateAllCrypto(); 