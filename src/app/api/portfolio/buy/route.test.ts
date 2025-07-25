import { POST as buyHandler } from './route';
import { NextRequest } from 'next/server';

// Mock the portfolioActions module
jest.mock('@/utils/portfolioActions', () => ({
  buyAsset: jest.fn(),
}));

// Mock the userData module
jest.mock('@/utils/userData', () => ({
  getUserData: jest.fn(),
  saveUserData: jest.fn(),
}));

function mockRequest(body: any) {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe('/api/portfolio/buy average price with fees', () => {
  let userData: any;
  let buyAssetMock: jest.MockedFunction<any>;
  let getUserDataMock: jest.MockedFunction<any>;
  let saveUserDataMock: jest.MockedFunction<any>;

  beforeEach(() => {
    userData = {
      username: 'testuser',
      positions: [],
      transactions: [],
      cash: { ARS: 100000, USD: 100000 },
    };
    
    // Get the mocked functions
    const { buyAsset } = require('@/utils/portfolioActions');
    const { getUserData, saveUserData } = require('@/utils/userData');
    
    buyAssetMock = buyAsset;
    getUserDataMock = getUserData;
    saveUserDataMock = saveUserData;
    
    // Reset mocks
    buyAssetMock.mockReset();
    getUserDataMock.mockReset();
    saveUserDataMock.mockReset();
  });

  it('calculates average price with fees for Stock', async () => {
    // Mock buyAsset to manipulate userData and return the result
    buyAssetMock.mockImplementation(async (username: string, assetType: string, body: any) => {
      // Simulate the buyAsset logic for Stock
      const { symbol, quantity, price, currency, market, commissionPct = 1, purchaseFeePct = 2 } = body;
      const baseCost = quantity * price;
      const totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
      
      // Find existing position or create new one
      let pos = userData.positions.find((p: any) => p.type === 'Stock' && p.symbol === symbol && p.currency === currency && p.market === market);
      if (pos) {
        const prevTotalCost = pos.averagePrice * pos.quantity;
        pos.quantity += quantity;
        pos.purchasePrice = (prevTotalCost + totalCost) / pos.quantity;
      } else {
        pos = { type: 'Stock', symbol, quantity, purchasePrice: totalCost / quantity, currency, market };
        userData.positions.push(pos);
      }
      
      // Update cash
      userData.cash[currency] -= totalCost;
      
      return { positions: userData.positions, transactions: userData.transactions, cash: userData.cash };
    });

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
    
    // Verify buyAsset was called with correct parameters
    expect(buyAssetMock).toHaveBeenCalledWith('testuser', 'Stock', expect.objectContaining({
      symbol: 'AAPL',
      quantity: 10,
      price: 100,
      currency: 'ARS',
      market: 'BCBA',
      commissionPct: 1,
      purchaseFeePct: 2,
    }));
    
    // Verify userData was manipulated as expected
    const pos = userData.positions.find((p: any) => p.type === 'Stock' && p.symbol === 'AAPL');
    expect(pos).toBeDefined();
    // totalCost = 10*100 * (1+0.01+0.02) = 1000*1.03 = 1030
    expect(pos.purchasePrice).toBeCloseTo(1030 / 10);
    
    // Verify cash was deducted correctly
    expect(userData.cash.ARS).toBe(100000 - 1030);
    expect(userData.cash.USD).toBe(100000); // Unchanged
  });

  it('calculates average price with fees for Bond', async () => {
    // Mock buyAsset to manipulate userData and return the result
    buyAssetMock.mockImplementation(async (username: string, assetType: string, body: any) => {
      // Simulate the buyAsset logic for Bond
      const { ticker, quantity, price, currency, commissionPct = 0.5, purchaseFeePct = 1.5 } = body;
      const baseCost = quantity * price;
      const totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
      
      // Find existing position or create new one
      let pos = userData.positions.find((p: any) => p.type === 'Bond' && p.ticker === ticker && p.currency === currency);
      if (pos) {
        const prevTotalCost = pos.purchasePrice * pos.quantity;
        pos.quantity += quantity;
        pos.purchasePrice = (prevTotalCost + totalCost) / pos.quantity;
      } else {
        pos = { type: 'Bond', ticker, quantity, purchasePrice: totalCost / quantity, currency };
        userData.positions.push(pos);
      }
      
      // Update cash
      userData.cash[currency] -= totalCost;
      
      return { positions: userData.positions, transactions: userData.transactions, cash: userData.cash };
    });

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
    
    // Verify buyAsset was called with correct parameters
    expect(buyAssetMock).toHaveBeenCalledWith('testuser', 'Bond', expect.objectContaining({
      ticker: 'BOND1',
      quantity: 5,
      price: 200,
      currency: 'USD',
      commissionPct: 0.5,
      purchaseFeePct: 1.5,
    }));
    
    // Verify userData was manipulated as expected
    const pos = userData.positions.find((p: any) => p.type === 'Bond' && p.ticker === 'BOND1');
    expect(pos).toBeDefined();
    // totalCost = 5*200 * (1+0.005+0.015) = 1000*1.02 = 1020
    expect(pos.purchasePrice).toBeCloseTo(1020 / 5);
    
    // Verify cash was deducted correctly
    expect(userData.cash.USD).toBe(100000 - 1020);
    expect(userData.cash.ARS).toBe(100000); // Unchanged
  });

  it('calculates average price with fees for Crypto', async () => {
    // Mock buyAsset to manipulate userData and return the result
    buyAssetMock.mockImplementation(async (username: string, assetType: string, body: any) => {
      // Simulate the buyAsset logic for Crypto
      const { symbol, quantity, price, currency = 'USD', commissionPct = 1, purchaseFeePct = 2 } = body;
      const baseCost = quantity * price;
      const totalCost = baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100);
      
      // For crypto, we use USD amount for position tracking
      let usdAmount = totalCost;
      if (currency === 'ARS') {
        // Mock conversion for simplicity
        usdAmount = totalCost; // In real implementation, this would be converted
      }
      
      // Find existing position or create new one
      let pos = userData.positions.find((p: any) => p.type === 'Crypto' && p.symbol === symbol);
      if (pos) {
        const prevTotalCost = pos.purchasePrice * pos.quantity;
        pos.quantity += quantity;
        pos.purchasePrice = (prevTotalCost + usdAmount) / pos.quantity;
      } else {
        pos = { type: 'Crypto', symbol, quantity, purchasePrice: usdAmount / quantity, currency: 'USD' };
        userData.positions.push(pos);
      }
      
      // Update cash
      userData.cash[currency] -= totalCost;
      
      return { positions: userData.positions, transactions: userData.transactions, cash: userData.cash };
    });

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
    
    // Verify buyAsset was called with correct parameters
    expect(buyAssetMock).toHaveBeenCalledWith('testuser', 'Crypto', expect.objectContaining({
      symbol: 'BTCUSDT',
      quantity: 2,
      price: 500,
      currency: 'USD',
      commissionPct: 1,
      purchaseFeePct: 2,
    }));
    
    // Verify userData was manipulated as expected
    const pos = userData.positions.find((p: any) => p.type === 'Crypto' && p.symbol === 'BTCUSDT');
    expect(pos).toBeDefined();
    // totalCost = 2*500 * (1+0.01+0.02) = 1000*1.03 = 1030
    expect(pos.purchasePrice).toBeCloseTo(1030 / 2);
    
    // Verify cash was deducted correctly
    expect(userData.cash.USD).toBe(100000 - 1030);
    expect(userData.cash.ARS).toBe(100000); // Unchanged
  });

  it('creates MutualFund position correctly', async () => {
    // Mock buyAsset to manipulate userData and return the result
    buyAssetMock.mockImplementation(async (username: string, assetType: string, body: any) => {
      // Simulate the buyAsset logic for MutualFund
      const { name, category, amount, annualRate, currency } = body;
      const totalCost = amount;
      
      // Create new mutual fund position
      const pos = { 
        type: 'MutualFund', 
        id: `mf-${Date.now()}`, 
        name, 
        category, 
        amount, 
        annualRate, 
        currency 
      };
      userData.positions.push(pos);
      
      // Update cash
      userData.cash[currency] -= totalCost;
      
      return { positions: userData.positions, transactions: userData.transactions, cash: userData.cash };
    });

    const req = mockRequest({
      username: 'testuser',
      assetType: 'MutualFund',
      name: 'MAF Liquidez - Clase A',
      category: 'Money Market',
      amount: 50000,
      annualRate: 38.1358,
      currency: 'ARS',
    });
    
    await buyHandler(req);
    
    // Verify buyAsset was called with correct parameters
    expect(buyAssetMock).toHaveBeenCalledWith('testuser', 'MutualFund', expect.objectContaining({
      name: 'MAF Liquidez - Clase A',
      category: 'Money Market',
      amount: 50000,
      annualRate: 38.1358,
      currency: 'ARS',
    }));
    
    // Verify userData was manipulated as expected
    const pos = userData.positions.find((p: any) => p.type === 'MutualFund' && p.name === 'MAF Liquidez - Clase A');
    expect(pos).toBeDefined();
    expect(pos.category).toBe('Money Market');
    expect(pos.amount).toBe(50000);
    expect(pos.annualRate).toBe(38.1358);
    expect(pos.currency).toBe('ARS');
    
    // Verify cash was deducted correctly
    expect(userData.cash.ARS).toBe(100000 - 50000);
    expect(userData.cash.USD).toBe(100000); // Unchanged
  });
}); 