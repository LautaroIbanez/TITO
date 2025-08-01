import { NextRequest } from 'next/server';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn(),
}));

// Mock the indicators service
jest.mock('@/services/indicators', () => ({
  fetchEconomicIndicators: jest.fn(),
}));

// Import the route after mocking
import { GET } from '../route';

// Get the mocked functions
const mockFs = require('fs').promises;
const mockPath = require('path');
const mockFetchEconomicIndicators = require('@/services/indicators').fetchEconomicIndicators;

describe('/api/fondos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.join.mockReturnValue('/mock/indicators.json');
  });

  it('should return mutual funds data with all categories', async () => {
    const mockData = {
      mutualFunds: {
        moneyMarket: [
          {
            fondo: 'MAF Liquidez - Clase A',
            tna: 38.1358,
            rendimiento_mensual: 1.7762,
            categoria: 'Money Market'
          }
        ],
        rentaFija: [
          {
            fondo: 'MAF Ahorro Plus - Clase C',
            tna: 103.6435,
            rendimiento_mensual: 43.6277,
            categoria: 'Renta Fija'
          }
        ],
        rentaVariable: [
          {
            fondo: 'Alpha Latam - Clase A',
            tna: 25.2159,
            rendimiento_mensual: -3.4227,
            categoria: 'Renta Variable'
          }
        ],
        rentaMixta: [
          {
            fondo: 'Schroder Retorno Absoluto Dólares - Clase B',
            tna: 6.2266,
            rendimiento_mensual: -4.3686,
            categoria: 'Renta Mixta'
          }
        ]
      },
      otherFunds: {
        data: [
          {
            fondo: 'SUPERVIELLE',
            tna: 0.32,
            categoria: 'Otros'
          }
        ]
      }
    };

    mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

    const request = new NextRequest('http://localhost:3000/api/fondos');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockFs.readFile).toHaveBeenCalled();
  });

  it('should handle missing mutualFunds data', async () => {
    const mockData = {
      inflation: { data: [] },
      dollars: { data: [] }
    };

    mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

    const request = new NextRequest('http://localhost:3000/api/fondos');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });

  it('should handle file read errors', async () => {
    mockFs.readFile.mockRejectedValue(new Error('File not found'));

    const request = new NextRequest('http://localhost:3000/api/fondos');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });

  it('should handle invalid JSON data', async () => {
    mockFs.readFile.mockResolvedValue('invalid json');

    const request = new NextRequest('http://localhost:3000/api/fondos');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });

  it('should return empty arrays when categories are missing', async () => {
    const mockData = {
      mutualFunds: {},
      otherFunds: {}
    };

    mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

    const request = new NextRequest('http://localhost:3000/api/fondos');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('should fetch fresh data when indicators file is missing', async () => {
    const mockFreshData = {
      mutualFunds: {
        moneyMarket: [
          {
            fondo: 'Fresh Fund - Clase A',
            tna: 45.0,
            rendimiento_mensual: 2.0,
            categoria: 'Money Market'
          }
        ],
        rentaFija: [],
        rentaVariable: [],
        rentaMixta: []
      },
      otherFunds: {
        data: []
      }
    };

    mockFs.readFile.mockRejectedValue(new Error('File not found'));
    mockFetchEconomicIndicators.mockResolvedValue(mockFreshData);
    mockFs.writeFile.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/fondos');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockFetchEconomicIndicators).toHaveBeenCalled();
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '/mock/indicators.json',
      JSON.stringify(mockFreshData, null, 2)
    );
  });

  it('should fetch fresh data when indicators file is empty', async () => {
    const mockFreshData = {
      mutualFunds: {
        moneyMarket: [
          {
            fondo: 'Fresh Fund - Clase A',
            tna: 45.0,
            rendimiento_mensual: 2.0,
            categoria: 'Money Market'
          }
        ],
        rentaFija: [],
        rentaVariable: [],
        rentaMixta: []
      },
      otherFunds: {
        data: []
      }
    };

    mockFs.readFile.mockResolvedValue(JSON.stringify({}));
    mockFetchEconomicIndicators.mockResolvedValue(mockFreshData);
    mockFs.writeFile.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/fondos');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockFetchEconomicIndicators).toHaveBeenCalled();
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '/mock/indicators.json',
      JSON.stringify(mockFreshData, null, 2)
    );
  });

  it('should fetch fresh data when mutualFunds is missing', async () => {
    const mockFreshData = {
      mutualFunds: {
        moneyMarket: [
          {
            fondo: 'Fresh Fund - Clase A',
            tna: 45.0,
            rendimiento_mensual: 2.0,
            categoria: 'Money Market'
          }
        ],
        rentaFija: [],
        rentaVariable: [],
        rentaMixta: []
      },
      otherFunds: {
        data: []
      }
    };

    mockFs.readFile.mockResolvedValue(JSON.stringify({ inflation: {}, dollars: {} }));
    mockFetchEconomicIndicators.mockResolvedValue(mockFreshData);
    mockFs.writeFile.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/fondos');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockFetchEconomicIndicators).toHaveBeenCalled();
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '/mock/indicators.json',
      JSON.stringify(mockFreshData, null, 2)
    );
  });

  it('should continue with fresh data even if writing to file fails', async () => {
    const mockFreshData = {
      mutualFunds: {
        moneyMarket: [
          {
            fondo: 'Fresh Fund - Clase A',
            tna: 45.0,
            rendimiento_mensual: 2.0,
            categoria: 'Money Market'
          }
        ],
        rentaFija: [],
        rentaVariable: [],
        rentaMixta: []
      },
      otherFunds: {
        data: []
      }
    };

    mockFs.readFile.mockRejectedValue(new Error('File not found'));
    mockFetchEconomicIndicators.mockResolvedValue(mockFreshData);
    mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

    const request = new NextRequest('http://localhost:3000/api/fondos');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockFetchEconomicIndicators).toHaveBeenCalled();
    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  it('should handle errors from fetchEconomicIndicators', async () => {
    mockFs.readFile.mockRejectedValue(new Error('File not found'));
    mockFetchEconomicIndicators.mockRejectedValue(new Error('API error'));

    const request = new NextRequest('http://localhost:3000/api/fondos');
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(mockFetchEconomicIndicators).toHaveBeenCalled();
  });
}); 