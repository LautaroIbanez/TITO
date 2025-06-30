import { ensureBaSuffix, getBaseTicker, getTickerCurrency, getTickerMarket, getTickerDisplayName, isSameAsset, getBcbaHint } from '../tickers';

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

    it('should handle empty or null symbols', () => {
      expect(getBaseTicker('')).toBe('');
      expect(getBaseTicker(null as any)).toBe('');
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
}); 