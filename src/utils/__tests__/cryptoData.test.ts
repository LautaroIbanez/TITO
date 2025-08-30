import { promises as fs } from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { PriceData, Technicals, Fundamentals } from '@/types/finance';
import { getPortfolioData } from '../portfolioData';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
  },
}));

// Mock the cryptoData module
jest.mock('../cryptoData');

// Import the mocked module
import * as cryptoDataModule from '../cryptoData';

// Mock fetch
global.fetch = jest.fn();

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
});

describe('cryptoData', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');
    // Set up default mock implementations
    (cryptoDataModule.getCryptoPrices as jest.Mock).mockResolvedValue([]);
    (cryptoDataModule.getCryptoTechnicals as jest.Mock).mockResolvedValue(null);
    (cryptoDataModule.getCurrentCryptoPrice as jest.Mock).mockResolvedValue(null);
  });

  describe('getCryptoPrices', () => {
    // Use the mocked implementation for these tests
    const getCryptoPrices = cryptoDataModule.getCryptoPrices;
    const mockBinanceData = [
      [1640995200000, '50000.00', '51000.00', '49000.00', '50500.00', '1000.00'],
      [1641081600000, '50500.00', '52000.00', '50000.00', '51500.00', '1200.00'],
      [1641168000000, '51500.00', '53000.00', '51000.00', '52500.00', '1100.00'],
    ];
    const expectedPriceData: PriceData[] = [
      { date: '2022-01-01', open: 50000, high: 51000, low: 49000, close: 50500, volume: 1000 },
      { date: '2022-01-02', open: 50500, high: 52000, low: 50000, close: 51500, volume: 1200 },
      { date: '2022-01-03', open: 51500, high: 53000, low: 51000, close: 52500, volume: 1100 },
    ];
    it('should fetch and save crypto prices when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({}));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockBinanceData),
      } as any);
      const result = await getCryptoPrices('BTC', '1d');
      expect(result).toEqual(expectedPriceData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.binance.com/api/v3/klines?symbol=BTC&interval=1d&limit=1825'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('BTC.json'),
        JSON.stringify(expectedPriceData, null, 2)
      );
    });
    it('should return cached data when file exists and is up to date', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(expectedPriceData));
      const result = await getCryptoPrices('BTC', '1d');
      expect(result).toEqual(expectedPriceData);
    });
    it('should fetch incremental data when file exists but is outdated', async () => {
      const oldData = [expectedPriceData[0]];
      const newData = [
        [1641254400000, '52500.00', '54000.00', '52000.00', '53500.00', '1300.00'],
      ];
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(oldData));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({}));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(newData),
      } as any);
      const result = await getCryptoPrices('BTC', '1d');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(oldData[0]);
      expect(result[1].date).toBe('2022-01-04');
    });
    it('should handle API errors gracefully', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({}));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as any);
      const result = await getCryptoPrices('BTC', '1d');
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        '[BTC] Error fetching crypto history (1d):',
        expect.any(Error)
      );
    });
    it('should respect rate limiting', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      const recentLog = {
        'crypto-BTC': {
          history: dayjs().subtract(2, 'second').toISOString(),
        },
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(recentLog));
      const result = await getCryptoPrices('BTC', '1d');
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        '[BTC] Skipping crypto history fetch due to rate limit.'
      );
    });
    it('should handle weekly interval correctly', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({}));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockBinanceData),
      } as any);
      const result = await getCryptoPrices('BTC', '1wk');
      expect(result).toEqual(expectedPriceData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.binance.com/api/v3/klines?symbol=BTC&interval=1w&limit=260'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('BTC.1wk.json'),
        JSON.stringify(expectedPriceData, null, 2)
      );
    });
  });

  describe('getCryptoTechnicals', () => {
    const mockPrices: PriceData[] = Array.from({ length: 250 }, (_, i) => ({
      date: dayjs().subtract(250 - i, 'day').format('YYYY-MM-DD'),
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 1000 + i,
    }));
    const mockTechnicals: Technicals = {
      rsi: 65.5,
      macd: 2.5,
      sma200: 150.0,
      sma40: 145.0,
      ema12: 155.0,
      ema25: 153.0,
      ema26: 152.0,
      ema50: 148.0,
      ema150: 140.0,
      adx: 25.0,
      pdi: 30.0,
      mdi: 20.0,
      koncorde: {
        bullish: true,
        bearish: false,
        neutral: false,
        strength: 75
      },
      updatedAt: dayjs().toISOString(),
    };
    beforeEach(() => {
      (cryptoDataModule.getCryptoPrices as jest.Mock).mockReset();
    });
    it('should calculate and save technicals when no recent file exists', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      (cryptoDataModule.getCryptoPrices as jest.Mock).mockResolvedValue(mockPrices);
      mockFs.writeFile.mockResolvedValue(undefined);
      const result = await cryptoDataModule.getCryptoTechnicals('BTC', '1d');
      expect(result).toBeDefined();
      expect(result?.rsi).toBeDefined();
      expect(result?.macd).toBeDefined();
      expect(result?.sma200).toBeDefined();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('BTC.json'),
        expect.any(String)
      );
    });
    it('should return cached technicals when file is recent', async () => {
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockTechnicals));
      const result = await cryptoDataModule.getCryptoTechnicals('BTC', '1d');
      expect(result).toEqual(mockTechnicals);
    });
    it('should return null when insufficient price data', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      (cryptoDataModule.getCryptoPrices as jest.Mock).mockResolvedValue(mockPrices.slice(0, 50));
      const result = await cryptoDataModule.getCryptoTechnicals('BTC', '1d');
      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        '[BTC] Not enough crypto price data to calculate technicals (1d).'
      );
    });
    it('should handle calculation errors gracefully', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      (cryptoDataModule.getCryptoPrices as jest.Mock).mockResolvedValue(mockPrices);
      mockFs.writeFile.mockRejectedValueOnce(new Error('Write failed'));
      const result = await cryptoDataModule.getCryptoTechnicals('BTC', '1d');
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '[BTC] Error calculating crypto technicals (1d):',
        expect.any(Error)
      );
    });
    it('should handle weekly interval correctly', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      (cryptoDataModule.getCryptoPrices as jest.Mock).mockResolvedValue(mockPrices);
      mockFs.writeFile.mockResolvedValue(undefined);
      const result = await cryptoDataModule.getCryptoTechnicals('BTC', '1wk');
      expect(result).toBeDefined();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('BTC.1wk.json'),
        expect.any(String)
      );
    });
  });

  describe('getCurrentCryptoPrice', () => {
    beforeEach(() => {
      (cryptoDataModule.getCryptoPrices as jest.Mock).mockReset();
    });
    it('should return the latest close price', async () => {
      const mockPrices: PriceData[] = [
        { date: '2022-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000 },
        { date: '2022-01-02', open: 105, high: 115, low: 95, close: 110, volume: 1200 },
      ];
      (cryptoDataModule.getCryptoPrices as jest.Mock).mockResolvedValue(mockPrices);
      const result = await cryptoDataModule.getCurrentCryptoPrice('BTC');
      expect(result).toBe(110);
    });
    it('should return null when no price data available', async () => {
      (cryptoDataModule.getCryptoPrices as jest.Mock).mockResolvedValue([]);
      const result = await cryptoDataModule.getCurrentCryptoPrice('BTC');
      expect(result).toBeNull();
    });
    it('should handle errors gracefully', async () => {
      (cryptoDataModule.getCryptoPrices as jest.Mock).mockRejectedValue(new Error('API Error'));
      const result = await cryptoDataModule.getCurrentCryptoPrice('BTC');
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '[BTC] Error getting current crypto price:',
        expect.any(Error)
      );
    });
  });

  describe('Helper functions', () => {
    // Use the mocked implementation for these tests
    const getCryptoPrices = cryptoDataModule.getCryptoPrices;
    it('should convert Binance kline to PriceData format correctly', async () => {
      const mockBinanceKline = [1640995200000, '50000.00', '51000.00', '49000.00', '50500.00', '1000.00'];
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({}));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([mockBinanceKline]),
      } as any);
      const result = await getCryptoPrices('BTC', '1d');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2022-01-01',
        open: 50000.00,
        high: 51000.00,
        low: 49000.00,
        close: 50500.00,
        volume: 1000.00,
      });
    });
    it('should handle rate limiting correctly', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      const recentLog = {
        'crypto-BTC': {
          history: dayjs().subtract(3, 'second').toISOString(),
        },
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(recentLog));
      const result = await getCryptoPrices('BTC', '1d');
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

describe('portfolioData - crypto folder structure', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const user = {
    username: 'testuser',
    createdAt: '',
    profileCompleted: true,
    positions: [
      { type: 'Crypto', symbol: 'BTCUSDT', quantity: 1, averagePrice: 10000, currency: 'USD' },
    ],
    transactions: [],
    goals: [],
    cash: { ARS: 0, USD: 10000 },
  };
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');
  });
  it('loads crypto prices and technicals from correct folders', async () => {
    // Mock user file
    mockFs.readFile.mockImplementation(async (filePath: any) => {
      if ((filePath as string).endsWith('testuser.json')) {
        return JSON.stringify(user);
      }
      if ((filePath as string).endsWith('crypto/BTCUSDT.json')) {
        return JSON.stringify([{ date: '2024-01-01', open: 10000, high: 11000, low: 9000, close: 10500, volume: 1 }]);
      }
      if ((filePath as string).endsWith('crypto-technicals/BTCUSDT.json')) {
        return JSON.stringify({ rsi: 60, macd: 1, sma200: 10000, ema12: 10200, ema26: 10100, ema50: 10050, adx: 20, pdi: 25, mdi: 15, updatedAt: '2024-01-01T00:00:00Z' });
      }
      return JSON.stringify(null);
    });
    const data = await getPortfolioData('testuser');
    expect(data.historicalPrices['BTCUSDT']).toEqual([
      { date: '2024-01-01', open: 10000, high: 11000, low: 9000, close: 10500, volume: 1 },
    ]);
    expect(data.technicals['BTCUSDT']).toEqual({ rsi: 60, macd: 1, sma200: 10000, ema12: 10200, ema26: 10100, ema50: 10050, adx: 20, pdi: 25, mdi: 15, updatedAt: '2024-01-01T00:00:00Z' });
  });
}); 