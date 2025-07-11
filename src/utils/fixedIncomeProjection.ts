import { PortfolioPosition, InvestmentGoal } from '@/types';
import { Bond } from '@/types/finance';
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { convertCurrencySync } from './currency';

dayjs.extend(minMax);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/**
 * Calculates the total daily interest from fixed income positions, converted to the target currency.
 * @param positions - Array of portfolio positions.
 * @param bonds - Array of available bond details.
 * @param targetCurrency - The currency to convert interest to ('ARS' or 'USD').
 * @returns The total daily interest amount in the target currency.
 */
export function calculateDailyInterest(
  positions: PortfolioPosition[],
  bonds: Bond[],
  targetCurrency: 'ARS' | 'USD' = 'ARS'
): number {
  let totalDailyInterest = 0;

  for (const position of positions) {
    if (position.type === 'FixedTermDeposit') {
      const dailyRate = (position.annualRate / 100) / 365;
      const dailyInterest = position.amount * dailyRate;
      
      // Convert to target currency if needed
      const convertedInterest = convertCurrencySync(dailyInterest, position.currency, targetCurrency);
      totalDailyInterest += convertedInterest;
    } else if (position.type === 'Bond') {
      const bond = bonds.find(b => b.ticker === position.ticker);
      if (bond) {
        const dailyRate = ((bond.couponRate ?? 0) / 100) / 365;
        const dailyInterest = position.quantity * position.purchasePrice * dailyRate;
        
        // Convert to target currency if needed
        const convertedInterest = convertCurrencySync(dailyInterest, position.currency, targetCurrency);
        totalDailyInterest += convertedInterest;
      }
    }
  }

  return totalDailyInterest;
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
): { date: string; value: number }[] {
  // Use the goal's currency if only one goal, otherwise default to ARS
  const targetCurrency: 'ARS' | 'USD' = (goals.length === 1 ? goals[0].currency : 'ARS') as 'ARS' | 'USD';
  const dailyInterest = calculateDailyInterest(positions, bonds, targetCurrency);
  const projection: { date: string; value: number }[] = [];
  
  let currentValue = initialValue;
  let currentDate = dayjs();
  
  // Always start with today
  projection.push({
    date: currentDate.format('YYYY-MM-DD'),
    value: currentValue,
  });

  if (goals.length === 0) {
    // If no goals, just return today and tomorrow
    currentValue += dailyInterest;
    currentDate = currentDate.add(1, 'day');
    projection.push({
      date: currentDate.format('YYYY-MM-DD'),
      value: currentValue,
    });
    return projection;
  }

  // Find the farthest goal date and maximum target amount
  const farthestGoalDate = goals.reduce((farthest, goal) => {
    const goalDate = dayjs(goal.targetDate);
    return goalDate.isAfter(farthest) ? goalDate : farthest;
  }, dayjs());

  const maxTargetAmount = Math.max(...goals.map(goal => goal.targetAmount));
  
  // Ensure we project at least until tomorrow, even if farthest goal is today or in the past
  const tomorrow = currentDate.add(1, 'day');
  let projectionEndDate = farthestGoalDate.isAfter(tomorrow) ? farthestGoalDate : tomorrow;
  
  // Start from tomorrow since we already added today
  currentDate = currentDate.add(1, 'day');
  currentValue += dailyInterest;

  // Continue projection until either:
  // 1. We reach the farthest goal date AND currentValue >= max target amount, OR
  // 2. We reach the farthest goal date (if no daily interest)
  while (
    (dailyInterest > 0 && (currentDate.isBefore(projectionEndDate) || currentDate.isSame(projectionEndDate))) ||
    (dailyInterest === 0 && (currentDate.isBefore(projectionEndDate) || currentDate.isSame(projectionEndDate)))
  ) {
    projection.push({
      date: currentDate.format('YYYY-MM-DD'),
      value: currentValue,
    });
    
    // If we have daily interest and have reached both conditions, stop
    if (dailyInterest > 0 && 
        currentDate.isSameOrAfter(projectionEndDate) && 
        currentValue >= maxTargetAmount) {
      break;
    }
    
    currentValue += dailyInterest;
    currentDate = currentDate.add(1, 'day');
  }

  return projection;
}

/**
 * Projects fixed income returns for a specific goal, using the goal's currency.
 * @param positions - Array of portfolio positions.
 * @param bonds - Array of available bond details.
 * @param goal - The investment goal to project for.
 * @param initialValue - The starting value of the portfolio.
 * @returns Array of daily projected values in the goal's currency.
 */
export function projectFixedIncomeForGoal(
  positions: PortfolioPosition[],
  bonds: Bond[],
  goal: InvestmentGoal,
  initialValue: number
): { date: string; value: number }[] {
  return projectFixedIncome(initialValue, positions, bonds, [goal]);
} 