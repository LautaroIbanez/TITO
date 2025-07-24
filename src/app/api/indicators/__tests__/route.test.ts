import { NextRequest } from 'next/server';

// Mock the services
jest.mock('@/services/indicators', () => ({
  fetchEconomicIndicators: jest.fn(),
  getMockEconomicIndicators: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn(),
  dirname: jest.fn()
}));

// Import the route after mocking
import { GET } from '../route';

// Get the mocked functions
const mockFetchEconomicIndicators = jest.mocked(require('@/services/indicators').fetchEconomicIndicators);
const mockGetMockEconomicIndicators = jest.mocked(require('@/services/indicators').getMockEconomicIndicators);
const mockReadFile = jest.mocked(require('fs').promises.readFile);
const mockWriteFile = jest.mocked(require('fs').promises.writeFile);
const mockMkdir = jest.mocked(require('fs').promises.mkdir);
const mockJoin = jest.mocked(require('path').join);
const mockDirname = jest.mocked(require('path').dirname);

describe('/api/indicators', () => {
  const mockIndicators = {
    inflation: {
      data: [],
      lastValue: 4.5,
      previousValue: 4.2,
      variation: 0.3
    },
    dollars: {
      data: [],
      lastValues: {}
    },
    fixedTerm: {
      data: [],
      top10: []
    },
    mutualFunds: {
      moneyMarket: [],
      rentaFija: [],
      rentaVariable: [],
      rentaMixta: []
    },
    otherFunds: {
      data: [],
      top10: []
    },
    lastUpdated: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJoin.mockReturnValue('/mock/cache/path');
    mockDirname.mockReturnValue('/mock/cache');
  });

  describe('GET', () => {
    it('returns mock data when mock=true parameter is provided', async () => {
      mockGetMockEconomicIndicators.mockReturnValue(mockIndicators);

      const request = new NextRequest('http://localhost:3000/api/indicators?mock=true');
      const response = await GET(request);
      const data = await response.json();

      expect(mockGetMockEconomicIndicators).toHaveBeenCalled();
      expect(data).toEqual(mockIndicators);
      expect(response.status).toBe(200);
    });

    it('uses cached data when available and fresh', async () => {
      const cachedData = {
        ...mockIndicators,
        lastUpdated: new Date().toISOString() // Fresh data
      };

      mockReadFile.mockResolvedValue(JSON.stringify(cachedData));

      const request = new NextRequest('http://localhost:3000/api/indicators');
      const response = await GET(request);
      const data = await response.json();

      expect(mockReadFile).toHaveBeenCalledWith('/mock/cache/path', 'utf-8');
      expect(mockFetchEconomicIndicators).not.toHaveBeenCalled();
      expect(data).toEqual(cachedData);
      expect(response.status).toBe(200);
    });

    it('fetches fresh data when cache is stale', async () => {
      const staleData = {
        ...mockIndicators,
        lastUpdated: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours old
      };

      mockReadFile.mockResolvedValue(JSON.stringify(staleData));
      mockFetchEconomicIndicators.mockResolvedValue(mockIndicators);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/indicators');
      const response = await GET(request);
      const data = await response.json();

      expect(mockReadFile).toHaveBeenCalled();
      expect(mockFetchEconomicIndicators).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
      expect(data).toEqual(mockIndicators);
      expect(response.status).toBe(200);
    });

    it('fetches fresh data when cache file does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));
      mockFetchEconomicIndicators.mockResolvedValue(mockIndicators);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/indicators');
      const response = await GET(request);
      const data = await response.json();

      expect(mockReadFile).toHaveBeenCalled();
      expect(mockFetchEconomicIndicators).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
      expect(data).toEqual(mockIndicators);
      expect(response.status).toBe(200);
    });

    it('falls back to mock data when fetchEconomicIndicators fails', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));
      mockFetchEconomicIndicators.mockRejectedValue(new Error('API error'));
      mockGetMockEconomicIndicators.mockReturnValue(mockIndicators);

      const request = new NextRequest('http://localhost:3000/api/indicators');
      const response = await GET(request);
      const data = await response.json();

      expect(mockFetchEconomicIndicators).toHaveBeenCalled();
      expect(mockGetMockEconomicIndicators).toHaveBeenCalled();
      expect(data).toEqual(mockIndicators);
      expect(response.status).toBe(200);
    });

    it('returns error when both fetch and mock data fail', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));
      mockFetchEconomicIndicators.mockRejectedValue(new Error('API error'));
      mockGetMockEconomicIndicators.mockImplementation(() => {
        throw new Error('Mock data error');
      });

      const request = new NextRequest('http://localhost:3000/api/indicators');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('No se pudieron cargar los indicadores económicos');
    });

    it('creates cache directory if it does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));
      mockFetchEconomicIndicators.mockResolvedValue(mockIndicators);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/indicators');
      await GET(request);

      expect(mockMkdir).toHaveBeenCalledWith('/mock/cache', { recursive: true });
    });

    it('handles invalid cache file gracefully', async () => {
      mockReadFile.mockResolvedValue('invalid json');
      mockFetchEconomicIndicators.mockResolvedValue(mockIndicators);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/indicators');
      const response = await GET(request);
      const data = await response.json();

      expect(mockFetchEconomicIndicators).toHaveBeenCalled();
      expect(data).toEqual(mockIndicators);
      expect(response.status).toBe(200);
    });
  });
}); 