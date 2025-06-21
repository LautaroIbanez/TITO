import { promises as fs } from 'fs';
import { POST as depositHandler } from '@/app/api/portfolio/deposit/route';
import { POST as buyHandler } from '@/app/api/portfolio/buy/route';
import { POST as sellHandler } from '@/app/api/portfolio/sell/route';
import { UserData } from '@/types';
import { NextRequest } from 'next/server';

jest.mock('fs/promises');

const mockUser: UserData = {
  username: 'testuser',
  createdAt: new Date().toISOString(),
  profileCompleted: true,
  availableCash: 1000,
  positions: [{ symbol: 'AAPL', quantity: 10, averagePrice: 150 }],
  transactions: [],
  goals: [],
};

// Helper to create a mock NextRequest
const createMockRequest = (body: any): NextRequest => {
  const request = {
    json: async () => body,
  } as NextRequest;
  return request;
};

describe('Portfolio Balance API', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockUser));
    (fs.writeFile as jest.Mock).mockClear();
  });

  it('should increase availableCash on deposit', async () => {
    const req = createMockRequest({ username: 'testuser', amount: 500 });
    const response = await depositHandler(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.availableCash).toBe(1500);

    // Verify that the file was written with the updated data
    const writtenData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
    expect(writtenData.availableCash).toBe(1500);
  });

  it('should fail to buy if cash is insufficient', async () => {
    const req = createMockRequest({ username: 'testuser', symbol: 'GOOGL', quantity: 1, price: 2000 });
    const response = await buyHandler(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Insufficient funds');
    expect(body.availableCash).toBe(1000);
    
    // Ensure writeFile was not called
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should decrease availableCash on a successful buy', async () => {
    const req = createMockRequest({ username: 'testuser', symbol: 'GOOGL', quantity: 1, price: 500 });
    const response = await buyHandler(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.availableCash).toBe(500);

    const writtenData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
    expect(writtenData.availableCash).toBe(500);
  });

  it('should credit availableCash correctly on sell', async () => {
    const req = createMockRequest({ username: 'testuser', symbol: 'AAPL', quantity: 5, price: 180 });
    const response = await sellHandler(req);
    const body = await response.json();

    const expectedCash = mockUser.availableCash + (5 * 180);

    expect(response.status).toBe(200);
    expect(body.availableCash).toBe(expectedCash);

    const writtenData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
    expect(writtenData.availableCash).toBe(expectedCash);
    expect(writtenData.positions[0].quantity).toBe(5); // 10 - 5
  });
}); 