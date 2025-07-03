import { calculatePortfolioValueHistory, calculateCurrentValueByCurrency } from '../calculatePortfolioValue';
import { PortfolioTransaction } from '@/types';
import { PriceData } from '@/types/finance';
import dayjs from 'dayjs';
import * as currencyUtils from '../currency';

jest.mock('../currency', () => ({
  ...jest.requireActual('../currency'),
  getExchangeRate: jest.fn((from, to) => {
    if (from === 'USD' && to === 'ARS') return Promise.resolve(1000);
    if (from === 'ARS' && to === 'USD') return Promise.resolve(1/1000);
    return Promise.resolve(1);
  }),
  convertCurrencySync: jest.fn((amount, from, to) => {
    if (from === 'USD' && to === 'ARS') return amount * 1000;
    if (from === 'ARS' && to === 'USD') return amount / 1000;
    return amount;
  }),
}));

describe('calculatePortfolioValueHistory', () => {
  it('should correctly calculate portfolio value with a fixed-term deposit', async () => {
    const depositDate = dayjs('2024-01-01');
    const maturityDate = dayjs('2024-01-31');
    
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
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // History should include the expected range
    expect(history.length).toBe(endDate.diff(startDate, 'day') + 1);

    // Day before deposit - value should be 0
    const dayBefore = history.find(h => h.date === depositDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBefore).toBeDefined();
    expect(dayBefore!.valueARS).toBe(0);
    expect(dayBefore!.valueARSRaw).toBe(0);
    expect(dayBefore!.cashARS).toBe(0);

    // First day of deposit - value should be the principal (cash deposit - fixed term creation = 0, but fixed term value = 10000)
    const firstDay = history.find(h => h.date === depositDate.format('YYYY-MM-DD'));
    expect(firstDay).toBeDefined();
    expect(firstDay!.valueARS).toBe(10000);
    expect(firstDay!.valueARSRaw).toBe(10000);
    expect(firstDay!.cashARS).toBe(0); // Cash was used to create the deposit

    // Mid-term (15 days in) - value should include accrued interest
    const midDay = history.find(h => h.date === depositDate.add(15, 'days').format('YYYY-MM-DD'));
    expect(midDay).toBeDefined();
    const expectedMidValue = 10000 + (10000 * (0.365 / 365) * 15);
    expect(midDay!.valueARS).toBeCloseTo(expectedMidValue);
    expect(midDay!.valueARSRaw).toBeCloseTo(expectedMidValue);
    expect(midDay!.cashARS).toBe(0);

    // Maturity day - value should include full interest
    const maturityDay = history.find(h => h.date === maturityDate.format('YYYY-MM-DD'));
    expect(maturityDay).toBeDefined();
    const expectedFinalValue = 10000 + (10000 * (0.365 / 365) * 30);
    expect(maturityDay!.valueARS).toBeCloseTo(expectedFinalValue);
    expect(maturityDay!.valueARSRaw).toBeCloseTo(expectedFinalValue);
    expect(maturityDay!.cashARS).toBe(0);

    // Day after maturity - deposit value should remain constant (not drop to 0)
    const dayAfter = history.find(h => h.date === maturityDate.add(1, 'day').format('YYYY-MM-DD'));
    if(dayAfter) {
      expect(dayAfter.valueARS).toBeCloseTo(expectedFinalValue); // Should remain the same
      expect(dayAfter.valueARSRaw).toBeCloseTo(expectedFinalValue);
      expect(dayAfter.cashARS).toBe(0);
    }
  });

  it('should remove matured deposit value when withdrawal transaction occurs', async () => {
    const depositDate = dayjs('2024-01-01');
    const maturityDate = dayjs('2024-01-31');
    const withdrawalDate = dayjs('2024-02-05');
    
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
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day before withdrawal - value should still include matured deposit
    const dayBeforeWithdrawal = history.find(h => h.date === withdrawalDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBeforeWithdrawal).toBeDefined();
    const expectedFinalValue = 10000 + (10000 * (0.365 / 365) * 30);
    expect(dayBeforeWithdrawal!.valueARS).toBeCloseTo(expectedFinalValue);
    expect(dayBeforeWithdrawal!.valueARSRaw).toBeCloseTo(expectedFinalValue);
    expect(dayBeforeWithdrawal!.cashARS).toBe(0);

    // Day of withdrawal - value should drop to 0
    const withdrawalDay = history.find(h => h.date === withdrawalDate.format('YYYY-MM-DD'));
    expect(withdrawalDay).toBeDefined();
    expect(withdrawalDay!.valueARS).toBe(0);
    expect(withdrawalDay!.valueARSRaw).toBe(0);
    expect(withdrawalDay!.cashARS).toBe(0);

    // Day after withdrawal - value should remain 0
    const dayAfterWithdrawal = history.find(h => h.date === withdrawalDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterWithdrawal).toBeDefined();
    expect(dayAfterWithdrawal!.valueARS).toBe(0);
    expect(dayAfterWithdrawal!.valueARSRaw).toBe(0);
    expect(dayAfterWithdrawal!.cashARS).toBe(0);
  });

  it('should handle multiple deposits and withdrawals correctly', async () => {
    const deposit1Date = dayjs('2024-01-01');
    const deposit2Date = dayjs('2024-01-16');
    const maturityDate = dayjs('2024-01-31');
    
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
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day after both deposits mature - should include both matured deposits plus remaining cash
    const dayAfterMaturity = history.find(h => h.date === maturityDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterMaturity).toBeDefined();
    const expectedValue1 = 10000 + (10000 * (0.365 / 365) * 30);
    const expectedValue2 = 5000 + (5000 * (0.365 / 365) * 15);
    const remainingCash = 15000 - 10000 - 5000; // Initial deposit minus both fixed term deposits
    expect(dayAfterMaturity!.valueARS).toBeCloseTo(expectedValue1 + expectedValue2 + remainingCash);
    expect(dayAfterMaturity!.valueARSRaw).toBeCloseTo(expectedValue1 + expectedValue2 + remainingCash);
    expect(dayAfterMaturity!.cashARS).toBe(remainingCash);
  });

  it('should handle partial withdrawals correctly', async () => {
    const depositDate = dayjs('2024-01-01');
    const maturityDate = dayjs('2024-01-31');
    const withdrawalDate = dayjs('2024-02-05');
    
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
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day after partial withdrawal - value should still include remaining amount
    const dayAfterPartialWithdrawal = history.find(h => h.date === withdrawalDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterPartialWithdrawal).toBeDefined();
    const expectedFinalValue = 10000 + (10000 * (0.365 / 365) * 30);
    const remainingValue = expectedFinalValue - 5000;
    expect(dayAfterPartialWithdrawal!.valueARS).toBeCloseTo(remainingValue);
    expect(dayAfterPartialWithdrawal!.valueARSRaw).toBeCloseTo(remainingValue);
    expect(dayAfterPartialWithdrawal!.cashARS).toBe(0);
  });

  it('should track cash balances correctly with deposits and withdrawals', async () => {
    const depositDate = dayjs('2024-01-01');
    const withdrawalDate = dayjs('2024-01-06');
    
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
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day before deposit - value should be 0
    const dayBeforeDeposit = history.find(h => h.date === depositDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBeforeDeposit).toBeDefined();
    expect(dayBeforeDeposit!.valueARS).toBe(0);
    expect(dayBeforeDeposit!.valueARSRaw).toBe(0);
    expect(dayBeforeDeposit!.cashARS).toBe(0);

    // Day of deposit - value should be 50000
    const dayOfDeposit = history.find(h => h.date === depositDate.format('YYYY-MM-DD'));
    expect(dayOfDeposit).toBeDefined();
    expect(dayOfDeposit!.valueARS).toBe(50000);
    expect(dayOfDeposit!.valueARSRaw).toBe(50000);
    expect(dayOfDeposit!.cashARS).toBe(50000);

    // Day before withdrawal - value should still be 50000
    const dayBeforeWithdrawal = history.find(h => h.date === withdrawalDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBeforeWithdrawal).toBeDefined();
    expect(dayBeforeWithdrawal!.valueARS).toBe(50000);
    expect(dayBeforeWithdrawal!.valueARSRaw).toBe(50000);
    expect(dayBeforeWithdrawal!.cashARS).toBe(50000);

    // Day of withdrawal - value should be 30000 (50000 - 20000)
    const dayOfWithdrawal = history.find(h => h.date === withdrawalDate.format('YYYY-MM-DD'));
    expect(dayOfWithdrawal).toBeDefined();
    expect(dayOfWithdrawal!.valueARS).toBe(30000);
    expect(dayOfWithdrawal!.valueARSRaw).toBe(30000);
    expect(dayOfWithdrawal!.cashARS).toBe(30000);

    // Day after withdrawal - value should remain 30000
    const dayAfterWithdrawal = history.find(h => h.date === withdrawalDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterWithdrawal).toBeDefined();
    expect(dayAfterWithdrawal!.valueARS).toBe(30000);
    expect(dayAfterWithdrawal!.valueARSRaw).toBe(30000);
    expect(dayAfterWithdrawal!.cashARS).toBe(30000);
  });

  it('should track cash balances correctly with buy and sell transactions', async () => {
    const depositDate = dayjs('2024-01-01');
    const buyDate = dayjs('2024-01-03');
    const sellDate = dayjs('2024-01-06');
    
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
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day of deposit - value should be 100000
    const dayOfDeposit = history.find(h => h.date === depositDate.format('YYYY-MM-DD'));
    expect(dayOfDeposit).toBeDefined();
    expect(dayOfDeposit!.valueARS).toBe(100000);
    expect(dayOfDeposit!.valueARSRaw).toBe(100000);
    expect(dayOfDeposit!.cashARS).toBe(100000);

    // Day of buy - cash should be reduced by purchase amount + commission
    const dayOfBuy = history.find(h => h.date === buyDate.format('YYYY-MM-DD'));
    expect(dayOfBuy).toBeDefined();
    const buyAmount = 10 * 5000; // 50000
    const buyCommission = buyAmount * 0.01; // 500
    const totalBuyCost = buyAmount + buyCommission; // 50500
    const expectedCashAfterBuy = 100000 - totalBuyCost; // 49500
    const expectedStockValue = 10 * 5000; // 50000
    expect(dayOfBuy!.valueARS).toBeCloseTo(expectedCashAfterBuy + expectedStockValue);
    expect(dayOfBuy!.valueARSRaw).toBeCloseTo(expectedCashAfterBuy + expectedStockValue);
    expect(dayOfBuy!.cashARS).toBeCloseTo(expectedCashAfterBuy);

    // Day of sell - cash should be increased by sale proceeds - commission, stock value reduced
    const dayOfSell = history.find(h => h.date === sellDate.format('YYYY-MM-DD'));
    expect(dayOfSell).toBeDefined();
    const sellAmount = 5 * 5200; // 26000
    const sellCommission = sellAmount * 0.01; // 260
    const netSellProceeds = sellAmount - sellCommission; // 25740
    const expectedCashAfterSell = expectedCashAfterBuy + netSellProceeds; // 75240
    const expectedStockValueAfterSell = 5 * 5200; // 26000 (5 remaining shares)
    expect(dayOfSell!.valueARS).toBeCloseTo(expectedCashAfterSell + expectedStockValueAfterSell);
    expect(dayOfSell!.valueARSRaw).toBeCloseTo(expectedCashAfterSell + expectedStockValueAfterSell);
    expect(dayOfSell!.cashARS).toBeCloseTo(expectedCashAfterSell);
  });

  it('should ignore assets with zero prices in calculatePortfolioValueHistory', async () => {
    const depositDate = dayjs('2024-01-01');
    const buyDate = dayjs('2024-01-03');
    
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
        date: buyDate.toISOString(),
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'INVALID',
        quantity: 5,
        price: 1000,
        commissionPct: 1,
        currency: 'ARS',
        market: 'BCBA',
      },
    ];

    const priceHistory = {
      'AAPL': [
        { date: '2024-01-03', open: 5000, high: 5000, low: 5000, close: 5000, volume: 1000 },
        { date: '2024-01-04', open: 5200, high: 5200, low: 5200, close: 5200, volume: 1000 },
      ],
      'INVALID': [
        { date: '2024-01-03', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { date: '2024-01-04', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { date: '2024-01-05', open: 0, high: 0, low: 0, close: 0, volume: 0 },
      ],
    };

    // Calculate history from 5 days before deposit to 5 days after buy
    const startDate = depositDate.subtract(5, 'days');
    const endDate = buyDate.add(5, 'days');
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day after buy - should only include AAPL value, INVALID should be ignored
    const dayAfterBuy = history.find(h => h.date === buyDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterBuy).toBeDefined();
    
    const buyAmount = 10 * 5000; // 50000 (AAPL)
    const buyCommission = buyAmount * 0.01; // 500
    const totalBuyCost = buyAmount + buyCommission; // 50500
    const expectedCashAfterBuy = 100000 - totalBuyCost; // 49500
    const expectedStockValue = 10 * 5200; // 52000 (AAPL only)
    
    expect(dayAfterBuy!.valueARS).toBeCloseTo(expectedCashAfterBuy + expectedStockValue);
    expect(dayAfterBuy!.valueARSRaw).toBeCloseTo(expectedCashAfterBuy + expectedStockValue);
    expect(dayAfterBuy!.cashARS).toBeCloseTo(expectedCashAfterBuy);
  });

  it('should use most recent non-zero price in calculatePortfolioValueHistory', async () => {
    const depositDate = dayjs('2024-01-01');
    const buyDate = dayjs('2024-01-03');
    
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
    ];

    const priceHistory = {
      'AAPL': [
        { date: '2024-01-05', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { date: '2024-01-04', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { date: '2024-01-03', open: 5000, high: 5000, low: 5000, close: 5000, volume: 1000 },
        { date: '2024-01-02', open: 4800, high: 4800, low: 4800, close: 4800, volume: 1000 },
      ],
    };

    // Calculate history from 5 days before deposit to 5 days after buy
    const startDate = depositDate.subtract(5, 'days');
    const endDate = buyDate.add(5, 'days');
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day after buy - should use the most recent non-zero price (5000 from 2024-01-03)
    const dayAfterBuy = history.find(h => h.date === buyDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterBuy).toBeDefined();
    
    const buyAmount = 10 * 5000; // 50000
    const buyCommission = buyAmount * 0.01; // 500
    const totalBuyCost = buyAmount + buyCommission; // 50500
    const expectedCashAfterBuy = 100000 - totalBuyCost; // 49500
    const expectedStockValue = 10 * 5000; // 50000 (most recent non-zero price)
    
    expect(dayAfterBuy!.valueARS).toBeCloseTo(expectedCashAfterBuy + expectedStockValue);
    expect(dayAfterBuy!.valueARSRaw).toBeCloseTo(expectedCashAfterBuy + expectedStockValue);
    expect(dayAfterBuy!.cashARS).toBeCloseTo(expectedCashAfterBuy);
  });

  it('should handle USD transactions correctly', async () => {
    const depositDate = dayjs('2024-01-01');
    const buyDate = dayjs('2024-01-06');
    
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
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day of deposit - value should be 10000 USD
    const dayOfDeposit = history.find(h => h.date === depositDate.format('YYYY-MM-DD'));
    expect(dayOfDeposit).toBeDefined();
    expect(dayOfDeposit!.valueUSD).toBe(10000);
    expect(dayOfDeposit!.valueUSDRaw).toBe(10000);
    expect(dayOfDeposit!.cashUSD).toBe(10000);

    // Day of buy - cash should be reduced, stock value added
    const dayOfBuy = history.find(h => h.date === buyDate.format('YYYY-MM-DD'));
    expect(dayOfBuy).toBeDefined();
    const buyAmount = 5 * 150; // 750
    const buyCommission = buyAmount * 0.01; // 7.5
    const totalBuyCost = buyAmount + buyCommission; // 757.5
    const expectedCashAfterBuy = 10000 - totalBuyCost; // 9242.5
    const expectedStockValue = 5 * 150; // 750
    expect(dayOfBuy!.valueUSD).toBeCloseTo(expectedCashAfterBuy + expectedStockValue);
    expect(dayOfBuy!.valueUSDRaw).toBeCloseTo(expectedCashAfterBuy + expectedStockValue);
    expect(dayOfBuy!.cashUSD).toBeCloseTo(expectedCashAfterBuy);
  });

  it('should handle mixed ARS and USD transactions correctly', async () => {
    const arsDepositDate = dayjs('2024-01-01');
    const usdDepositDate = dayjs('2024-01-03');
    const arsBuyDate = dayjs('2024-01-06');
    const usdBuyDate = dayjs('2024-01-08');
    
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
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day after both deposits - should have both cash balances
    const dayAfterDeposits = history.find(h => h.date === usdDepositDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterDeposits).toBeDefined();
    // The total value will be converted using exchange rate, so we check individual currencies
    expect(dayAfterDeposits!.valueARS).toBeGreaterThan(0);
    expect(dayAfterDeposits!.valueUSD).toBeGreaterThan(0);
    expect(dayAfterDeposits!.valueARSRaw).toBe(50000);
    expect(dayAfterDeposits!.valueUSDRaw).toBe(5000);
    expect(dayAfterDeposits!.cashARS).toBe(50000);
    expect(dayAfterDeposits!.cashUSD).toBe(5000);

    // Day after ARS buy - ARS cash reduced, USD cash unchanged
    const dayAfterArsBuy = history.find(h => h.date === arsBuyDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterArsBuy).toBeDefined();
    const arsBuyAmount = 100 * 1000; // 100000
    const arsBuyCommission = arsBuyAmount * 0.01; // 1000
    const totalArsBuyCost = arsBuyAmount + arsBuyCommission; // 101000
    const expectedArsCashAfterBuy = 50000 - totalArsBuyCost; // -51000 (negative cash)
    const expectedArsStockValue = 100 * 1000; // 100000
    expect(dayAfterArsBuy!.valueARS).toBeCloseTo(expectedArsCashAfterBuy + expectedArsStockValue);
    expect(dayAfterArsBuy!.valueARSRaw).toBeCloseTo(expectedArsCashAfterBuy + expectedArsStockValue);
    expect(dayAfterArsBuy!.cashARS).toBeCloseTo(expectedArsCashAfterBuy);
    expect(dayAfterArsBuy!.valueUSD).toBe(5000);
    expect(dayAfterArsBuy!.valueUSDRaw).toBe(5000);
    expect(dayAfterArsBuy!.cashUSD).toBe(5000);

    // Day after USD buy - USD cash reduced, ARS unchanged
    const dayAfterUsdBuy = history.find(h => h.date === usdBuyDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterUsdBuy).toBeDefined();
    const usdBuyAmount = 10 * 150; // 1500
    const usdBuyCommission = usdBuyAmount * 0.01; // 15
    const totalUsdBuyCost = usdBuyAmount + usdBuyCommission; // 1515
    const expectedUsdCashAfterBuy = 5000 - totalUsdBuyCost; // 3485
    const expectedUsdStockValue = 10 * 150; // 1500
    expect(dayAfterUsdBuy!.valueUSD).toBeCloseTo(expectedUsdCashAfterBuy + expectedUsdStockValue);
    expect(dayAfterUsdBuy!.valueUSDRaw).toBeCloseTo(expectedUsdCashAfterBuy + expectedUsdStockValue);
    expect(dayAfterUsdBuy!.cashUSD).toBeCloseTo(expectedUsdCashAfterBuy);
    expect(dayAfterUsdBuy!.valueARS).toBeCloseTo(expectedArsCashAfterBuy + expectedArsStockValue);
    expect(dayAfterUsdBuy!.valueARSRaw).toBeCloseTo(expectedArsCashAfterBuy + expectedArsStockValue);
    expect(dayAfterUsdBuy!.cashARS).toBeCloseTo(expectedArsCashAfterBuy);
  });

  it('should correctly calculate portfolio value with crypto positions', async () => {
    const buyDate = dayjs('2024-01-01');
    const sellDate = dayjs('2024-01-15');
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: buyDate.toISOString(),
        type: 'Deposit',
        amount: 10000,
        currency: 'USD',
      },
      {
        id: '2',
        date: buyDate.toISOString(),
        type: 'Buy',
        assetType: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.5,
        price: 50000,
        currency: 'USD',
        commissionPct: 1,
      },
      {
        id: '3',
        date: sellDate.toISOString(),
        type: 'Sell',
        assetType: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.2,
        price: 60000,
        currency: 'USD',
        commissionPct: 1,
      },
    ];

    const priceHistory = {
      'BTCUSDT': [
        { date: '2024-01-01', open: 50000, high: 51000, low: 49000, close: 50000, volume: 1000000 },
        { date: '2024-01-15', open: 60000, high: 61000, low: 59000, close: 60000, volume: 1200000 },
        { date: '2024-01-31', open: 55000, high: 56000, low: 54000, close: 55000, volume: 1100000 },
      ]
    };

    const startDate = buyDate.subtract(5, 'days');
    const endDate = buyDate.add(30, 'days');
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { 
      startDate: startDate.format('YYYY-MM-DD'), 
      endDate: endDate.format('YYYY-MM-DD') 
    });

    // Day before buy - value should be 0
    const dayBefore = history.find(h => h.date === buyDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBefore).toBeDefined();
    expect(dayBefore!.valueUSD).toBe(0);
    expect(dayBefore!.valueUSDRaw).toBe(0);

    // Day of buy - should have 0.5 BTC worth $25,000 + remaining cash
    const buyDay = history.find(h => h.date === buyDate.format('YYYY-MM-DD'));
    expect(buyDay).toBeDefined();
    const expectedBuyValue = 0.5 * 50000 + (10000 - 0.5 * 50000 * 1.01); // BTC value + remaining cash after fees
    expect(buyDay!.valueUSD).toBeCloseTo(expectedBuyValue);
    expect(buyDay!.valueUSDRaw).toBeCloseTo(expectedBuyValue);

    // Day of sell - should have 0.3 BTC worth $18,000 + cash from sale
    const sellDay = history.find(h => h.date === sellDate.format('YYYY-MM-DD'));
    expect(sellDay).toBeDefined();
    const cashFromSale = 0.2 * 60000 * 0.99; // Sale proceeds minus commission
    const expectedSellValue = 0.3 * 60000 + cashFromSale;
    expect(sellDay!.valueUSD).toBeCloseTo(expectedSellValue);
    expect(sellDay!.valueUSDRaw).toBeCloseTo(expectedSellValue);
  });

  it('should correctly calculate portfolio value with caucion positions', async () => {
    const caucionDate = dayjs('2024-01-01');
    const maturityDate = dayjs('2024-01-31');
    const withdrawalDate = dayjs('2024-02-05');
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: caucionDate.toISOString(),
        type: 'Deposit',
        amount: 10000,
        currency: 'ARS',
      },
      {
        id: '2',
        date: caucionDate.toISOString(),
        type: 'Create',
        assetType: 'Caucion',
        provider: 'Test Broker',
        amount: 10000,
        annualRate: 36.5, // 0.1% daily rate for simplicity
        termDays: 30,
        maturityDate: maturityDate.toISOString(),
        currency: 'ARS',
      },
      {
        id: '3',
        date: withdrawalDate.toISOString(),
        type: 'Withdrawal',
        amount: 10000 + (10000 * (0.365 / 365) * 30), // Full value including interest
        currency: 'ARS',
      },
    ];

    const startDate = caucionDate.subtract(5, 'days');
    const endDate = withdrawalDate.add(10, 'days');
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { 
      startDate: startDate.format('YYYY-MM-DD'), 
      endDate: endDate.format('YYYY-MM-DD') 
    });

    // Day before caucion - value should be 0
    const dayBefore = history.find(h => h.date === caucionDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBefore).toBeDefined();
    expect(dayBefore!.valueARS).toBe(0);
    expect(dayBefore!.valueARSRaw).toBe(0);

    // First day of caucion - value should be the principal
    const firstDay = history.find(h => h.date === caucionDate.format('YYYY-MM-DD'));
    expect(firstDay).toBeDefined();
    expect(firstDay!.valueARS).toBe(10000);
    expect(firstDay!.valueARSRaw).toBe(10000);
    expect(firstDay!.cashARS).toBe(0);

    // Mid-term (15 days in) - value should include accrued interest
    const midDay = history.find(h => h.date === caucionDate.add(15, 'days').format('YYYY-MM-DD'));
    expect(midDay).toBeDefined();
    const expectedMidValue = 10000 + (10000 * (0.365 / 365) * 15);
    expect(midDay!.valueARS).toBeCloseTo(expectedMidValue);
    expect(midDay!.valueARSRaw).toBeCloseTo(expectedMidValue);

    // Maturity day - value should include full interest
    const maturityDay = history.find(h => h.date === maturityDate.format('YYYY-MM-DD'));
    expect(maturityDay).toBeDefined();
    const expectedFinalValue = 10000 + (10000 * (0.365 / 365) * 30);
    expect(maturityDay!.valueARS).toBeCloseTo(expectedFinalValue);
    expect(maturityDay!.valueARSRaw).toBeCloseTo(expectedFinalValue);

    // Day after withdrawal - value should be 0
    const dayAfterWithdrawal = history.find(h => h.date === withdrawalDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterWithdrawal).toBeDefined();
    expect(dayAfterWithdrawal!.valueARS).toBe(0);
    expect(dayAfterWithdrawal!.valueARSRaw).toBe(0);
  });

  it('should handle mixed portfolio with crypto, cauciones, and other assets', async () => {
    const startDate = dayjs('2024-01-01');
    
    const transactions: PortfolioTransaction[] = [
      // Initial deposits
      {
        id: '1',
        date: startDate.toISOString(),
        type: 'Deposit',
        amount: 10000,
        currency: 'USD',
      },
      {
        id: '2',
        date: startDate.toISOString(),
        type: 'Deposit',
        amount: 50000,
        currency: 'ARS',
      },
      // Crypto purchase
      {
        id: '3',
        date: startDate.toISOString(),
        type: 'Buy',
        assetType: 'Crypto',
        symbol: 'ETHUSDT',
        quantity: 2,
        price: 3000,
        currency: 'USD',
      },
      // Caucion creation
      {
        id: '4',
        date: startDate.toISOString(),
        type: 'Create',
        assetType: 'Caucion',
        provider: 'Test Broker',
        amount: 30000,
        annualRate: 36.5,
        termDays: 30,
        maturityDate: startDate.add(30, 'days').toISOString(),
        currency: 'ARS',
      },
    ];

    const priceHistory = {
      'ETHUSDT': [
        { date: '2024-01-01', open: 3000, high: 3100, low: 2900, close: 3000, volume: 500000 },
        { date: '2024-01-15', open: 3500, high: 3600, low: 3400, close: 3500, volume: 600000 },
        { date: '2024-01-31', open: 3200, high: 3300, low: 3100, close: 3200, volume: 550000 },
      ]
    };

    const endDate = startDate.add(35, 'days');
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { 
      startDate: startDate.format('YYYY-MM-DD'), 
      endDate: endDate.format('YYYY-MM-DD') 
    });

    // Day after creation - should have crypto value + caucion value + remaining cash
    const dayAfter = history.find(h => h.date === startDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfter).toBeDefined();
    
    const cryptoValue = 2 * 3000; // 2 ETH at $3000
    const caucionValue = 30000; // Principal only on first day
    const remainingUSDCash = 10000 - cryptoValue; // Initial USD minus crypto purchase
    const remainingARSCash = 50000 - 30000; // Initial ARS minus caucion
    
    expect(dayAfter!.valueUSD).toBeCloseTo(cryptoValue + remainingUSDCash);
    expect(dayAfter!.valueARSRaw).toBeCloseTo(caucionValue + remainingARSCash);
  });

  it('should handle crypto buy and sell transactions correctly', async () => {
    const depositDate = dayjs('2024-01-01');
    const buyDate = dayjs('2024-01-03');
    const sellDate = dayjs('2024-01-06');
    
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
        assetType: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.5,
        price: 50000,
        commissionPct: 0.1,
        currency: 'USD',
      },
      {
        id: '3',
        date: sellDate.toISOString(),
        type: 'Sell',
        assetType: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.2,
        price: 52000,
        commissionPct: 0.1,
        currency: 'USD',
      },
    ];

    const priceHistory = {
      'BTCUSDT': [
        { date: buyDate.format('YYYY-MM-DD'), open: 50000, high: 50000, low: 50000, close: 50000, volume: 1000 },
        { date: sellDate.format('YYYY-MM-DD'), open: 52000, high: 52000, low: 52000, close: 52000, volume: 1000 },
      ]
    };

    // Calculate history from 5 days before deposit to 5 days after sell
    const startDate = depositDate.subtract(5, 'days');
    const endDate = sellDate.add(5, 'days');
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day of deposit - value should be 10000 USD
    const dayOfDeposit = history.find(h => h.date === depositDate.format('YYYY-MM-DD'));
    expect(dayOfDeposit).toBeDefined();
    expect(dayOfDeposit!.valueUSD).toBe(10000);
    expect(dayOfDeposit!.valueUSDRaw).toBe(10000);
    expect(dayOfDeposit!.cashUSD).toBe(10000);

    // Day of buy - cash should be reduced by purchase amount + commission
    const dayOfBuy = history.find(h => h.date === buyDate.format('YYYY-MM-DD'));
    expect(dayOfBuy).toBeDefined();
    const buyAmount = 0.5 * 50000; // 25000
    const buyCommission = buyAmount * 0.001; // 25
    const totalBuyCost = buyAmount + buyCommission; // 25025
    const expectedCashAfterBuy = 10000 - totalBuyCost; // 74975
    const expectedCryptoValue = 0.5 * 50000; // 25000
    expect(dayOfBuy!.valueUSD).toBeCloseTo(expectedCashAfterBuy + expectedCryptoValue);
    expect(dayOfBuy!.valueUSDRaw).toBeCloseTo(expectedCashAfterBuy + expectedCryptoValue);
    expect(dayOfBuy!.cashUSD).toBeCloseTo(expectedCashAfterBuy);

    // Day of sell - cash should be increased by sale proceeds - commission, crypto value reduced
    const dayOfSell = history.find(h => h.date === sellDate.format('YYYY-MM-DD'));
    expect(dayOfSell).toBeDefined();
    const sellAmount = 0.2 * 52000; // 10400
    const sellCommission = sellAmount * 0.001; // 10.4
    const netSellProceeds = sellAmount - sellCommission; // 10389.6
    const expectedCashAfterSell = expectedCashAfterBuy + netSellProceeds; // 85364.6
    const expectedCryptoValueAfterSell = 0.3 * 52000; // 15600 (0.3 remaining shares)
    expect(dayOfSell!.valueUSD).toBeCloseTo(expectedCashAfterSell + expectedCryptoValueAfterSell);
    expect(dayOfSell!.valueUSDRaw).toBeCloseTo(expectedCashAfterSell + expectedCryptoValueAfterSell);
    expect(dayOfSell!.cashUSD).toBeCloseTo(expectedCashAfterSell);
  });

  it('should handle caucion creation and maturity correctly', async () => {
    const depositDate = dayjs('2024-01-01');
    const caucionDate = dayjs('2024-01-02');
    const maturityDate = dayjs('2024-01-17'); // 15 days later
    
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
        date: caucionDate.toISOString(),
        type: 'Create',
        assetType: 'Caucion',
        provider: 'Test Broker',
        amount: 8000,
        annualRate: 73, // 0.2% daily rate for simplicity
        termDays: 15,
        maturityDate: maturityDate.toISOString(),
        currency: 'ARS',
      },
    ];

    // Calculate history from 5 days before deposit to 10 days after maturity
    const startDate = depositDate.subtract(5, 'days');
    const endDate = maturityDate.add(10, 'days');
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day before caucion - value should be 10000 (just cash)
    const dayBeforeCaucion = history.find(h => h.date === caucionDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBeforeCaucion).toBeDefined();
    expect(dayBeforeCaucion!.valueARS).toBe(10000);
    expect(dayBeforeCaucion!.valueARSRaw).toBe(10000);
    expect(dayBeforeCaucion!.cashARS).toBe(10000);

    // Day of caucion creation - value should be 10000 (cash reduced by 8000, caucion worth 8000)
    const dayOfCaucion = history.find(h => h.date === caucionDate.format('YYYY-MM-DD'));
    expect(dayOfCaucion).toBeDefined();
    expect(dayOfCaucion!.valueARS).toBe(10000);
    expect(dayOfCaucion!.valueARSRaw).toBe(10000);
    expect(dayOfCaucion!.cashARS).toBe(2000); // 10000 - 8000

    // Mid-term (7 days in) - value should include accrued interest
    const midDay = history.find(h => h.date === caucionDate.add(7, 'days').format('YYYY-MM-DD'));
    expect(midDay).toBeDefined();
    const expectedMidValue = 8000 + (8000 * (0.73 / 365) * 7); // Principal + 7 days interest
    const totalExpectedValue = 2000 + expectedMidValue; // Cash + caucion value
    expect(midDay!.valueARS).toBeCloseTo(totalExpectedValue);
    expect(midDay!.valueARSRaw).toBeCloseTo(totalExpectedValue);
    expect(midDay!.cashARS).toBe(2000);

    // Maturity day - value should include full interest
    const maturityDay = history.find(h => h.date === maturityDate.format('YYYY-MM-DD'));
    expect(maturityDay).toBeDefined();
    const expectedFinalCaucionValue = 8000 + (8000 * (0.73 / 365) * 15); // Principal + full interest
    const totalExpectedFinalValue = 2000 + expectedFinalCaucionValue; // Cash + matured caucion value
    expect(maturityDay!.valueARS).toBeCloseTo(totalExpectedFinalValue);
    expect(maturityDay!.valueARSRaw).toBeCloseTo(totalExpectedFinalValue);
    expect(maturityDay!.cashARS).toBe(2000);

    // Day after maturity - caucion value should remain constant (not drop to 0)
    const dayAfter = history.find(h => h.date === maturityDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfter).toBeDefined();
    expect(dayAfter!.valueARS).toBeCloseTo(totalExpectedFinalValue); // Should remain the same
    expect(dayAfter!.valueARSRaw).toBeCloseTo(totalExpectedFinalValue);
    expect(dayAfter!.cashARS).toBe(2000);
  });

  it('should remove matured caucion value when withdrawal transaction occurs', async () => {
    const depositDate = dayjs('2024-01-01');
    const caucionDate = dayjs('2024-01-02');
    const maturityDate = dayjs('2024-01-17');
    const withdrawalDate = dayjs('2024-01-20'); // 3 days after maturity
    
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
        date: caucionDate.toISOString(),
        type: 'Create',
        assetType: 'Caucion',
        provider: 'Test Broker',
        amount: 8000,
        annualRate: 73,
        termDays: 15,
        maturityDate: maturityDate.toISOString(),
        currency: 'ARS',
      },
      {
        id: '3',
        date: withdrawalDate.toISOString(),
        type: 'Withdrawal',
        amount: 8000 + (8000 * (0.73 / 365) * 15), // Full value including interest
        currency: 'ARS',
      },
    ];

    // Calculate history from 5 days before deposit to 10 days after withdrawal
    const startDate = depositDate.subtract(5, 'days');
    const endDate = withdrawalDate.add(10, 'days');
    
    const history = await calculatePortfolioValueHistory(transactions, {}, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day before withdrawal - value should still include matured caucion
    const dayBeforeWithdrawal = history.find(h => h.date === withdrawalDate.subtract(1, 'day').format('YYYY-MM-DD'));
    expect(dayBeforeWithdrawal).toBeDefined();
    const expectedFinalCaucionValue = 8000 + (8000 * (0.73 / 365) * 15);
    const totalExpectedValue = 2000 + expectedFinalCaucionValue; // Cash + matured caucion
    expect(dayBeforeWithdrawal!.valueARS).toBeCloseTo(totalExpectedValue);
    expect(dayBeforeWithdrawal!.valueARSRaw).toBeCloseTo(totalExpectedValue);
    expect(dayBeforeWithdrawal!.cashARS).toBe(2000);

    // Day of withdrawal - value should drop to just cash
    const withdrawalDay = history.find(h => h.date === withdrawalDate.format('YYYY-MM-DD'));
    expect(withdrawalDay).toBeDefined();
    expect(withdrawalDay!.valueARS).toBe(2000); // Just remaining cash
    expect(withdrawalDay!.valueARSRaw).toBe(2000);
    expect(withdrawalDay!.cashARS).toBe(2000);

    // Day after withdrawal - value should remain just cash
    const dayAfterWithdrawal = history.find(h => h.date === withdrawalDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterWithdrawal).toBeDefined();
    expect(dayAfterWithdrawal!.valueARS).toBe(2000);
    expect(dayAfterWithdrawal!.valueARSRaw).toBe(2000);
    expect(dayAfterWithdrawal!.cashARS).toBe(2000);
  });

  it('should handle mixed portfolio with crypto, caucion, and stocks', async () => {
    const depositDate = dayjs('2024-01-01');
    const buyDate = dayjs('2024-01-03');
    const caucionDate = dayjs('2024-01-05');
    const maturityDate = dayjs('2024-01-20');
    
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
        date: depositDate.toISOString(),
        type: 'Deposit',
        amount: 10000,
        currency: 'USD',
      },
      {
        id: '3',
        date: buyDate.toISOString(),
        type: 'Buy',
        assetType: 'Stock',
        symbol: 'AAPL',
        quantity: 5,
        price: 4000,
        commissionPct: 1,
        currency: 'ARS',
        market: 'BCBA',
      },
      {
        id: '4',
        date: buyDate.toISOString(),
        type: 'Buy',
        assetType: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.1,
        price: 50000,
        commissionPct: 0.1,
        currency: 'USD',
      },
      {
        id: '5',
        date: caucionDate.toISOString(),
        type: 'Create',
        assetType: 'Caucion',
        provider: 'Test Broker',
        amount: 15000,
        annualRate: 73,
        termDays: 15,
        maturityDate: maturityDate.toISOString(),
        currency: 'ARS',
      },
    ];

    const priceHistory = {
      'AAPL': [
        { date: buyDate.format('YYYY-MM-DD'), open: 4000, high: 4000, low: 4000, close: 4000, volume: 1000 },
      ],
      'BTCUSDT': [
        { date: buyDate.format('YYYY-MM-DD'), open: 50000, high: 50000, low: 50000, close: 50000, volume: 1000 },
      ]
    };

    // Calculate history from 5 days before deposit to 10 days after maturity
    const startDate = depositDate.subtract(5, 'days');
    const endDate = maturityDate.add(10, 'days');
    
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') });

    // Day after all transactions - should include all positions
    const dayAfterAll = history.find(h => h.date === caucionDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterAll).toBeDefined();
    
    // Calculate expected values
    const stockBuyAmount = 5 * 4000; // 20000
    const stockCommission = stockBuyAmount * 0.01; // 200
    const stockCost = stockBuyAmount + stockCommission; // 20200
    
    const cryptoBuyAmount = 0.1 * 50000; // 5000
    const cryptoCommission = cryptoBuyAmount * 0.001; // 5
    const cryptoCost = cryptoBuyAmount + cryptoCommission; // 5005
    
    const expectedCashARS = 50000 - stockCost - 15000; // 14800 (50000 - 20200 - 15000)
    const expectedCashUSD = 10000 - cryptoCost; // 4995
    const expectedStockValue = 5 * 4000; // 20000
    const expectedCryptoValue = 0.1 * 50000; // 5000
    const expectedCaucionValue = 15000; // Initial value (no interest yet)
    
    const totalExpectedARS = expectedCashARS + expectedStockValue + expectedCaucionValue;
    const totalExpectedUSD = expectedCashUSD + expectedCryptoValue;
    
    expect(dayAfterAll!.valueARSRaw).toBeCloseTo(totalExpectedARS);
    expect(dayAfterAll!.valueUSDRaw).toBeCloseTo(totalExpectedUSD);
    expect(dayAfterAll!.cashARS).toBeCloseTo(expectedCashARS);
    expect(dayAfterAll!.cashUSD).toBeCloseTo(expectedCashUSD);
  });

  it('should use bonds.json price as fallback for bonds with no price history', async () => {
    const depositDate = dayjs('2024-01-01');
    const buyDate = dayjs('2024-01-03');
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: depositDate.toISOString(),
        type: 'Deposit',
        amount: 1000,
        currency: 'USD',
      },
      {
        id: '2',
        date: buyDate.toISOString(),
        type: 'Buy',
        assetType: 'Bond',
        ticker: 'GD30',
        quantity: 10,
        price: 55,
        currency: 'USD',
      },
    ];
    // No price history for GD30
    const priceHistory = {};
    const startDate = depositDate.subtract(1, 'day');
    const endDate = buyDate.add(1, 'day');
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD'), bondFallback: true });
    // After buy, value should be 10 * 55 (from bonds.json)
    const dayAfterBuy = history.find(h => h.date === buyDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterBuy).toBeDefined();
    expect(dayAfterBuy!.valueUSD).toBeCloseTo(10 * 55);
  });

  it('should use bonds.json price as fallback for ARS bonds with no price history', async () => {
    const depositDate = dayjs('2024-01-01');
    const buyDate = dayjs('2024-01-03');
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
        assetType: 'Bond',
        ticker: 'AL30',
        quantity: 2,
        price: 50000,
        currency: 'ARS',
      },
    ];
    // No price history for AL30
    const priceHistory = {};
    const startDate = depositDate.subtract(1, 'day');
    const endDate = buyDate.add(1, 'day');
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD'), bondFallback: true });
    // After buy, value should be 2 * 50000 (from bonds.json)
    const dayAfterBuy = history.find(h => h.date === buyDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterBuy).toBeDefined();
    expect(dayAfterBuy!.valueARS).toBeCloseTo(2 * 50000);
  });

  it('should not use bonds.json fallback if a valid price exists in price history', async () => {
    const depositDate = dayjs('2024-01-01');
    const buyDate = dayjs('2024-01-03');
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: depositDate.toISOString(),
        type: 'Deposit',
        amount: 1000,
        currency: 'USD',
      },
      {
        id: '2',
        date: buyDate.toISOString(),
        type: 'Buy',
        assetType: 'Bond',
        ticker: 'GD30',
        quantity: 10,
        price: 60,
        currency: 'USD',
      },
    ];
    // Price history for GD30 with a valid price
    const priceHistory = {
      'GD30': [
        { date: buyDate.format('YYYY-MM-DD'), open: 60, high: 60, low: 60, close: 60, volume: 1000 },
      ],
    };
    const startDate = depositDate.subtract(1, 'day');
    const endDate = buyDate.add(1, 'day');
    const history = await calculatePortfolioValueHistory(transactions, priceHistory, { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD'), bondFallback: true });
    // After buy, value should be 10 * 60 (from price history, not bonds.json)
    const dayAfterBuy = history.find(h => h.date === buyDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterBuy).toBeDefined();
    expect(dayAfterBuy!.valueUSD).toBeCloseTo(10 * 60);
  });

  it('should convert USD bonds to ARS before adding to ARS total in calculatePortfolioValueHistory', async () => {
    const buyDate = dayjs('2024-01-01');
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        type: 'Buy',
        date: buyDate.toISOString(),
        symbol: 'GD30',
        quantity: 100,
        price: 50,
        currency: 'USD',
        commissionPct: 0,
        purchaseFeePct: 0,
        assetType: 'Bond',
        ticker: 'GD30'
      }
    ];

    const priceHistory: Record<string, PriceData[]> = {
      'GD30': [
        { date: '2024-01-01', open: 50, high: 52, low: 48, close: 51, volume: 1000 },
        { date: '2024-01-02', open: 51, high: 54, low: 50, close: 53, volume: 1200 }
      ]
    };

    const startDate = buyDate.subtract(1, 'day');
    const endDate = buyDate.add(1, 'day');
    const result = await calculatePortfolioValueHistory(transactions, priceHistory, { 
      startDate: startDate.format('YYYY-MM-DD'), 
      endDate: endDate.format('YYYY-MM-DD'),
      bondFallback: true 
    });
    
    // The USD bond value should be converted to ARS and added to ARS total
    // 100 bonds * $53 = $5,300 USD (using price from 2024-01-02)
    // With exchange rate of 1000 (default), this should be 5,300,000 ARS
    // Cash spent: $5,000 USD = 5,000,000 ARS
    // Net value: 5,300,000 - 5,000,000 = 300,000 ARS
    const dayAfterBuy = result.find(h => h.date === buyDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterBuy).toBeDefined();
    expect(dayAfterBuy!.valueARSRaw).toBe(5300000); // Raw ARS value should be 5,300,000 ARS
    expect(dayAfterBuy!.valueUSDRaw).toBe(-5000); // Raw USD value should be -5000 (cash spent)
    expect(dayAfterBuy!.valueARS).toBe(300000); // Final ARS value should be 300,000 ARS (net after cash spent)
    expect(dayAfterBuy!.valueUSD).toBe(300); // Final USD value should be 300 USD (net after cash spent)
  });

  it('should convert USD bonds to ARS before adding to ARS total in calculateCurrentValueByCurrency', () => {
    const positions = [
      {
        type: 'Bond',
        ticker: 'GD30',
        quantity: 100,
        averagePrice: 50,
        currency: 'USD'
      }
    ];

    const cash = { ARS: 1000, USD: 100 };
    const priceHistory: Record<string, PriceData[]> = {
      'GD30': [
        { date: '2024-01-01', open: 50, high: 52, low: 48, close: 51, volume: 1000 }
      ]
    };

    const result = calculateCurrentValueByCurrency(positions, cash, priceHistory);
    
    // The USD bond value should be converted to ARS and added to ARS total
    // 100 bonds * $51 = $5,100 USD
    // With exchange rate of 1000 (default), this should be 5,100,000 ARS
    expect(result.ARS).toBe(1000 + 5100000); // Cash ARS + converted bond value
    expect(result.USD).toBe(100); // Only cash USD, bond was converted to ARS
  });

  it('should keep USD stocks in USD total in calculateCurrentValueByCurrency', () => {
    const positions = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ'
      }
    ];

    const cash = { ARS: 1000, USD: 100 };
    const priceHistory: Record<string, PriceData[]> = {
      'AAPL': [
        { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 }
      ]
    };

    const result = calculateCurrentValueByCurrency(positions, cash, priceHistory);
    
    // USD stocks should remain in USD total
    expect(result.ARS).toBe(1000); // Only cash ARS
    expect(result.USD).toBe(100 + 1020); // Cash USD + stock value (10 * 102)
  });

  it('should handle mixed ARS and USD bonds correctly in calculateCurrentValueByCurrency', () => {
    const positions = [
      {
        type: 'Bond',
        ticker: 'GD30',
        quantity: 100,
        averagePrice: 50,
        currency: 'USD'
      },
      {
        type: 'Bond',
        ticker: 'GD30ARS',
        quantity: 1000,
        averagePrice: 50000,
        currency: 'ARS'
      }
    ];

    const cash = { ARS: 1000, USD: 100 };
    const priceHistory: Record<string, PriceData[]> = {
      'GD30': [
        { date: '2024-01-01', open: 50, high: 52, low: 48, close: 51, volume: 1000 }
      ],
      'GD30ARS': [
        { date: '2024-01-01', open: 50000, high: 52000, low: 48000, close: 51000, volume: 1000 }
      ]
    };

    const result = calculateCurrentValueByCurrency(positions, cash, priceHistory);
    
    // USD bond should be converted to ARS, ARS bond should stay in ARS
    const usdBondValueARS = 100 * 51 * 1000; // 5,100,000 ARS
    const arsBondValue = 1000 * 51000; // 51,000,000 ARS
    
    expect(result.ARS).toBe(1000 + usdBondValueARS + arsBondValue); // Cash + USD bond converted + ARS bond
    expect(result.USD).toBe(100); // Only cash USD
  });
});

describe('calculateCurrentValueByCurrency', () => {
  it('should calculate current value for crypto positions', () => {
    const positions = [
      {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.5,
        averagePrice: 50000,
        currency: 'USD',
      },
      {
        type: 'Crypto',
        symbol: 'ETHUSDT',
        quantity: 2,
        averagePrice: 3000,
        currency: 'USD',
      },
    ];

    const cash = { ARS: 10000, USD: 5000 };
    const priceHistory = {
      'BTCUSDT': [
        { date: '2024-01-01', open: 50000, high: 50000, low: 50000, close: 50000, volume: 1000 },
        { date: '2024-01-02', open: 52000, high: 52000, low: 52000, close: 52000, volume: 1000 },
      ],
      'ETHUSDT': [
        { date: '2024-01-01', open: 3000, high: 3000, low: 3000, close: 3000, volume: 1000 },
        { date: '2024-01-02', open: 3200, high: 3200, low: 3200, close: 3200, volume: 1000 },
      ],
    };

    const result = calculateCurrentValueByCurrency(positions, cash, priceHistory);

    const expectedBTCValue = 0.5 * 52000; // 26000
    const expectedETHValue = 2 * 3200; // 6400
    const expectedUSDValue = 5000 + expectedBTCValue + expectedETHValue; // 37400

    expect(result.ARS).toBe(10000);
    expect(result.USD).toBe(expectedUSDValue);
  });

  it('should calculate current value for caucion positions', () => {
    const positions = [
      {
        type: 'Caucion',
        id: '1',
        provider: 'Test Broker',
        amount: 10000,
        annualRate: 73,
        startDate: '2024-01-01',
        maturityDate: '2024-01-16',
        currency: 'ARS',
        term: 15,
      },
      {
        type: 'Caucion',
        id: '2',
        provider: 'Test Broker',
        amount: 5000,
        annualRate: 73,
        startDate: '2024-01-05',
        maturityDate: '2024-01-20',
        currency: 'USD',
        term: 15,
      },
    ];

    const cash = { ARS: 5000, USD: 2000 };
    const priceHistory = {};

    // Mock current date to be 10 days after first caucion start
    const originalDate = global.Date;
    global.Date = class extends Date {
      constructor() {
        super('2024-01-11');
      }
    } as any;

    const result = calculateCurrentValueByCurrency(positions, cash, priceHistory);

    // Calculate expected values
    const caucion1Days = 10; // 10 days active
    const caucion1Interest = 10000 * (0.73 / 365) * caucion1Days;
    const caucion1Value = 10000 + caucion1Interest;

    const caucion2Days = 6; // 6 days active
    const caucion2Interest = 5000 * (0.73 / 365) * caucion2Days;
    const caucion2Value = 5000 + caucion2Interest;

    expect(result.ARS).toBeCloseTo(5000 + caucion1Value);
    expect(result.USD).toBeCloseTo(2000 + caucion2Value);

    // Restore original Date
    global.Date = originalDate;
  });

  it('should calculate current value for matured caucion positions', () => {
    const positions = [
      {
        type: 'Caucion',
        id: '1',
        provider: 'Test Broker',
        amount: 10000,
        annualRate: 73,
        startDate: '2024-01-01',
        maturityDate: '2024-01-16',
        currency: 'ARS',
        term: 15,
      },
    ];

    const cash = { ARS: 5000, USD: 2000 };
    const priceHistory = {};

    // Mock current date to be after maturity
    const originalDate = global.Date;
    global.Date = class extends Date {
      constructor() {
        super('2024-01-20');
      }
    } as any;

    const result = calculateCurrentValueByCurrency(positions, cash, priceHistory);

    // Calculate expected value (full interest)
    const caucionDays = 15; // Full term
    const caucionInterest = 10000 * (0.73 / 365) * caucionDays;
    const caucionValue = 10000 + caucionInterest;

    expect(result.ARS).toBeCloseTo(5000 + caucionValue);
    expect(result.USD).toBe(2000);

    // Restore original Date
    global.Date = originalDate;
  });

  it('should handle mixed portfolio with all asset types', () => {
    const positions = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 4000,
        currency: 'ARS',
        market: 'BCBA',
      },
      {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.1,
        averagePrice: 50000,
        currency: 'USD',
      },
      {
        type: 'Caucion',
        id: '1',
        provider: 'Test Broker',
        amount: 15000,
        annualRate: 73,
        startDate: '2024-01-01',
        maturityDate: '2024-01-16',
        currency: 'ARS',
        term: 15,
      },
    ];

    const cash = { ARS: 10000, USD: 5000 };
    const priceHistory = {
      'AAPL': [
        { date: '2024-01-15', open: 4000, high: 4000, low: 4000, close: 4200, volume: 1000 },
      ],
      'BTCUSDT': [
        { date: '2024-01-15', open: 50000, high: 50000, low: 50000, close: 52000, volume: 1000 },
      ],
    };

    // Mock current date to be 14 days after caucion start
    const originalDate = global.Date;
    global.Date = class extends Date {
      constructor() {
        super('2024-01-15');
      }
    } as any;

    const result = calculateCurrentValueByCurrency(positions, cash, priceHistory);

    // Calculate expected values
    const stockValue = 10 * 4200; // 42000
    const cryptoValue = 0.1 * 52000; // 5200
    const caucionDays = 14;
    const caucionInterest = 15000 * (0.73 / 365) * caucionDays;
    const caucionValue = 15000 + caucionInterest;

    expect(result.ARS).toBeCloseTo(10000 + stockValue + caucionValue);
    expect(result.USD).toBeCloseTo(5000 + cryptoValue);

    // Restore original Date
    global.Date = originalDate;
  });

  it('should ignore assets with zero prices in calculateCurrentValueByCurrency', () => {
    const positions = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 4000,
        currency: 'ARS',
        market: 'BCBA',
      },
      {
        type: 'Stock',
        symbol: 'INVALID',
        quantity: 5,
        averagePrice: 1000,
        currency: 'ARS',
        market: 'BCBA',
      },
      {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 0.1,
        averagePrice: 50000,
        currency: 'USD',
      },
    ];

    const cash = { ARS: 10000, USD: 5000 };
    const priceHistory = {
      'AAPL': [
        { date: '2024-01-15', open: 4000, high: 4000, low: 4000, close: 4200, volume: 1000 },
      ],
      'INVALID': [
        { date: '2024-01-15', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { date: '2024-01-14', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { date: '2024-01-13', open: 0, high: 0, low: 0, close: 0, volume: 0 },
      ],
      'BTCUSDT': [
        { date: '2024-01-15', open: 50000, high: 50000, low: 50000, close: 52000, volume: 1000 },
      ],
    };

    const result = calculateCurrentValueByCurrency(positions, cash, priceHistory);

    // Only AAPL and BTCUSDT should be included (INVALID has all zero prices)
    const stockValue = 10 * 4200; // 42000
    const cryptoValue = 0.1 * 52000; // 5200

    expect(result.ARS).toBe(10000 + stockValue);
    expect(result.USD).toBe(5000 + cryptoValue);
  });

  it('should use most recent non-zero price when some prices are zero', () => {
    const positions = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 4000,
        currency: 'ARS',
        market: 'BCBA',
      },
    ];

    const cash = { ARS: 10000, USD: 5000 };
    const priceHistory = {
      'AAPL': [
        { date: '2024-01-15', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { date: '2024-01-14', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        { date: '2024-01-13', open: 4000, high: 4000, low: 4000, close: 4200, volume: 1000 },
        { date: '2024-01-12', open: 4000, high: 4000, low: 4000, close: 4100, volume: 1000 },
      ],
    };

    const result = calculateCurrentValueByCurrency(positions, cash, priceHistory);

    // Should use the most recent non-zero price (4200 from 2024-01-13)
    const stockValue = 10 * 4200; // 42000

    expect(result.ARS).toBe(10000 + stockValue);
    expect(result.USD).toBe(5000);
  });
}); 