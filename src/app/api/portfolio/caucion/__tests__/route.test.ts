import { NextRequest } from 'next/server';
import { POST, PUT, DELETE } from '../route';
import { promises as fs } from 'fs';
import path from 'path';

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

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('Caución API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.join.mockReturnValue('/mock/path/user.json');
  });

  describe('POST /api/portfolio/caucion', () => {
    it('should create a new caución successfully', async () => {
      const mockUserData = {
        username: 'testuser',
        cash: { ARS: 100000, USD: 0 },
        positions: [],
        transactions: [],
        goals: []
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockUserData));
      mockFs.writeFile.mockResolvedValue();

      const requestBody = {
        username: 'testuser',
        amount: 50000,
        annualRate: 120.5,
        termDays: 30,
        provider: 'BYMA',
        currency: 'ARS'
      };

      const request = new NextRequest('http://localhost/api/portfolio/caucion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Caución created successfully');
      expect(data.transaction).toHaveProperty('id');
      expect(data.transaction.assetType).toBe('Caucion');
      expect(data.position).toHaveProperty('id');
      expect(data.position.type).toBe('Caucion');
      expect(data.cash.ARS).toBe(50000); // 100000 - 50000
    });

    it('should return error for insufficient funds', async () => {
      const mockUserData = {
        username: 'testuser',
        cash: { ARS: 10000, USD: 0 },
        positions: [],
        transactions: [],
        goals: []
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockUserData));

      const requestBody = {
        username: 'testuser',
        amount: 50000,
        annualRate: 120.5,
        termDays: 30,
        provider: 'BYMA',
        currency: 'ARS'
      };

      const request = new NextRequest('http://localhost/api/portfolio/caucion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Insufficient funds');
    });

    it('should return error for missing required fields', async () => {
      const requestBody = {
        username: 'testuser',
        amount: 50000
        // Missing other required fields
      };

      const request = new NextRequest('http://localhost/api/portfolio/caucion', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });
  });

  describe('PUT /api/portfolio/caucion', () => {
    it('should update an existing caución successfully', async () => {
      const mockUserData = {
        username: 'testuser',
        cash: { ARS: 50000, USD: 0 },
        positions: [
          {
            type: 'Caucion',
            id: 'caucion-1',
            provider: 'BYMA',
            amount: 50000,
            annualRate: 120.0,
            startDate: '2024-01-01',
            maturityDate: '2024-02-01',
            currency: 'ARS',
            term: 30
          }
        ],
        transactions: [],
        goals: []
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockUserData));
      mockFs.writeFile.mockResolvedValue();

      const requestBody = {
        username: 'testuser',
        positionId: 'caucion-1',
        amount: 75000,
        annualRate: 125.0,
        termDays: 60,
        provider: 'BYMA',
        currency: 'ARS'
      };

      const request = new NextRequest('http://localhost/api/portfolio/caucion', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Caución updated successfully');
      expect(data.cash.ARS).toBe(25000); // 50000 + 50000 - 75000
    });

    it('should return error for insufficient funds when increasing amount', async () => {
      const mockUserData = {
        username: 'testuser',
        cash: { ARS: 10000, USD: 0 },
        positions: [
          {
            type: 'Caucion',
            id: 'caucion-1',
            provider: 'BYMA',
            amount: 50000,
            annualRate: 120.0,
            startDate: '2024-01-01',
            maturityDate: '2024-02-01',
            currency: 'ARS',
            term: 30
          }
        ],
        transactions: [],
        goals: []
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockUserData));

      const requestBody = {
        username: 'testuser',
        positionId: 'caucion-1',
        amount: 75000,
        annualRate: 125.0,
        termDays: 60,
        provider: 'BYMA',
        currency: 'ARS'
      };

      const request = new NextRequest('http://localhost/api/portfolio/caucion', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Insufficient funds for the increase');
    });
  });

  describe('DELETE /api/portfolio/caucion', () => {
    it('should delete a caución successfully', async () => {
      const mockUserData = {
        username: 'testuser',
        cash: { ARS: 0, USD: 0 },
        positions: [
          {
            type: 'Caucion',
            id: 'caucion-1',
            provider: 'BYMA',
            amount: 50000,
            annualRate: 120.0,
            startDate: '2024-01-01',
            maturityDate: '2024-02-01',
            currency: 'ARS',
            term: 30
          }
        ],
        transactions: [],
        goals: []
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockUserData));
      mockFs.writeFile.mockResolvedValue();

      const request = new NextRequest('http://localhost/api/portfolio/caucion?username=testuser&positionId=caucion-1', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Caución deleted successfully');
      expect(data.cash.ARS).toBe(50000);
    });

    it('should return error for missing query parameters', async () => {
      const request = new NextRequest('http://localhost/api/portfolio/caucion', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required query parameters');
    });
  });
}); 