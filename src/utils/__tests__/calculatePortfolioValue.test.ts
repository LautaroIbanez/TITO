import { calculatePortfolioValueHistory } from '../calculatePortfolioValue';
import { PortfolioTransaction } from '@/types';
import dayjs from 'dayjs';

describe('calculatePortfolioValueHistory', () => {
  it('should correctly calculate portfolio value with a fixed-term deposit', async () => {
    const today = dayjs();
    const depositDate = today.subtract(30, 'days');
    const maturityDate = today;
    
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
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

    // First day of deposit - value should be the principal
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
        id: '2',
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
        id: '2',
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

    // Day after both deposits mature - should include both matured deposits
    const dayAfterMaturity = history.find(h => h.date === maturityDate.add(1, 'day').format('YYYY-MM-DD'));
    expect(dayAfterMaturity).toBeDefined();
    const expectedValue1 = 10000 + (10000 * (0.365 / 365) * 30);
    const expectedValue2 = 5000 + (5000 * (0.365 / 365) * 15);
    expect(dayAfterMaturity!.valueARS).toBeCloseTo(expectedValue1 + expectedValue2);
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
        id: '2',
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
}); 