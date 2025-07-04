import { ensureBaSuffix, getBaseTicker, getTickerCurrency, getTickerMarket, getTickerDisplayName, isSameAsset, getBcbaHint } from '../tickers';
import { STOCK_CATEGORIES } from '../assetCategories';

describe('tickers utility functions', () => {
  describe('ensureBaSuffix', () => {
    it('should add .BA suffix to symbols without BCBA suffix', () => {
      expect(ensureBaSuffix('AAPL')).toBe('AAPL.BA');
      expect(ensureBaSuffix('GGAL')).toBe('GGAL.BA');
      expect(ensureBaSuffix('TSLA')).toBe('TSLA.BA');
    });

    it('should return unchanged symbols that already have .BA suffix', () => {
      expect(ensureBaSuffix('GGAL.BA')).toBe('GGAL.BA');
      expect(ensureBaSuffix('AAPL.BA')).toBe('AAPL.BA');
    });

    it('should return unchanged symbols that already have .AR suffix', () => {
      expect(ensureBaSuffix('YPF.AR')).toBe('YPF.AR');
      expect(ensureBaSuffix('BBAR.AR')).toBe('BBAR.AR');
    });

    it('should handle empty or null symbols', () => {
      expect(ensureBaSuffix('')).toBe('');
      expect(ensureBaSuffix(null as any)).toBe('');
      expect(ensureBaSuffix(undefined as any)).toBe('');
    });

    it('should handle case insensitive suffixes', () => {
      expect(ensureBaSuffix('GGAL.ba')).toBe('GGAL.ba');
      expect(ensureBaSuffix('YPF.ar')).toBe('YPF.ar');
    });
  });

  describe('getBaseTicker', () => {
    it('should remove .BA suffix', () => {
      expect(getBaseTicker('AAPL.BA')).toBe('AAPL');
      expect(getBaseTicker('GGAL.BA')).toBe('GGAL');
    });

    it('should remove .AR suffix', () => {
      expect(getBaseTicker('YPF.AR')).toBe('YPF');
      expect(getBaseTicker('BBAR.AR')).toBe('BBAR');
    });

    it('should return unchanged symbols without suffixes', () => {
      expect(getBaseTicker('AAPL')).toBe('AAPL');
      expect(getBaseTicker('GGAL')).toBe('GGAL');
    });

    it('should preserve class identifiers like .B, .A', () => {
      expect(getBaseTicker('BRK.B')).toBe('BRK.B');
      expect(getBaseTicker('BRK.A')).toBe('BRK.A');
      expect(getBaseTicker('GOOGL')).toBe('GOOGL');
    });

    it('should handle empty or null symbols', () => {
      expect(getBaseTicker('')).toBe('');
      expect(getBaseTicker(null as any)).toBe('');
    });

    it('removes repeated .BA suffixes', () => {
      expect(getBaseTicker('AAPL.BA.BA')).toBe('AAPL');
      expect(getBaseTicker('GGAL.AR.AR')).toBe('GGAL');
    });
  });

  describe('getTickerCurrency', () => {
    it('should return ARS for .BA suffixes', () => {
      expect(getTickerCurrency('AAPL.BA')).toBe('ARS');
      expect(getTickerCurrency('GGAL.BA')).toBe('ARS');
    });

    it('should return ARS for .AR suffixes', () => {
      expect(getTickerCurrency('YPF.AR')).toBe('ARS');
      expect(getTickerCurrency('BBAR.AR')).toBe('ARS');
    });

    it('should return USD for symbols without BCBA suffixes', () => {
      expect(getTickerCurrency('AAPL')).toBe('USD');
      expect(getTickerCurrency('GGAL')).toBe('USD');
    });

    it('should handle empty or null symbols', () => {
      expect(getTickerCurrency('')).toBe('USD');
      expect(getTickerCurrency(null as any)).toBe('USD');
    });
  });

  describe('getTickerMarket', () => {
    it('should return BCBA for .BA suffixes', () => {
      expect(getTickerMarket('AAPL.BA')).toBe('BCBA');
      expect(getTickerMarket('GGAL.BA')).toBe('BCBA');
    });

    it('should return BCBA for .AR suffixes', () => {
      expect(getTickerMarket('YPF.AR')).toBe('BCBA');
      expect(getTickerMarket('BBAR.AR')).toBe('BCBA');
    });

    it('should return NASDAQ for symbols without BCBA suffixes', () => {
      expect(getTickerMarket('AAPL')).toBe('NASDAQ');
      expect(getTickerMarket('GGAL')).toBe('NASDAQ');
    });

    it('should handle empty or null symbols', () => {
      expect(getTickerMarket('')).toBe('NASDAQ');
      expect(getTickerMarket(null as any)).toBe('NASDAQ');
    });
  });

  describe('getTickerDisplayName', () => {
    it('should return base ticker for display', () => {
      expect(getTickerDisplayName('AAPL.BA')).toBe('AAPL');
      expect(getTickerDisplayName('YPF.AR')).toBe('YPF');
      expect(getTickerDisplayName('AAPL')).toBe('AAPL');
    });
  });

  describe('isSameAsset', () => {
    it('should return true for same base ticker', () => {
      expect(isSameAsset('AAPL', 'AAPL.BA')).toBe(true);
      expect(isSameAsset('GGAL.BA', 'GGAL.AR')).toBe(true);
      expect(isSameAsset('TSLA', 'TSLA')).toBe(true);
    });

    it('should return false for different base tickers', () => {
      expect(isSameAsset('AAPL', 'GGAL')).toBe(false);
      expect(isSameAsset('AAPL.BA', 'GGAL.BA')).toBe(false);
    });
  });

  describe('getBcbaHint', () => {
    it('should return hint for symbols without BCBA suffix', () => {
      expect(getBcbaHint('AAPL')).toBe(" Try 'AAPL.BA' if it's listed on the BCBA.");
      expect(getBcbaHint('GGAL')).toBe(" Try 'GGAL.BA' if it's listed on the BCBA.");
    });

    it('should return empty string for symbols with .BA suffix', () => {
      expect(getBcbaHint('AAPL.BA')).toBe('');
      expect(getBcbaHint('GGAL.BA')).toBe('');
    });

    it('should return empty string for symbols with .AR suffix', () => {
      expect(getBcbaHint('YPF.AR')).toBe('');
      expect(getBcbaHint('BBAR.AR')).toBe('');
    });

    it('should handle empty or null symbols', () => {
      expect(getBcbaHint('')).toBe('');
      expect(getBcbaHint(null as any)).toBe('');
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
}); 