import { 
  fetchFundTNA, 
  updateFundTNAHistory, 
  updateAllFundsTNA,
  getTNAForDate,
  getLatestTNA
} from '../tnaService';
import { MutualFundPosition } from '@/types';
import { fetchFondosTNA } from '../cafciService';

// Mock the cafciService
jest.mock('../cafciService');
const mockFetchFondosTNA = fetchFondosTNA as jest.MockedFunction<typeof fetchFondosTNA>;

describe('tnaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchFundTNA', () => {
    it('should fetch TNA for a fund successfully', async () => {
      const mockResponse = {
        success: true,
        data: [
          { fondo: 'Fondo Test', tna: 75.5, rendimiento_mensual: 6.2, categoria: 'Money Market' }
        ],
        stats: { totalFunds: 1, lastUpdate: Date.now(), cacheAge: 0, isValid: true },
        timestamp: new Date().toISOString()
      };
      
      mockFetchFondosTNA.mockResolvedValue(mockResponse);
      
      const result = await fetchFundTNA('Fondo Test');
      
      expect(result).toBe(75.5);
      expect(mockFetchFondosTNA).toHaveBeenCalledWith({ search: 'Fondo Test' });
    });

    it('should return null when no fund is found', async () => {
      const mockResponse = {
        success: true,
        data: [],
        stats: { totalFunds: 0, lastUpdate: Date.now(), cacheAge: 0, isValid: true },
        timestamp: new Date().toISOString()
      };
      
      mockFetchFondosTNA.mockResolvedValue(mockResponse);
      
      const result = await fetchFundTNA('Non Existent Fund');
      
      expect(result).toBeNull();
    });

    it('should return null when fund has no TNA', async () => {
      const mockResponse = {
        success: true,
        data: [
          { fondo: 'Fondo Test', tna: null, rendimiento_mensual: 6.2, categoria: 'Money Market' }
        ],
        stats: { totalFunds: 1, lastUpdate: Date.now(), cacheAge: 0, isValid: true },
        timestamp: new Date().toISOString()
      };
      
      mockFetchFondosTNA.mockResolvedValue(mockResponse);
      
      const result = await fetchFundTNA('Fondo Test');
      
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockFetchFondosTNA.mockRejectedValue(new Error('API Error'));
      
      const result = await fetchFundTNA('Fondo Test');
      
      expect(result).toBeNull();
    });
  });

  describe('updateFundTNAHistory', () => {
    it('should add new TNA entry to empty history', () => {
      const fund: MutualFundPosition = {
        type: 'MutualFund',
        id: '1',
        name: 'Fondo Test',
        category: 'Money Market',
        amount: 10000,
        annualRate: 75,
        currency: 'ARS',
        startDate: '2024-01-01'
      };
      
      const today = new Date().toISOString().split('T')[0];
      const result = updateFundTNAHistory(fund, 80.0);
      
      expect(result.tnaHistory).toHaveLength(1);
      expect(result.tnaHistory![0]).toEqual({ date: today, tna: 80.0 });
      expect(result.currentTna).toBe(80.0);
    });

    it('should update existing TNA entry for today', () => {
      const fund: MutualFundPosition = {
        type: 'MutualFund',
        id: '1',
        name: 'Fondo Test',
        category: 'Money Market',
        amount: 10000,
        annualRate: 75,
        currency: 'ARS',
        startDate: '2024-01-01',
        tnaHistory: [
          { date: '2024-01-01', tna: 75.0 },
          { date: '2024-01-02', tna: 76.0 }
        ]
      };
      
      const today = new Date().toISOString().split('T')[0];
      const result = updateFundTNAHistory(fund, 80.0);
      
      expect(result.tnaHistory).toHaveLength(3);
      expect(result.tnaHistory![2]).toEqual({ date: today, tna: 80.0 });
      expect(result.currentTna).toBe(80.0);
    });

    it('should replace existing TNA entry for today', () => {
      const today = new Date().toISOString().split('T')[0];
      const fund: MutualFundPosition = {
        type: 'MutualFund',
        id: '1',
        name: 'Fondo Test',
        category: 'Money Market',
        amount: 10000,
        annualRate: 75,
        currency: 'ARS',
        startDate: '2024-01-01',
        tnaHistory: [
          { date: '2024-01-01', tna: 75.0 },
          { date: today, tna: 76.0 }
        ]
      };
      
      const result = updateFundTNAHistory(fund, 80.0);
      
      expect(result.tnaHistory).toHaveLength(2);
      expect(result.tnaHistory![1]).toEqual({ date: today, tna: 80.0 });
      expect(result.currentTna).toBe(80.0);
    });
  });

  describe('updateAllFundsTNA', () => {
    it('should update TNA for all funds successfully', async () => {
      const funds: MutualFundPosition[] = [
        {
          type: 'MutualFund',
          id: '1',
          name: 'Fondo A',
          category: 'Money Market',
          amount: 10000,
          annualRate: 75,
          currency: 'ARS',
          startDate: '2024-01-01'
        },
        {
          type: 'MutualFund',
          id: '2',
          name: 'Fondo B',
          category: 'Renta Fija',
          amount: 5000,
          annualRate: 60,
          currency: 'ARS',
          startDate: '2024-01-01'
        }
      ];
      
      mockFetchFondosTNA
        .mockResolvedValueOnce({
          success: true,
          data: [{ fondo: 'Fondo A', tna: 80.0, rendimiento_mensual: 6.5, categoria: 'Money Market' }],
          stats: { totalFunds: 1, lastUpdate: Date.now(), cacheAge: 0, isValid: true },
          timestamp: new Date().toISOString()
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ fondo: 'Fondo B', tna: 65.0, rendimiento_mensual: 5.2, categoria: 'Renta Fija' }],
          stats: { totalFunds: 1, lastUpdate: Date.now(), cacheAge: 0, isValid: true },
          timestamp: new Date().toISOString()
        });
      
      const result = await updateAllFundsTNA(funds);
      
      expect(result).toHaveLength(2);
      expect(result[0].currentTna).toBe(80.0);
      expect(result[1].currentTna).toBe(65.0);
      expect(result[0].tnaHistory).toHaveLength(1);
      expect(result[1].tnaHistory).toHaveLength(1);
    });

    it('should handle funds with failed TNA fetch', async () => {
      const funds: MutualFundPosition[] = [
        {
          type: 'MutualFund',
          id: '1',
          name: 'Fondo A',
          category: 'Money Market',
          amount: 10000,
          annualRate: 75,
          currency: 'ARS',
          startDate: '2024-01-01'
        }
      ];
      
      mockFetchFondosTNA.mockResolvedValue({
        success: true,
        data: [],
        stats: { totalFunds: 0, lastUpdate: Date.now(), cacheAge: 0, isValid: true },
        timestamp: new Date().toISOString()
      });
      
      const result = await updateAllFundsTNA(funds);
      
      expect(result).toHaveLength(1);
      expect(result[0].currentTna).toBeUndefined();
      expect(result[0].tnaHistory).toBeUndefined();
    });
  });

  describe('getTNAForDate', () => {
    it('should return TNA for specific date', () => {
      const fund: MutualFundPosition = {
        type: 'MutualFund',
        id: '1',
        name: 'Fondo Test',
        category: 'Money Market',
        amount: 10000,
        annualRate: 75,
        currency: 'ARS',
        startDate: '2024-01-01',
        tnaHistory: [
          { date: '2024-01-01', tna: 75.0 },
          { date: '2024-01-15', tna: 80.0 },
          { date: '2024-01-30', tna: 85.0 }
        ]
      };
      
      const result = getTNAForDate(fund, '2024-01-15');
      
      expect(result).toBe(80.0);
    });

    it('should return null for date not in history', () => {
      const fund: MutualFundPosition = {
        type: 'MutualFund',
        id: '1',
        name: 'Fondo Test',
        category: 'Money Market',
        amount: 10000,
        annualRate: 75,
        currency: 'ARS',
        startDate: '2024-01-01',
        tnaHistory: [
          { date: '2024-01-01', tna: 75.0 },
          { date: '2024-01-15', tna: 80.0 }
        ]
      };
      
      const result = getTNAForDate(fund, '2024-01-20');
      
      expect(result).toBeNull();
    });

    it('should return null when no history exists', () => {
      const fund: MutualFundPosition = {
        type: 'MutualFund',
        id: '1',
        name: 'Fondo Test',
        category: 'Money Market',
        amount: 10000,
        annualRate: 75,
        currency: 'ARS',
        startDate: '2024-01-01'
      };
      
      const result = getTNAForDate(fund, '2024-01-01');
      
      expect(result).toBeNull();
    });
  });

  describe('getLatestTNA', () => {
    it('should return most recent TNA from history', () => {
      const fund: MutualFundPosition = {
        type: 'MutualFund',
        id: '1',
        name: 'Fondo Test',
        category: 'Money Market',
        amount: 10000,
        annualRate: 75,
        currency: 'ARS',
        startDate: '2024-01-01',
        tnaHistory: [
          { date: '2024-01-01', tna: 75.0 },
          { date: '2024-01-15', tna: 80.0 },
          { date: '2024-01-30', tna: 85.0 }
        ]
      };
      
      const result = getLatestTNA(fund);
      
      expect(result).toBe(85.0);
    });

    it('should return currentTna when no history exists', () => {
      const fund: MutualFundPosition = {
        type: 'MutualFund',
        id: '1',
        name: 'Fondo Test',
        category: 'Money Market',
        amount: 10000,
        annualRate: 75,
        currency: 'ARS',
        startDate: '2024-01-01',
        currentTna: 80.0
      };
      
      const result = getLatestTNA(fund);
      
      expect(result).toBe(80.0);
    });

    it('should return null when no TNA data exists', () => {
      const fund: MutualFundPosition = {
        type: 'MutualFund',
        id: '1',
        name: 'Fondo Test',
        category: 'Money Market',
        amount: 10000,
        annualRate: 75,
        currency: 'ARS',
        startDate: '2024-01-01'
      };
      
      const result = getLatestTNA(fund);
      
      expect(result).toBeNull();
    });
  });
});
