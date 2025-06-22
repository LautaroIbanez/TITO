import { calculatePortfolioValueHistory } from '../calculatePortfolioValue';
import { PortfolioTransaction } from '@/types';
import dayjs from 'dayjs';

describe('calculatePortfolioValueHistory', () => {
  it('should correctly calculate portfolio value with a fixed-term deposit', () => {
    const today = dayjs();
    const transactions: PortfolioTransaction[] = [
      {
        id: '1',
        date: today.subtract(30, 'days').toISOString(),
        type: 'Create',
        assetType: 'FixedTermDeposit',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 36.5, // 0.1% daily rate for simplicity
        termDays: 30,
        maturityDate: today.toISOString(),
      },
    ];

    const history = calculatePortfolioValueHistory(transactions, {}, { days: 45 });

    // History should be 45 days long
    expect(history.length).toBe(45);

    // Day before deposit - value should be 0
    const dayBefore = history.find(h => h.date === today.subtract(31, 'days').format('YYYY-MM-DD'));
    expect(dayBefore).toBeDefined();
    expect(dayBefore!.value).toBe(0);

    // First day of deposit - value should be the principal
    const firstDay = history.find(h => h.date === today.subtract(30, 'days').format('YYYY-MM-DD'));
    expect(firstDay).toBeDefined();
    expect(firstDay!.value).toBe(10000);

    // Mid-term (15 days in) - value should include accrued interest
    const midDay = history.find(h => h.date === today.subtract(15, 'days').format('YYYY-MM-DD'));
    expect(midDay).toBeDefined();
    const expectedMidValue = 10000 + (10000 * (0.365 / 365) * 15);
    expect(midDay!.value).toBeCloseTo(expectedMidValue);

    // Maturity day - value should include full interest
    const maturityDay = history.find(h => h.date === today.format('YYYY-MM-DD'));
    expect(maturityDay).toBeDefined();
    const expectedFinalValue = 10000 + (10000 * (0.365 / 365) * 30);
    expect(maturityDay!.value).toBeCloseTo(expectedFinalValue);

    // Day after maturity - deposit value is no longer tracked as a growing asset
    const dayAfter = history.find(h => h.date === today.add(1, 'days').format('YYYY-MM-DD'));
    if(dayAfter) {
      // Assuming cash from matured deposit isn't part of this calculation.
      expect(dayAfter.value).toBe(0); 
    }
  });
}); 