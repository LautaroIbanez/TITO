import { calculatePortfolioValueHistory } from '../calculatePortfolioValue';
import { PortfolioTransaction } from '@/types';
import dayjs from 'dayjs';
import * as currencyUtils from '../currency';

jest.mock('../currency', () => ({
  ...jest.requireActual('../currency'),
  getExchangeRate: jest.fn(() => Promise.resolve(1)),
}));

describe('calculatePortfolioValueHistory', () => {
  it('should correctly calculate portfolio value with a fixed-term deposit', async () => {
    const today = dayjs();
    const depositDate = today.subtract(30, 'days');
    const maturityDate = today;
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: depositDate.toISOString(),
        type: 'Deposit',
        amount: 10000,
        currency: 'ARS',
      },
      {
        id: '2',
        date: depositDate.toISOString(),
        type: 'Create',
        assetType: 'FixedTermDeposit',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5, // 0.1% daily rate for simplicity
        termDays: 30,
        maturityDate: maturityDate.toISOString(),
        currency: 'ARS',
      },
    ];

    // Calculate history from 35 days before deposit to 10 days after maturity
    const startDate = depositDate.subtract(5, 'days');
    const endDate = maturityDate.add(10, 'days');
    const days = endDate.diff(startDate, 'day') + 1;
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { days });

    // History should include the expected range
    expect(history.length).toBe(days);

    // Day before deposit - value should be 0
    const dayBefore = history.find(h => h.date === depositDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBefore).toBeDefined();
    expect(dayBefore!.valueARS).toBe(0);

    // First day of deposit - value should be the principal (cash deposit - fixed term creation = 0, but fixed term value = 10000)
    const firstDay = history.find(h => h.date === depositDate.format('YYYY-MM-DD'));
    expect(firstDay).toBeDefined();
    expect(firstDay!.valueARS).toBe(10000);

    // Mid-term (15 days in) - value should include accrued interest
    const midDay = history.find(h => h.date === depositDate.add(15, 'days').format('YYYY-MM-DD'));
    expect(midDay).toBeDefined();
    const expectedMidValue = 10000 + (10000 * (0.365 / 365) * 15);
    expect(midDay!.valueARS).toBeCloseTo(expectedMidValue);

    // Maturity day - value should include full interest
    const maturityDay = history.find(h => h.date === maturityDate.format('YYYY-MM-DD'));
    expect(maturityDay).toBeDefined();
    const expectedFinalValue = 10000 + (10000 * (0.365 / 365) * 30);
    expect(maturityDay!.valueARS).toBeCloseTo(expectedFinalValue);

    // Day after maturity - deposit value should remain constant (not drop to 0)
    const dayAfter = history.find(h => h.date === maturityDate.add(1, 'day').format('YYYY-MM-DD'));
    if(dayAfter) {
      expect(dayAfter.valueARS).toBeCloseTo(expectedFinalValue); // Should remain the same
    }
  });

  it('should remove matured deposit value when withdrawal transaction occurs', async () => {
    const today = dayjs();
    const depositDate = today.subtract(30, 'days');
    const maturityDate = today;
    const withdrawalDate = today.add(5, 'days');
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: depositDate.toISOString(),
        type: 'Deposit',
        amount: 10000,
        currency: 'ARS',
      },
      {
        id: '2',
        date: depositDate.toISOString(),
        type: 'Create',
        assetType: 'FixedTermDeposit',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5,
        termDays: 30,
        maturityDate: maturityDate.toISOString(),
        currency: 'ARS',
      },
      {
        id: '3',
        date: withdrawalDate.toISOString(), // 5 days after maturity
        type: 'Withdrawal',
        amount: 10000 + (10000 * (0.365 / 365) * 30), // Full value including interest
        currency: 'ARS',
      },
    ];

    // Calculate history from 5 days before deposit to 10 days after withdrawal
    const startDate = depositDate.subtract(5, 'days');
    const endDate = withdrawalDate.add(10, 'days');
    const days = endDate.diff(startDate, 'day') + 1;
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { days });

    // Day before withdrawal - value should still include matured deposit
    const dayBeforeWithdrawal = history.find(h => h.date === withdrawalDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBeforeWithdrawal).toBeDefined();
    const expectedFinalValue = 10000 + (10000 * (0.365 / 365) * 30);
    expect(dayBeforeWithdrawal!.valueARS).toBeCloseTo(expectedFinalValue);

    // Day of withdrawal - value should drop to 0
    const withdrawalDay = history.find(h => h.date === withdrawalDate.format('YYYY-MM-DD'));
    expect(withdrawalDay).toBeDefined();
    expect(withdrawalDay!.valueARS).toBe(0);

    // Day after withdrawal - value should remain 0
    const dayAfterWithdrawal = history.find(h => h.date === withdrawalDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterWithdrawal).toBeDefined();
    expect(dayAfterWithdrawal!.valueARS).toBe(0);
  });

  it('should handle multiple deposits and withdrawals correctly', async () => {
    const today = dayjs();
    const deposit1Date = today.subtract(30, 'days');
    const deposit2Date = today.subtract(15, 'days');
    const maturityDate = today;
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: deposit1Date.toISOString(),
        type: 'Deposit',
        amount: 15000,
        currency: 'ARS',
      },
      {
        id: '2',
        date: deposit1Date.toISOString(),
        type: 'Create',
        assetType: 'FixedTermDeposit',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5,
        termDays: 30,
        maturityDate: maturityDate.toISOString(),
        currency: 'ARS',
      },
      {
        id: '3',
        date: deposit2Date.toISOString(),
        type: 'Create',
        assetType: 'FixedTermDeposit',
        provider: 'Test Bank 2',
        amount: 5000,
        annualRate: 36.5,
        termDays: 15,
        maturityDate: maturityDate.toISOString(),
        currency: 'ARS',
      },
    ];

    // Calculate history from 5 days before first deposit to 10 days after maturity
    const startDate = deposit1Date.subtract(5, 'days');
    const endDate = maturityDate.add(10, 'days');
    const days = endDate.diff(startDate, 'day') + 1;
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { days });

    // Day after both deposits mature - should include both matured deposits plus remaining cash
    const dayAfterMaturity = history.find(h => h.date === maturityDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterMaturity).toBeDefined();
    const expectedValue1 = 10000 + (10000 * (0.365 / 365) * 30);
    const expectedValue2 = 5000 + (5000 * (0.365 / 365) * 15);
    const remainingCash = 15000 - 10000 - 5000; // Initial deposit minus both fixed term deposits
    expect(dayAfterMaturity!.valueARS).toBeCloseTo(expectedValue1 + expectedValue2 + remainingCash);
  });

  it('should handle partial withdrawals correctly', async () => {
    const today = dayjs();
    const depositDate = today.subtract(30, 'days');
    const maturityDate = today;
    const withdrawalDate = today.add(5, 'days');
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: depositDate.toISOString(),
        type: 'Deposit',
        amount: 10000,
        currency: 'ARS',
      },
      {
        id: '2',
        date: depositDate.toISOString(),
        type: 'Create',
        assetType: 'FixedTermDeposit',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5,
        termDays: 30,
        maturityDate: maturityDate.toISOString(),
        currency: 'ARS',
      },
      {
        id: '3',
        date: withdrawalDate.toISOString(),
        type: 'Withdrawal',
        amount: 5000, // Partial withdrawal
        currency: 'ARS',
      },
    ];

    // Calculate history from 5 days before deposit to 10 days after withdrawal
    const startDate = depositDate.subtract(5, 'days');
    const endDate = withdrawalDate.add(10, 'days');
    const days = endDate.diff(startDate, 'day') + 1;
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { days });

    // Day after partial withdrawal - value should still include remaining amount
    const dayAfterPartialWithdrawal = history.find(h => h.date === withdrawalDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterPartialWithdrawal).toBeDefined();
    const expectedFinalValue = 10000 + (10000 * (0.365 / 365) * 30);
    const remainingValue = expectedFinalValue - 5000;
    expect(dayAfterPartialWithdrawal!.valueARS).toBeCloseTo(remainingValue);
  });

  it('should track cash balances correctly with deposits and withdrawals', async () => {
    const today = dayjs();
    const depositDate = today.subtract(10, 'days');
    const withdrawalDate = today.subtract(5, 'days');
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: depositDate.toISOString(),
        type: 'Deposit',
        amount: 50000,
        currency: 'ARS',
      },
      {
        id: '2',
        date: withdrawalDate.toISOString(),
        type: 'Withdrawal',
        amount: 20000,
        currency: 'ARS',
      },
    ];

    // Calculate history from 15 days before deposit to 5 days after withdrawal
    const startDate = depositDate.subtract(5, 'days');
    const endDate = withdrawalDate.add(5, 'days');
    const days = endDate.diff(startDate, 'day') + 1;
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { days });

    // Day before deposit - value should be 0
    const dayBeforeDeposit = history.find(h => h.date === depositDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBeforeDeposit).toBeDefined();
    expect(dayBeforeDeposit!.valueARS).toBe(0);

    // Day of deposit - value should be 50000
    const dayOfDeposit = history.find(h => h.date === depositDate.format('YYYY-MM-DD'));
    expect(dayOfDeposit).toBeDefined();
    expect(dayOfDeposit!.valueARS).toBe(50000);

    // Day before withdrawal - value should still be 50000
    const dayBeforeWithdrawal = history.find(h => h.date === withdrawalDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBeforeWithdrawal).toBeDefined();
    expect(dayBeforeWithdrawal!.valueARS).toBe(50000);

    // Day of withdrawal - value should be 30000 (50000 - 20000)
    const dayOfWithdrawal = history.find(h => h.date === withdrawalDate.format('YYYY-MM-DD'));
    expect(dayOfWithdrawal).toBeDefined();
    expect(dayOfWithdrawal!.valueARS).toBe(30000);

    // Day after withdrawal - value should remain 30000
    const dayAfterWithdrawal = history.find(h => h.date === withdrawalDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterWithdrawal).toBeDefined();
    expect(dayAfterWithdrawal!.valueARS).toBe(30000);
  });

  it('should track cash balances correctly with buy and sell transactions', async () => {
    const today = dayjs();
    const depositDate = today.subtract(10, 'days');
    const buyDate = today.subtract(8, 'days');
    const sellDate = today.subtract(5, 'days');
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: depositDate.toISOString(),
        type: 'Deposit',
        amount: 100000,
        currency: 'ARS',
      },
      {
        id: '2',
        date: buyDate.toISOString(),
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        price: 5000,
        commissionPct: 1,
        currency: 'ARS',
        market: 'BCBA',
      },
      {
        id: '3',
        date: sellDate.toISOString(),
        type: 'Sell',
        assetType: 'Stock',
        symbol: 'AAPL',
        quantity: 5,
        price: 5200,
        commissionPct: 1,
        currency: 'ARS',
        market: 'BCBA',
      },
    ];

    const priceHistory = {
      'AAPL': [
        { date: buyDate.format('YYYY-MM-DD'), open: 5000, high: 5000, low: 5000, close: 5000, volume: 1000 },
        { date: sellDate.format('YYYY-MM-DD'), open: 5200, high: 5200, low: 5200, close: 5200, volume: 1000 },
      ]
    };

    // Calculate history from 15 days before deposit to 5 days after sell
    const startDate = depositDate.subtract(5, 'days');
    const endDate = sellDate.add(5, 'days');
    const days = endDate.diff(startDate, 'day') + 1;
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { days });

    // Day of deposit - value should be 100000
    const dayOfDeposit = history.find(h => h.date === depositDate.format('YYYY-MM-DD'));
    expect(dayOfDeposit).toBeDefined();
    expect(dayOfDeposit!.valueARS).toBe(100000);

    // Day of buy - cash should be reduced by purchase amount + commission
    const dayOfBuy = history.find(h => h.date === buyDate.format('YYYY-MM-DD'));
    expect(dayOfBuy).toBeDefined();
    const buyAmount = 10 * 5000; // 50000
    const buyCommission = buyAmount * 0.01; // 500
    const totalBuyCost = buyAmount + buyCommission; // 50500
    const expectedCashAfterBuy = 100000 - totalBuyCost; // 49500
    const expectedStockValue = 10 * 5000; // 50000
    expect(dayOfBuy!.valueARS).toBeCloseTo(expectedCashAfterBuy + expectedStockValue);

    // Day of sell - cash should be increased by sale proceeds - commission, stock value reduced
    const dayOfSell = history.find(h => h.date === sellDate.format('YYYY-MM-DD'));
    expect(dayOfSell).toBeDefined();
    const sellAmount = 5 * 5200; // 26000
    const sellCommission = sellAmount * 0.01; // 260
    const netSellProceeds = sellAmount - sellCommission; // 25740
    const expectedCashAfterSell = expectedCashAfterBuy + netSellProceeds; // 75240
    const expectedStockValueAfterSell = 5 * 5200; // 26000 (5 remaining shares)
    expect(dayOfSell!.valueARS).toBeCloseTo(expectedCashAfterSell + expectedStockValueAfterSell);
  });

  it('should handle USD transactions correctly', async () => {
    const today = dayjs();
    const depositDate = today.subtract(10, 'days');
    const buyDate = today.subtract(5, 'days');
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: depositDate.toISOString(),
        type: 'Deposit',
        amount: 10000,
        currency: 'USD',
      },
      {
        id: '2',
        date: buyDate.toISOString(),
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'AAPL',
        quantity: 5,
        price: 150,
        commissionPct: 1,
        currency: 'USD',
        market: 'NASDAQ',
      },
    ];

    const priceHistory = {
      'AAPL': [
        { date: buyDate.format('YYYY-MM-DD'), open: 150, high: 150, low: 150, close: 150, volume: 1000 },
      ]
    };

    // Calculate history from 15 days before deposit to 5 days after buy
    const startDate = depositDate.subtract(5, 'days');
    const endDate = buyDate.add(5, 'days');
    const days = endDate.diff(startDate, 'day') + 1;
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { days });

    // Day of deposit - value should be 10000 USD
    const dayOfDeposit = history.find(h => h.date === depositDate.format('YYYY-MM-DD'));
    expect(dayOfDeposit).toBeDefined();
    expect(dayOfDeposit!.valueUSD).toBe(10000);

    // Day of buy - cash should be reduced, stock value added
    const dayOfBuy = history.find(h => h.date === buyDate.format('YYYY-MM-DD'));
    expect(dayOfBuy).toBeDefined();
    const buyAmount = 5 * 150; // 750
    const buyCommission = buyAmount * 0.01; // 7.5
    const totalBuyCost = buyAmount + buyCommission; // 757.5
    const expectedCashAfterBuy = 10000 - totalBuyCost; // 9242.5
    const expectedStockValue = 5 * 150; // 750
    expect(dayOfBuy!.valueUSD).toBeCloseTo(expectedCashAfterBuy + expectedStockValue);
  });

  it('should handle mixed ARS and USD transactions correctly', async () => {
    const today = dayjs();
    const arsDepositDate = today.subtract(10, 'days');
    const usdDepositDate = today.subtract(8, 'days');
    const arsBuyDate = today.subtract(5, 'days');
    const usdBuyDate = today.subtract(3, 'days');
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: arsDepositDate.toISOString(),
        type: 'Deposit',
        amount: 50000,
        currency: 'ARS',
      },
      {
        id: '2',
        date: usdDepositDate.toISOString(),
        type: 'Deposit',
        amount: 5000,
        currency: 'USD',
      },
      {
        id: '3',
        date: arsBuyDate.toISOString(),
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'GGAL',
        quantity: 100,
        price: 1000,
        commissionPct: 1,
        currency: 'ARS',
        market: 'BCBA',
      },
      {
        id: '4',
        date: usdBuyDate.toISOString(),
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        commissionPct: 1,
        currency: 'USD',
        market: 'NASDAQ',
      },
    ];

    const priceHistory = {
      'GGAL': [
        { date: arsBuyDate.format('YYYY-MM-DD'), open: 1000, high: 1000, low: 1000, close: 1000, volume: 1000 },
      ],
      'AAPL': [
        { date: usdBuyDate.format('YYYY-MM-DD'), open: 150, high: 150, low: 150, close: 150, volume: 1000 },
      ]
    };

    // Calculate history from 15 days before first deposit to 5 days after last buy
    const startDate = arsDepositDate.subtract(5, 'days');
    const endDate = usdBuyDate.add(5, 'days');
    const days = endDate.diff(startDate, 'day') + 1;
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { days });

    // Day after both deposits - should have both cash balances
    const dayAfterDeposits = history.find(h => h.date === usdDepositDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterDeposits).toBeDefined();
    // The total value will be converted using exchange rate, so we check individual currencies
    expect(dayAfterDeposits!.valueARS).toBeGreaterThan(0);
    expect(dayAfterDeposits!.valueUSD).toBeGreaterThan(0);

    // Day after ARS buy - ARS cash reduced, USD cash unchanged
    const dayAfterArsBuy = history.find(h => h.date === arsBuyDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterArsBuy).toBeDefined();
    const arsBuyAmount = 100 * 1000; // 100000
    const arsBuyCommission = arsBuyAmount * 0.01; // 1000
    const totalArsBuyCost = arsBuyAmount + arsBuyCommission; // 101000
    const expectedArsCashAfterBuy = 50000 - totalArsBuyCost; // -51000 (negative cash)
    const expectedArsStockValue = 100 * 1000; // 100000
    expect(dayAfterArsBuy!.valueARS).toBeCloseTo(expectedArsCashAfterBuy + expectedArsStockValue);
    expect(dayAfterArsBuy!.valueUSD).toBe(5000);

    // Day after USD buy - USD cash reduced, ARS unchanged
    const dayAfterUsdBuy = history.find(h => h.date === usdBuyDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterUsdBuy).toBeDefined();
    const usdBuyAmount = 10 * 150; // 1500
    const usdBuyCommission = usdBuyAmount * 0.01; // 15
    const totalUsdBuyCost = usdBuyAmount + usdBuyCommission; // 1515
    const expectedUsdCashAfterBuy = 5000 - totalUsdBuyCost; // 3485
    const expectedUsdStockValue = 10 * 150; // 1500
    expect(dayAfterUsdBuy!.valueUSD).toBeCloseTo(expectedUsdCashAfterBuy + expectedUsdStockValue);
    expect(dayAfterUsdBuy!.valueARS).toBeCloseTo(expectedArsCashAfterBuy + expectedArsStockValue);
  });
}); 