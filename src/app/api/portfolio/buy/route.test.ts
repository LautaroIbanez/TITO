import { POST as buyHandler } from './route';
import { NextRequest } from 'next/server';

function mockRequest(body: any) {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe('/api/portfolio/buy average price with fees', () => {
  let userData: any;
  let saveUserDataMock: jest.SpyInstance;
  let getUserDataMock: jest.SpyInstance;

  beforeEach(() => {
    userData = {
      username: 'testuser',
      positions: [],
      transactions: [],
      cash: { ARS: 100000, USD: 100000 },
    };
    jest.resetModules();
    saveUserDataMock = jest.spyOn(require('./route'), 'saveUserData').mockImplementation(async () => {});
    getUserDataMock = jest.spyOn(require('./route'), 'getUserData').mockImplementation(async () => userData);
  });

  afterEach(() => {
    saveUserDataMock.mockRestore();
    getUserDataMock.mockRestore();
  });

  it('calculates average price with fees for Stock', async () => {
    const req = mockRequest({
      username: 'testuser',
      assetType: 'Stock',
      symbol: 'AAPL',
      quantity: 10,
      price: 100,
      currency: 'ARS',
      market: 'BCBA',
      commissionPct: 1,
      purchaseFeePct: 2,
    });
    await buyHandler(req);
    const pos = userData.positions.find((p: any) => p.type === 'Stock' && p.symbol === 'AAPL');
    // totalCost = 10*100 * (1+0.01+0.02) = 1000*1.03 = 1030
    expect(pos).toBeDefined();
    expect(pos.averagePrice).toBeCloseTo(1030 / 10);
  });

  it('calculates average price with fees for Bond', async () => {
    const req = mockRequest({
      username: 'testuser',
      assetType: 'Bond',
      ticker: 'BOND1',
      quantity: 5,
      price: 200,
      currency: 'USD',
      commissionPct: 0.5,
      purchaseFeePct: 1.5,
    });
    await buyHandler(req);
    const pos = userData.positions.find((p: any) => p.type === 'Bond' && p.ticker === 'BOND1');
    // totalCost = 5*200 * (1+0.005+0.015) = 1000*1.02 = 1020
    expect(pos).toBeDefined();
    expect(pos.averagePrice).toBeCloseTo(1020 / 5);
  });

  it('calculates average price with fees for Crypto', async () => {
    // Mock convertCurrency to identity for simplicity
    jest.spyOn(require('@/utils/currency'), 'convertCurrency').mockResolvedValue(1030);
    const req = mockRequest({
      username: 'testuser',
      assetType: 'Crypto',
      symbol: 'BTCUSDT',
      quantity: 2,
      price: 500,
      currency: 'USD',
      commissionPct: 1,
      purchaseFeePct: 2,
    });
    await buyHandler(req);
    const pos = userData.positions.find((p: any) => p.type === 'Crypto' && p.symbol === 'BTCUSDT');
    // totalCost = 2*500 * (1+0.01+0.02) = 1000*1.03 = 1030
    expect(pos).toBeDefined();
    expect(pos.averagePrice).toBeCloseTo(1030 / 2);
  });
}); 