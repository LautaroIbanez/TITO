import { calculateCategoryValueHistory } from '../categoryValueHistory';
import { calculatePortfolioValueHistory } from '../calculatePortfolioValue';
import { PortfolioTransaction } from '@/types';

describe('Cash Consistency Tests', () => {
  const mockPriceHistory = {
    'AAPL': [
      { date: '2024-01-01', close: 150 },
      { date: '2024-01-02', close: 155 },
      { date: '2024-01-03', close: 160 }
    ],
    'GOOGL': [
      { date: '2024-01-01', close: 2800 },
      { date: '2024-01-02', close: 2850 },
      { date: '2024-01-03', close: 2900 }
    ]
  };

  describe('Deposit Transactions', () => {
    it('should add cash correctly for ARS deposits', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      // Check that cash is properly added
      expect(result.valueHistory[0].categories.cash).toBe(10000);
      expect(result.valueHistory[0].totalValue).toBe(10000);
    });

    it('should add cash correctly for USD deposits', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 1000,
          currency: 'USD'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'USD',
        { days: 3 }
      );

      expect(result.valueHistory[0].categories.cash).toBe(1000);
      expect(result.valueHistory[0].totalValue).toBe(1000);
    });

    it('should handle multiple deposits correctly', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 5000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Deposit',
          amount: 3000,
          currency: 'ARS'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      expect(result.valueHistory[0].categories.cash).toBe(5000);
      expect(result.valueHistory[1].categories.cash).toBe(8000);
      expect(result.valueHistory[2].categories.cash).toBe(8000);
    });
  });

  describe('Withdrawal Transactions', () => {
    it('should subtract cash correctly for withdrawals', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Withdrawal',
          amount: 3000,
          currency: 'ARS'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      expect(result.valueHistory[0].categories.cash).toBe(10000);
      expect(result.valueHistory[1].categories.cash).toBe(7000);
      expect(result.valueHistory[2].categories.cash).toBe(7000);
    });

    it('should not allow negative cash balances', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 1000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Withdrawal',
          amount: 1500,
          currency: 'ARS'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      // Cash should not go negative - it should be 0
      expect(result.valueHistory[1].categories.cash).toBeGreaterThanOrEqual(0);
      expect(result.valueHistory[2].categories.cash).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Buy/Sell Transactions', () => {
    it('should handle buy transactions with fees correctly', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 150,
          commissionPct: 1.5,
          purchaseFeePct: 0.5,
          currency: 'ARS',
          market: 'NASDAQ'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      const expectedCost = 10 * 150; // 1500
      const commission = expectedCost * 0.015; // 22.5
      const purchaseFee = expectedCost * 0.005; // 7.5
      const totalCost = expectedCost + commission + purchaseFee; // 1530
      const expectedCash = 10000 - totalCost; // 8470

      expect(result.valueHistory[1].categories.cash).toBeCloseTo(expectedCash, 0);
    });

    it('should handle sell transactions with fees correctly', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 150,
          currency: 'ARS'
        },
        {
          id: '3',
          date: '2024-01-03',
          type: 'Sell',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 5,
          price: 160,
          commissionPct: 1.0,
          currency: 'ARS'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      const expectedProceeds = 5 * 160; // 800
      const commission = expectedProceeds * 0.01; // 8
      const netProceeds = expectedProceeds - commission; // 792
      const initialCash = 10000 - (10 * 150); // 8500
      const finalCash = initialCash + netProceeds; // 9292

      expect(result.valueHistory[2].categories.cash).toBeCloseTo(finalCash, 0);
    });
  });

  describe('Fixed Term Deposits', () => {
    it('should handle fixed term deposit creation correctly', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Create',
          assetType: 'FixedTermDeposit',
          provider: 'Bank',
          amount: 5000,
          annualRate: 40,
          termDays: 30,
          maturityDate: '2024-02-01',
          currency: 'ARS'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      // Cash should be reduced by deposit amount
      expect(result.valueHistory[1].categories.cash).toBe(5000);
      expect(result.valueHistory[1].categories.deposits).toBeGreaterThan(5000); // Includes interest
    });

    it('should handle caucion creation correctly', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Create',
          assetType: 'Caucion',
          provider: 'Broker',
          amount: 3000,
          annualRate: 50,
          termDays: 7,
          maturityDate: '2024-01-09',
          currency: 'ARS'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      expect(result.valueHistory[1].categories.cash).toBe(7000);
      expect(result.valueHistory[1].categories.cauciones).toBeGreaterThan(3000); // Includes interest
    });
  });

  describe('Portfolio Value History Cash Consistency', () => {
    it('should maintain consistent cash balances in portfolio value history', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 150,
          commissionPct: 1.5,
          currency: 'ARS'
        },
        {
          id: '3',
          date: '2024-01-03',
          type: 'Withdrawal',
          amount: 2000,
          currency: 'ARS'
        }
      ];

      const result = await calculatePortfolioValueHistory(
        transactions,
        mockPriceHistory,
        { days: 3 }
      );

      // Verify cash balances are consistent and non-negative
      result.forEach(entry => {
        expect(entry.cashARS).toBeGreaterThanOrEqual(0);
        expect(entry.cashUSD).toBeGreaterThanOrEqual(0);
      });

      // Verify cash flows correctly
      expect(result[0].cashARS).toBe(10000); // Initial deposit
      expect(result[1].cashARS).toBeLessThan(10000); // After buy
      expect(result[2].cashARS).toBeLessThan(result[1].cashARS); // After withdrawal
    });

    it('should handle mixed currency transactions correctly', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 1000,
          currency: 'USD'
        },
        {
          id: '3',
          date: '2024-01-02',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'GOOGL',
          quantity: 1,
          price: 2800,
          currency: 'USD'
        }
      ];

      const result = await calculatePortfolioValueHistory(
        transactions,
        mockPriceHistory,
        { days: 3 }
      );

      // Verify both currencies are handled correctly
      expect(result[0].cashARS).toBe(10000);
      expect(result[0].cashUSD).toBe(1000);
      expect(result[1].cashUSD).toBeLessThan(1000); // After USD buy
      expect(result[1].cashARS).toBe(10000); // ARS unchanged
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount transactions gracefully', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 0,
          currency: 'ARS'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      expect(result.valueHistory[0].categories.cash).toBe(0);
      expect(result.valueHistory[0].totalValue).toBe(0);
    });

    it('should handle transactions with missing fees gracefully', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 10000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 150,
          currency: 'ARS'
          // No commission or purchase fee
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      const expectedCash = 10000 - (10 * 150); // 8500
      expect(result.valueHistory[1].categories.cash).toBe(expectedCash);
    });

    it('should maintain cash consistency across multiple transaction types', async () => {
      const transactions: PortfolioTransaction[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'Deposit',
          amount: 20000,
          currency: 'ARS'
        },
        {
          id: '2',
          date: '2024-01-02',
          type: 'Buy',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 10,
          price: 150,
          commissionPct: 1.5,
          currency: 'ARS'
        },
        {
          id: '3',
          date: '2024-01-02',
          type: 'Create',
          assetType: 'FixedTermDeposit',
          provider: 'Bank',
          amount: 5000,
          annualRate: 40,
          termDays: 30,
          maturityDate: '2024-02-01',
          currency: 'ARS'
        },
        {
          id: '4',
          date: '2024-01-03',
          type: 'Sell',
          assetType: 'Stock',
          symbol: 'AAPL',
          quantity: 5,
          price: 160,
          commissionPct: 1.0,
          currency: 'ARS'
        },
        {
          id: '5',
          date: '2024-01-03',
          type: 'Withdrawal',
          amount: 2000,
          currency: 'ARS'
        }
      ];

      const result = await calculateCategoryValueHistory(
        transactions,
        mockPriceHistory,
        'ARS',
        { days: 3 }
      );

      // Verify cash never goes negative
      result.valueHistory.forEach(entry => {
        expect(entry.categories.cash).toBeGreaterThanOrEqual(0);
      });

      // Verify cash flows logically
      expect(result.valueHistory[0].categories.cash).toBe(20000); // Initial deposit
      expect(result.valueHistory[1].categories.cash).toBeLessThan(20000); // After buy and deposit creation
      expect(result.valueHistory[2].categories.cash).toBeGreaterThan(result.valueHistory[1].categories.cash); // After sell
      expect(result.valueHistory[2].categories.cash).toBeLessThan(result.valueHistory[1].categories.cash + 2000); // After withdrawal
    });
  });
}); 