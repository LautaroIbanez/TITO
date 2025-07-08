import { GET as historyHandler } from './route';
import { NextRequest } from 'next/server';

// Mock the portfolioHistory module
jest.mock('@/utils/portfolioHistory', () => ({
  loadOrGeneratePortfolioHistory: jest.fn(),
}));

// Mock the userData module
jest.mock('@/utils/userData', () => ({
  getUserData: jest.fn(),
}));

function mockRequest(username?: string) {
  const url = username 
    ? `http://localhost:3000/api/portfolio/history?username=${username}`
    : 'http://localhost:3000/api/portfolio/history';
  
  return {
    url,
  } as unknown as NextRequest;
}

describe('/api/portfolio/history', () => {
  let loadOrGeneratePortfolioHistoryMock: jest.MockedFunction<any>;
  let getUserDataMock: jest.MockedFunction<any>;

  beforeEach(() => {
    // Get the mocked functions
    const { loadOrGeneratePortfolioHistory } = require('@/utils/portfolioHistory');
    const { getUserData } = require('@/utils/userData');
    
    loadOrGeneratePortfolioHistoryMock = loadOrGeneratePortfolioHistory;
    getUserDataMock = getUserData;
    
    // Reset mocks
    loadOrGeneratePortfolioHistoryMock.mockReset();
    getUserDataMock.mockReset();
  });

  it('should return portfolio history for valid user', async () => {
    const mockUser = { username: 'testuser', positions: [], transactions: [] };
    const mockHistory = [
      {
        fecha: '2024-01-01',
        total_portfolio_ars: 100000,
        total_portfolio_usd: 2000,
        capital_invertido_ars: 80000,
        capital_invertido_usd: 1600,
        ganancias_netas_ars: 20000,
        ganancias_netas_usd: 400,
        efectivo_disponible_ars: 10000,
        efectivo_disponible_usd: 200,
      },
      {
        fecha: '2024-01-02',
        total_portfolio_ars: 105000,
        total_portfolio_usd: 2100,
        capital_invertido_ars: 80000,
        capital_invertido_usd: 1600,
        ganancias_netas_ars: 25000,
        ganancias_netas_usd: 500,
        efectivo_disponible_ars: 12000,
        efectivo_disponible_usd: 240,
      },
    ];

    getUserDataMock.mockResolvedValue(mockUser);
    loadOrGeneratePortfolioHistoryMock.mockResolvedValue(mockHistory);

    const req = mockRequest('testuser');
    const response = await historyHandler(req);

    expect(response.status).toBe(200);
    expect(getUserDataMock).toHaveBeenCalledWith('testuser');
    expect(loadOrGeneratePortfolioHistoryMock).toHaveBeenCalledWith('testuser');
  });

  it('should return non-empty generated history with initial cash and continuous dates when no history file exists', async () => {
    const initialCash = { ARS: 5000, USD: 1000 };
    const mockUser = {
      username: 'testuser',
      positions: [],
      transactions: [
        { id: '1', type: 'Deposit', amount: 5000, currency: 'ARS', date: '2024-01-01' },
        { id: '2', type: 'Deposit', amount: 1000, currency: 'USD', date: '2024-01-01' },
      ],
      cash: initialCash,
      historicalPrices: {},
    };
    // Simulate generated history for 3 days
    const generatedHistory = [
      {
        fecha: '2024-01-01',
        total_portfolio_ars: 5000,
        total_portfolio_usd: 1000,
        capital_invertido_ars: 0,
        capital_invertido_usd: 0,
        ganancias_netas_ars: 0,
        ganancias_netas_usd: 0,
        efectivo_disponible_ars: 5000,
        efectivo_disponible_usd: 1000,
      },
      {
        fecha: '2024-01-02',
        total_portfolio_ars: 5000,
        total_portfolio_usd: 1000,
        capital_invertido_ars: 0,
        capital_invertido_usd: 0,
        ganancias_netas_ars: 0,
        ganancias_netas_usd: 0,
        efectivo_disponible_ars: 5000,
        efectivo_disponible_usd: 1000,
      },
      {
        fecha: '2024-01-03',
        total_portfolio_ars: 5000,
        total_portfolio_usd: 1000,
        capital_invertido_ars: 0,
        capital_invertido_usd: 0,
        ganancias_netas_ars: 0,
        ganancias_netas_usd: 0,
        efectivo_disponible_ars: 5000,
        efectivo_disponible_usd: 1000,
      },
    ];
    getUserDataMock.mockResolvedValue(mockUser);
    loadOrGeneratePortfolioHistoryMock.mockResolvedValue(generatedHistory);

    const req = mockRequest('testuser');
    const response = await historyHandler(req);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(Array.isArray(json.history)).toBe(true);
    expect(json.history.length).toBeGreaterThan(0);
    // First record should include initial cash
    expect(json.history[0].efectivo_disponible_ars).toBe(initialCash.ARS);
    expect(json.history[0].efectivo_disponible_usd).toBe(initialCash.USD);
    // Dates should be continuous
    const dates = json.history.map((r: any) => r.fecha);
    for (let i = 1; i < dates.length; ++i) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      expect((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)).toBe(1);
    }
  });

  it('should return empty history for user with no history', async () => {
    const mockUser = { username: 'testuser', positions: [], transactions: [] };

    getUserDataMock.mockResolvedValue(mockUser);
    loadOrGeneratePortfolioHistoryMock.mockResolvedValue([]);

    const req = mockRequest('testuser');
    const response = await historyHandler(req);

    expect(response.status).toBe(200);
    expect(getUserDataMock).toHaveBeenCalledWith('testuser');
    expect(loadOrGeneratePortfolioHistoryMock).toHaveBeenCalledWith('testuser');
  });

  it('should return 400 error when username is missing', async () => {
    const req = mockRequest();
    const response = await historyHandler(req);

    expect(response.status).toBe(400);
    expect(getUserDataMock).not.toHaveBeenCalled();
    expect(loadOrGeneratePortfolioHistoryMock).not.toHaveBeenCalled();
  });

  it('should return 404 error when user is not found', async () => {
    getUserDataMock.mockResolvedValue(null);

    const req = mockRequest('nonexistentuser');
    const response = await historyHandler(req);

    expect(response.status).toBe(404);
    expect(getUserDataMock).toHaveBeenCalledWith('nonexistentuser');
    expect(loadOrGeneratePortfolioHistoryMock).not.toHaveBeenCalled();
  });

  it('should return 500 error when getUserData throws an error', async () => {
    getUserDataMock.mockRejectedValue(new Error('Database connection failed'));

    const req = mockRequest('testuser');
    const response = await historyHandler(req);

    expect(response.status).toBe(500);
    expect(getUserDataMock).toHaveBeenCalledWith('testuser');
    expect(loadOrGeneratePortfolioHistoryMock).not.toHaveBeenCalled();
  });

  it('should return 500 error when loadPortfolioHistory throws an error', async () => {
    const mockUser = { username: 'testuser', positions: [], transactions: [] };

    getUserDataMock.mockResolvedValue(mockUser);
    loadOrGeneratePortfolioHistoryMock.mockRejectedValue(new Error('File system error'));

    const req = mockRequest('testuser');
    const response = await historyHandler(req);

    expect(response.status).toBe(500);
    expect(getUserDataMock).toHaveBeenCalledWith('testuser');
    expect(loadOrGeneratePortfolioHistoryMock).toHaveBeenCalledWith('testuser');
  });
}); 