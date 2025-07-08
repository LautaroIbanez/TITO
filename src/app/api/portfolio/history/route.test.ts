import { GET as historyHandler } from './route';
import { NextRequest } from 'next/server';

// Mock the portfolioHistory module
jest.mock('@/utils/portfolioHistory', () => ({
  loadPortfolioHistory: jest.fn(),
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
  let loadPortfolioHistoryMock: jest.MockedFunction<any>;
  let getUserDataMock: jest.MockedFunction<any>;

  beforeEach(() => {
    // Get the mocked functions
    const { loadPortfolioHistory } = require('@/utils/portfolioHistory');
    const { getUserData } = require('@/utils/userData');
    
    loadPortfolioHistoryMock = loadPortfolioHistory;
    getUserDataMock = getUserData;
    
    // Reset mocks
    loadPortfolioHistoryMock.mockReset();
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
    loadPortfolioHistoryMock.mockResolvedValue(mockHistory);

    const req = mockRequest('testuser');
    const response = await historyHandler(req);

    expect(response.status).toBe(200);
    expect(getUserDataMock).toHaveBeenCalledWith('testuser');
    expect(loadPortfolioHistoryMock).toHaveBeenCalledWith('testuser');
  });

  it('should return empty history for user with no history', async () => {
    const mockUser = { username: 'testuser', positions: [], transactions: [] };

    getUserDataMock.mockResolvedValue(mockUser);
    loadPortfolioHistoryMock.mockResolvedValue([]);

    const req = mockRequest('testuser');
    const response = await historyHandler(req);

    expect(response.status).toBe(200);
    expect(getUserDataMock).toHaveBeenCalledWith('testuser');
    expect(loadPortfolioHistoryMock).toHaveBeenCalledWith('testuser');
  });

  it('should return 400 error when username is missing', async () => {
    const req = mockRequest();
    const response = await historyHandler(req);

    expect(response.status).toBe(400);
    expect(getUserDataMock).not.toHaveBeenCalled();
    expect(loadPortfolioHistoryMock).not.toHaveBeenCalled();
  });

  it('should return 404 error when user is not found', async () => {
    getUserDataMock.mockResolvedValue(null);

    const req = mockRequest('nonexistentuser');
    const response = await historyHandler(req);

    expect(response.status).toBe(404);
    expect(getUserDataMock).toHaveBeenCalledWith('nonexistentuser');
    expect(loadPortfolioHistoryMock).not.toHaveBeenCalled();
  });

  it('should return 500 error when getUserData throws an error', async () => {
    getUserDataMock.mockRejectedValue(new Error('Database connection failed'));

    const req = mockRequest('testuser');
    const response = await historyHandler(req);

    expect(response.status).toBe(500);
    expect(getUserDataMock).toHaveBeenCalledWith('testuser');
    expect(loadPortfolioHistoryMock).not.toHaveBeenCalled();
  });

  it('should return 500 error when loadPortfolioHistory throws an error', async () => {
    const mockUser = { username: 'testuser', positions: [], transactions: [] };

    getUserDataMock.mockResolvedValue(mockUser);
    loadPortfolioHistoryMock.mockRejectedValue(new Error('File system error'));

    const req = mockRequest('testuser');
    const response = await historyHandler(req);

    expect(response.status).toBe(500);
    expect(getUserDataMock).toHaveBeenCalledWith('testuser');
    expect(loadPortfolioHistoryMock).toHaveBeenCalledWith('testuser');
  });
}); 