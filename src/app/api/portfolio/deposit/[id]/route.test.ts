import { PUT, DELETE } from '@/app/api/portfolio/deposit/[id]/route';
import { promises as fs } from 'fs';
import path from 'path';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

const mockUserData = {
  username: 'testuser',
  cash: { ARS: 1000, USD: 0 },
  transactions: [
    { id: 'dep1', type: 'Deposit', date: '2023-01-01', amount: 500, currency: 'ARS' },
    { id: 'buy1', type: 'Buy', assetType: 'Stock', symbol: 'AAPL', quantity: 2, price: 150, date: '2023-01-02', currency: 'USD', market: 'NASDAQ' },
  ],
};

describe('Deposit API - Dynamic Route', () => {
  beforeEach(() => {
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockUserData));
    (fs.writeFile as jest.Mock).mockClear();
  });

  describe('PUT /api/portfolio/deposit/{id}', () => {
    it('should update a deposit and adjust cash for the same currency', async () => {
      const request = new Request('http://localhost/api/portfolio/deposit/dep1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', amount: 700, date: '2023-01-05', currency: 'ARS' }),
      });

      const response = await PUT(request, { params: { id: 'dep1' } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Deposit updated successfully');

      const savedData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(savedData.cash.ARS).toBe(1200); // 1000 - 500 + 700
      expect(savedData.cash.USD).toBe(0);
      expect(savedData.transactions[0].amount).toBe(700);
      expect(savedData.transactions[0].date).toBe('2023-01-05');
      expect(savedData.transactions[0].currency).toBe('ARS');
    });

    it('should update a deposit and adjust cash when changing currency', async () => {
      const request = new Request('http://localhost/api/portfolio/deposit/dep1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', amount: 100, date: '2023-01-05', currency: 'USD' }),
      });

      const response = await PUT(request, { params: { id: 'dep1' } });

      expect(response.status).toBe(200);
      
      const savedData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      // Old ARS deposit of 500 is reversed, new USD deposit of 100 is added.
      expect(savedData.cash.ARS).toBe(500); // 1000 - 500
      expect(savedData.cash.USD).toBe(100); // 0 + 100
      expect(savedData.transactions[0].amount).toBe(100);
      expect(savedData.transactions[0].currency).toBe('USD');
    });

    it('should return 400 for missing required fields', async () => {
      const request = new Request('http://localhost/api/portfolio/deposit/dep1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser' }), // Missing amount and date
      });

      const response = await PUT(request, { params: { id: 'dep1' } });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Missing required fields');
    });

    it('should return 404 for non-existent transaction', async () => {
      const request = new Request('http://localhost/api/portfolio/deposit/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', amount: 700, date: '2023-01-05' }),
      });

      const response = await PUT(request, { params: { id: 'nonexistent' } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Transaction not found');
    });

    it('should return 400 for non-deposit transaction', async () => {
      const request = new Request('http://localhost/api/portfolio/deposit/buy1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', amount: 700, date: '2023-01-05' }),
      });

      const response = await PUT(request, { params: { id: 'buy1' } });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Transaction is not a deposit');
    });
  });

  describe('DELETE /api/portfolio/deposit/{id}', () => {
    it('should delete a deposit and adjust cash', async () => {
      const request = new Request('http://localhost/api/portfolio/deposit/dep1?username=testuser', {
        method: 'DELETE',
      });
      
      const response = await DELETE(request, { params: { id: 'dep1' } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Deposit deleted successfully');
      
      const savedData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(savedData.cash.ARS).toBe(500); // 1000 - 500
      expect(savedData.transactions.length).toBe(1);
      expect(savedData.transactions[0].id).toBe('buy1');
    });

    it('should fail to delete if it results in negative cash', async () => {
        // Set cash lower than the deposit amount for this specific test
        const lowCashUserData = { ...mockUserData, cash: { ARS: 400, USD: 0 } };
        (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(lowCashUserData));

        const request = new Request('http://localhost/api/portfolio/deposit/dep1?username=testuser', {
            method: 'DELETE',
        });

        const response = await DELETE(request, { params: { id: 'dep1' } });
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe('Cannot delete deposit, insufficient available cash');
        expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should return 400 for missing username parameter', async () => {
      const request = new Request('http://localhost/api/portfolio/deposit/dep1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'dep1' } });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Missing required query parameters');
    });

    it('should return 404 for non-existent transaction', async () => {
      const request = new Request('http://localhost/api/portfolio/deposit/nonexistent?username=testuser', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'nonexistent' } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Transaction not found');
    });

    it('should return 400 for non-deposit transaction', async () => {
      const request = new Request('http://localhost/api/portfolio/deposit/buy1?username=testuser', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'buy1' } });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Transaction is not a deposit');
    });
  });
}); 