import { PortfolioPosition, InvestmentGoal } from '@/types';
import { Bond } from '@/types/finance';
import dayjs from 'dayjs';

/**
 * Calculates the total daily interest from fixed income positions.
 * @param positions - Array of portfolio positions.
 * @param bonds - Array of available bond details.
 * @returns The total daily interest amount.
 */
function calculateDailyInterest(positions: PortfolioPosition[], bonds: Bond[]): number {
  let dailyInterest = 0;

  positions.forEach(position => {
    if (position.type === 'FixedTermDeposit') {
      const dailyRate = position.annualRate / 100 / 365;
      dailyInterest += position.amount * dailyRate;
    } else if (position.type === 'Bond') {
      const bondInfo = bonds.find(b => b.ticker === position.ticker);
      if (bondInfo) {
        const dailyRate = bondInfo.couponRate / 100 / 365;
        // Assuming quantity is the nominal value for simplicity
        dailyInterest += position.quantity * position.averagePrice * dailyRate; 
      }
    }
  });

  return dailyInterest;
}

/**
 * Projects portfolio value based on fixed income returns.
 * @param initialValue - The starting value of the portfolio.
 * @param positions - Array of portfolio positions.
 * @param bonds - Array of available bond details.
 * @param goals - Array of investment goals to determine projection timeline.
 * @returns An array of { date: string, value: number } for the projection.
 */
export function projectFixedIncome(
  initialValue: number,
  positions: PortfolioPosition[],
  bonds: Bond[],
  goals: InvestmentGoal[]
): { date: string, value: number }[] {
  if (goals.length === 0) return [{ date: dayjs().format('YYYY-MM-DD'), value: initialValue }];

  const dailyInterest = calculateDailyInterest(positions, bonds);
  const projection: { date: string, value: number }[] = [];
  
  const farthestGoalDate = goals.reduce((farthest, goal) => {
    const goalDate = dayjs(goal.targetDate);
    return goalDate.isAfter(farthest) ? goalDate : farthest;
  }, dayjs());

  let currentValue = initialValue;
  let currentDate = dayjs();

  while (currentDate.isBefore(farthestGoalDate) || currentDate.isSame(farthestGoalDate)) {
    projection.push({
      date: currentDate.format('YYYY-MM-DD'),
      value: currentValue,
    });
    currentValue += dailyInterest;
    currentDate = currentDate.add(1, 'day');
  }

  return projection;
} 