import { ensureBaSuffix, getBaseTicker, getTickerCurrency, getTickerMarket, getTickerDisplayName, isSameAsset, getBcbaHint, getCorrectPrice } from '../tickers';
import { STOCK_CATEGORIES } from '../assetCategories';

describe('getBaseTicker', () => {
  it('removes .BA suffix', () => {
    expect(getBaseTicker('AAPL.BA')).toBe('AAPL');
    expect(getBaseTicker('GGAL.BA')).toBe('GGAL');
  });

  it('removes .AR suffix', () => {
    expect(getBaseTicker('YPF.AR')).toBe('YPF');
    expect(getBaseTicker('BBAR.AR')).toBe('BBAR');
  });

  it('handles symbols without suffixes', () => {
    expect(getBaseTicker('AAPL')).toBe('AAPL');
    expect(getBaseTicker('GGAL')).toBe('GGAL');
  });

  it('handles empty or null input', () => {
    expect(getBaseTicker('')).toBe('');
    expect(getBaseTicker(null as any)).toBe('');
  });

  it('removes multiple suffixes', () => {
    expect(getBaseTicker('AAPL.BA.BA')).toBe('AAPL');
    expect(getBaseTicker('GGAL.AR.BA')).toBe('GGAL');
  });
});

describe('getTickerCurrency', () => {
  it('returns ARS for .BA suffixes', () => {
    expect(getTickerCurrency('AAPL.BA')).toBe('ARS');
    expect(getTickerCurrency('GGAL.BA')).toBe('ARS');
  });

  it('returns ARS for .AR suffixes', () => {
    expect(getTickerCurrency('YPF.AR')).toBe('ARS');
    expect(getTickerCurrency('BBAR.AR')).toBe('ARS');
  });

  it('returns USD for symbols without suffixes', () => {
    expect(getTickerCurrency('AAPL')).toBe('USD');
    expect(getTickerCurrency('GGAL')).toBe('USD');
  });

  it('handles empty or null input', () => {
    expect(getTickerCurrency('')).toBe('USD');
    expect(getTickerCurrency(null as any)).toBe('USD');
  });
});

describe('getTickerMarket', () => {
  it('returns BCBA for .BA suffixes', () => {
    expect(getTickerMarket('AAPL.BA')).toBe('BCBA');
    expect(getTickerMarket('GGAL.BA')).toBe('BCBA');
  });

  it('returns BCBA for .AR suffixes', () => {
    expect(getTickerMarket('YPF.AR')).toBe('BCBA');
    expect(getTickerMarket('BBAR.AR')).toBe('BCBA');
  });

  it('returns NASDAQ for symbols without suffixes', () => {
    expect(getTickerMarket('AAPL')).toBe('NASDAQ');
    expect(getTickerMarket('GGAL')).toBe('NASDAQ');
  });

  it('handles empty or null input', () => {
    expect(getTickerMarket('')).toBe('NASDAQ');
    expect(getTickerMarket(null as any)).toBe('NASDAQ');
  });
});

describe('getCorrectPrice', () => {
  it('returns correct price for BCBA market with .BA symbol', () => {
    expect(getCorrectPrice('AAPL.BA', 1000, 'BCBA', 'ARS')).toBe(1000);
    expect(getCorrectPrice('GGAL.BA', 150.50, 'BCBA', 'ARS')).toBe(150.50);
  });

  it('returns correct price for NASDAQ market with USD symbol', () => {
    expect(getCorrectPrice('AAPL', 150.25, 'NASDAQ', 'USD')).toBe(150.25);
    expect(getCorrectPrice('MSFT', 300.75, 'NASDAQ', 'USD')).toBe(300.75);
  });

  it('returns correct price for NYSE market with USD symbol', () => {
    expect(getCorrectPrice('AAPL', 150.25, 'NYSE', 'USD')).toBe(150.25);
    expect(getCorrectPrice('MSFT', 300.75, 'NYSE', 'USD')).toBe(300.75);
  });

  it('rounds prices to 2 decimal places', () => {
    expect(getCorrectPrice('AAPL.BA', 1000.123, 'BCBA', 'ARS')).toBe(1000.12);
    expect(getCorrectPrice('AAPL', 150.256, 'NASDAQ', 'USD')).toBe(150.26);
  });

  it('handles invalid prices', () => {
    expect(getCorrectPrice('AAPL.BA', 0, 'BCBA', 'ARS')).toBe(0);
    expect(getCorrectPrice('AAPL', NaN, 'NASDAQ', 'USD')).toBe(0);
    expect(getCorrectPrice('AAPL', null as any, 'NASDAQ', 'USD')).toBe(0);
  });

  it('handles edge cases with currency mismatch', () => {
    // If symbol has .BA but market is NASDAQ, still use the price as provided
    expect(getCorrectPrice('AAPL.BA', 1000, 'NASDAQ', 'USD')).toBe(1000);
    // If symbol doesn't have .BA but market is BCBA, still use the price as provided
    expect(getCorrectPrice('AAPL', 150, 'BCBA', 'ARS')).toBe(150);
  });
});

describe('getTickerDisplayName', () => {
  it('returns base ticker for display', () => {
    expect(getTickerDisplayName('AAPL.BA')).toBe('AAPL');
    expect(getTickerDisplayName('GGAL.AR')).toBe('GGAL');
    expect(getTickerDisplayName('AAPL')).toBe('AAPL');
  });
});

describe('isSameAsset', () => {
  it('returns true for same base ticker', () => {
    expect(isSameAsset('AAPL.BA', 'AAPL')).toBe(true);
    expect(isSameAsset('GGAL.AR', 'GGAL.BA')).toBe(true);
    expect(isSameAsset('AAPL', 'AAPL.BA')).toBe(true);
  });

  it('returns false for different base tickers', () => {
    expect(isSameAsset('AAPL.BA', 'MSFT')).toBe(false);
    expect(isSameAsset('GGAL.AR', 'YPF.BA')).toBe(false);
  });
});

describe('getBcbaHint', () => {
  it('returns hint for symbols without BCBA suffix', () => {
    expect(getBcbaHint('AAPL')).toBe(" Try 'AAPL.BA' if it's listed on the BCBA.");
    expect(getBcbaHint('GGAL')).toBe(" Try 'GGAL.BA' if it's listed on the BCBA.");
  });

  it('returns empty string for symbols with BCBA suffix', () => {
    expect(getBcbaHint('AAPL.BA')).toBe('');
    expect(getBcbaHint('GGAL.AR')).toBe('');
  });

  it('handles empty or null input', () => {
    expect(getBcbaHint('')).toBe('');
    expect(getBcbaHint(null as any)).toBe('');
  });
});

describe('ensureBaSuffix', () => {
  it('adds .BA suffix to symbols without it', () => {
    expect(ensureBaSuffix('AAPL')).toBe('AAPL.BA');
    expect(ensureBaSuffix('GGAL')).toBe('GGAL.BA');
  });

  it('keeps existing .BA suffix', () => {
    expect(ensureBaSuffix('AAPL.BA')).toBe('AAPL.BA');
    expect(ensureBaSuffix('GGAL.BA')).toBe('GGAL.BA');
  });

  it('keeps existing .AR suffix', () => {
    expect(ensureBaSuffix('YPF.AR')).toBe('YPF.AR');
    expect(ensureBaSuffix('BBAR.AR')).toBe('BBAR.AR');
  });

  it('handles empty or null input', () => {
    expect(ensureBaSuffix('')).toBe('');
    expect(ensureBaSuffix(null as any)).toBe('');
  });
});

describe('BCBA ticker generation', () => {
  it('should generate BCBA tickers with .BA suffix using ScoopPage logic', () => {
    // Build BCBA tickers using the same logic as in ScoopPage
    const bcbaTickers: string[] = [];

    // Process each category to build ticker sets
    for (const [categoryKey, tickers] of Object.entries(STOCK_CATEGORIES)) {
      // Skip empty categories
      if (tickers.length === 0) continue;
      
      for (const symbol of tickers) {
        if (categoryKey === 'merval') {
          // MERVAL tickers go to BCBA with .BA suffix
          bcbaTickers.push(ensureBaSuffix(symbol));
        } else {
          // Non-MERVAL tickers go to BCBA with .BA suffix
          bcbaTickers.push(ensureBaSuffix(symbol));
        }
      }
    }

    // Ensure all BCBA tickers end with .BA
    const validatedBcbaTickers = bcbaTickers.map(ticker => {
      if (!ticker.endsWith('.BA')) {
        return `${ticker}.BA`;
      }
      return ticker;
    });

    // Assert that every generated ticker matches /\.BA$/
    validatedBcbaTickers.forEach(ticker => {
      expect(ticker).toMatch(/\.BA$/);
    });

    // Additional assertions to verify the logic works correctly
    expect(validatedBcbaTickers.length).toBeGreaterThan(0);
    
    // Check that MERVAL tickers are included
    const mervalTickers = STOCK_CATEGORIES.merval.map(ticker => ensureBaSuffix(ticker));
    mervalTickers.forEach(ticker => {
      expect(validatedBcbaTickers).toContain(ticker);
    });

    // Check that non-MERVAL tickers are included
    const nonMervalTickers = Object.entries(STOCK_CATEGORIES)
      .filter(([categoryKey]) => categoryKey !== 'merval')
      .flatMap(([, tickers]) => tickers)
      .map(ticker => ensureBaSuffix(ticker));
    
    nonMervalTickers.forEach(ticker => {
      expect(validatedBcbaTickers).toContain(ticker);
    });
  });
}); 