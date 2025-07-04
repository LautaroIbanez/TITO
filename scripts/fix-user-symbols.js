// scripts/fix-user-symbols.js
const fs = require('fs/promises');
const path = require('path');

const { getBaseTicker, ensureBaSuffix } = require('../src/utils/tickers');

const USERS_DIR = path.join(__dirname, '../data/users');

function normalizeSymbol(symbol, market) {
  let base = getBaseTicker(symbol);
  if (market === 'BCBA') base = ensureBaSuffix(base);
  return base;
}

async function fixUserFile(file) {
  const filePath = path.join(USERS_DIR, file);
  const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
  let changed = false;

  if (Array.isArray(data.positions)) {
    for (const pos of data.positions) {
      if (pos.type === 'Stock' && pos.symbol) {
        const fixed = normalizeSymbol(pos.symbol, pos.market);
        if (fixed !== pos.symbol) {
          pos.symbol = fixed;
          changed = true;
        }
      }
    }
  }
  if (Array.isArray(data.transactions)) {
    for (const tx of data.transactions) {
      if (tx.assetType === 'Stock' && tx.symbol) {
        const fixed = normalizeSymbol(tx.symbol, tx.market);
        if (fixed !== tx.symbol) {
          tx.symbol = fixed;
          changed = true;
        }
      }
    }
  }
  if (changed) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Fixed: ${file}`);
  }
}

async function main() {
  const files = await fs.readdir(USERS_DIR);
  for (const file of files) {
    if (file.endsWith('.json')) {
      await fixUserFile(file);
    }
  }
  console.log('Done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 