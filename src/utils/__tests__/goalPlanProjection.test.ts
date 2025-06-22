import { projectGoalPlan } from '../goalCalculator';
import { InvestmentGoal } from '@/types';
import dayjs from 'dayjs';

describe('projectGoalPlan', () => {
  const goal: InvestmentGoal = {
    id: 'g1',
    name: 'Test Goal',
    targetAmount: 20000,
    targetDate: dayjs().add(1, 'year').toISOString(),
    initialDeposit: 10000,
    monthlyContribution: 500,
  };

  it('should project correctly with regular daily dates', () => {
    const dates = [
      dayjs().toISOString(),
      dayjs().add(1, 'day').toISOString(),
      dayjs().add(2, 'days').toISOString(),
    ];
    const projection = projectGoalPlan(goal, dates, 12); // 12% annual return
    
    expect(projection.length).toBe(3);
    expect(projection[0].value).toBeCloseTo(10000);
    expect(projection[1].value).toBeGreaterThan(10000);
    expect(projection[2].value).toBeGreaterThan(projection[1].value);
  });

  it('should project correctly with irregular date gaps', () => {
    const dates = [
      dayjs().format('YYYY-MM-DD'),
      dayjs().add(1, 'month').add(5, 'days').format('YYYY-MM-DD'), // ~1.16 months later
      dayjs().add(3, 'months').format('YYYY-MM-DD'), // ~1.84 months after previous
    ];
    const projection = projectGoalPlan(goal, dates, 10);

    expect(projection.length).toBe(3);
    expect(projection[0].value).toBe(10000);

    // Check second point
    const months1 = dayjs(dates[1]).diff(dayjs(dates[0]), 'month', true);
    const expected1 = 10000 * Math.pow(1 + 0.10/12, months1) + 500 * ((Math.pow(1 + 0.10/12, months1) - 1) / (0.10/12));
    expect(projection[1].value).toBeCloseTo(expected1);
    
    // Check third point
    const months2 = dayjs(dates[2]).diff(dayjs(dates[0]), 'month', true);
    const expected2 = 10000 * Math.pow(1 + 0.10/12, months2) + 500 * ((Math.pow(1 + 0.10/12, months2) - 1) / (0.10/12));
    expect(projection[2].value).toBeCloseTo(expected2);
  });

  it('should handle zero return rate (linear projection)', () => {
    const dates = [
        dayjs().format('YYYY-MM-DD'),
        dayjs().add(6, 'months').format('YYYY-MM-DD'),
    ];
    const projection = projectGoalPlan(goal, dates, 0);

    expect(projection.length).toBe(2);
    expect(projection[0].value).toBe(10000);
    expect(projection[1].value).toBeCloseTo(10000 + 500 * 6); // initial + contributions
  });
}); 