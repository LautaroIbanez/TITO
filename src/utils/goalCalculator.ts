import { PortfolioPosition, InvestmentGoal, PortfolioTransaction, DepositTransaction } from '@/types';
import { Bond } from '@/types/finance';
import dayjs from 'dayjs';
import { calculateDailyInterest } from './fixedIncomeProjection';
import { convertCurrencySync } from './currency';

interface MonthlyProjection {
  date: string;
  value: number;
  contributions: number;
  returns: number;
}

/**
 * Calculate required monthly investment to reach a target amount
 */
export function calculateMonthlyInvestment(
  targetAmount: number,
  years: number,
  annualReturn: number,
  initialAmount: number = 0
): number {
  const monthlyRate = annualReturn / 12 / 100;
  const months = years * 12;
  
  // Using Future Value formula rearranged to solve for monthly payment (A)
  // FV = P(1+r)^n + A[((1+r)^n - 1)/r]
  // Solve for A: A = (FV - P(1+r)^n) × r / ((1+r)^n - 1)
  
  const futureInitial = initialAmount * Math.pow(1 + monthlyRate, months);
  const remaining = targetAmount - futureInitial;
  const monthlyPayment = (remaining * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
  
  return Math.max(0, monthlyPayment);
}

/**
 * Project portfolio value over time with monthly contributions
 */
export function projectPortfolioValue(
  initial: number,
  monthly: number,
  years: number,
  annualReturn: number
): MonthlyProjection[] {
  const monthlyRate = annualReturn / 12 / 100;
  const totalMonths = years * 12;
  const projections: MonthlyProjection[] = [];
  
  let currentValue = initial;
  let totalContributions = initial;
  
  for (let month = 0; month <= totalMonths; month++) {
    const date = new Date();
    date.setMonth(date.getMonth() + month);
    
    projections.push({
      date: date.toISOString().split('T')[0],
      value: currentValue,
      contributions: totalContributions,
      returns: currentValue - totalContributions
    });
    
    // Add monthly contribution
    currentValue += monthly;
    totalContributions += monthly;
    
    // Apply monthly return
    currentValue *= (1 + monthlyRate);
  }
  
  return projections;
}

/**
 * Project alternative scenarios for comparison
 */
export function projectAlternativeScenarios(
  initial: number,
  monthly: number,
  years: number
): {
  savingsAccount: MonthlyProjection[];
  fixedDeposit: MonthlyProjection[];
} {
  // Savings account (~0.1% annual)
  const savingsAccount = projectPortfolioValue(initial, monthly, years, 0.1);
  
  // Fixed deposit (~75% annual in Argentina)
  const fixedDeposit = projectPortfolioValue(initial, monthly, years, 75);
  
  return {
    savingsAccount,
    fixedDeposit
  };
}

/**
 * Check if monthly contribution is feasible (< 80% of estimated salary)
 */
export function isFeasibleContribution(monthlyAmount: number, estimatedSalary: number = 400000): boolean {
  return monthlyAmount < estimatedSalary * 0.8;
}

/**
 * Formats a number as a currency string.
 * @param value The number to format.
 * @param currency The currency code ('ARS' or 'USD').
 * @returns A formatted currency string (e.g., "$1,234.56" or "US$1,234.56").
 */
export function formatCurrency(value: number, currency: 'ARS' | 'USD' = 'ARS'): string {
  const symbolMap = {
    'ARS': '$',
    'USD': 'US$'
  };
  const locale = currency === 'USD' ? 'en-US' : 'es-AR';
  const symbol = symbolMap[currency];
  const formattedNumber = value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formattedNumber}`;
}

/**
 * Calculate the required annual return to reach a goal.
 * This is a complex calculation that often requires iteration.
 * Formula for Future Value: FV = P(1+r)^n + A * [((1+r)^n - 1) / r]
 * where r is the monthly rate. We need to solve for r.
 */
export function calculateRequiredReturn(
  targetAmount: number,
  years: number,
  initialAmount: number,
  monthlyContribution: number
): number {
  const months = years * 12;
  if (initialAmount + monthlyContribution * months >= targetAmount) {
    return 0; // No return needed if contributions are enough
  }

  // Iterative approach to find the rate (e.g., Newton-Raphson or bisection)
  // For simplicity, we'll use a bisection method here.
  let low = 0;
  let high = 1; // 100% annual return
  let annualRate = 0;

  for (let i = 0; i < 100; i++) { // 100 iterations for precision
    const mid = (low + high) / 2;
    const monthlyRate = mid / 12;
    const futureValue = initialAmount * Math.pow(1 + monthlyRate, months) +
      monthlyContribution * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;

    if (futureValue > targetAmount) {
      high = mid;
    } else {
      low = mid;
    }
  }

  annualRate = (low + high) / 2;
  return annualRate * 100; // Return as a percentage
}

/**
 * Calculate the effective annual yield from bond and deposit positions.
 * @param positions - The user's portfolio positions.
 * @param bonds - A list of available bonds with their details.
 * @returns The weighted average annual yield as a percentage.
 */
export function calculateEffectiveYield(positions: PortfolioPosition[], bonds: Bond[]): number {
  let totalValue = 0;
  let weightedYield = 0;

  positions.forEach(pos => {
    if (pos.type === 'FixedTermDeposit') {
      const value = pos.amount;
      totalValue += value;
      weightedYield += value * (pos.annualRate / 100);
    } else if (pos.type === 'Caucion') {
      const value = pos.amount;
      totalValue += value;
      weightedYield += value * (pos.annualRate / 100);
    } else if (pos.type === 'Bond') {
      const bondInfo = bonds.find(b => b.ticker === pos.ticker);
      if (bondInfo) {
        const value = pos.quantity * pos.purchasePrice;
        totalValue += value;
        weightedYield += value * (bondInfo.couponRate / 100);
      }
    }
  });

  if (totalValue === 0) {
    // Default to a conservative estimate if no fixed income positions are held
    return 8; 
  }

  const effectiveYield = (weightedYield / totalValue) * 100;
  return effectiveYield;
}

/**
 * Projects the value of a goal based on its contribution plan and an annual return rate.
 * @param goal - The investment goal to project.
 * @param dates - An array of date strings for which to calculate the projection.
 * @param annualReturn - The estimated annual return rate.
 * @returns An array of { date: string, value: number } for the projection.
 */
export function projectGoalPlan(
  goal: InvestmentGoal,
  dates: string[],
  annualReturn: number,
): { date: string, value: number }[] {
  if (dates.length === 0) return [];
  
  const startDate = dayjs(dates[0]);
  const monthlyRate = annualReturn / 12 / 100;
  
  // Handle case where return rate is zero to avoid division by zero
  if (monthlyRate === 0) {
    return dates.map(date => {
      const months = dayjs(date).diff(startDate, 'month', true);
      return {
        date: date,
        value: goal.initialDeposit + (goal.monthlyContribution * (months > 0 ? months : 0))
      };
    });
  }

  return dates.map(date => {
    const months = dayjs(date).diff(startDate, 'month', true);
    if (months < 0) return { date: date, value: goal.initialDeposit };
    
    const fvInitial = goal.initialDeposit * Math.pow(1 + monthlyRate, months);
    const fvContributions = goal.monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    
    return {
      date: date,
      value: fvInitial + fvContributions,
    };
  });
}

/**
 * Calculate portfolio gains from only FixedTermDeposit and Caucion positions.
 * This excludes gains from stocks, bonds, and crypto which are not considered
 * reliable for goal progress tracking.
 * @param positions - The user's portfolio positions.
 * @param transactions - The user's portfolio transactions.
 * @returns The total gains from fixed-income positions only.
 */
export function calculateFixedIncomeGains(
  positions: PortfolioPosition[],
  transactions: PortfolioTransaction[]
): number {
  // Calculate total deposits (initial capital)
  const totalDeposits = transactions
    .filter((t): t is DepositTransaction => t.type === 'Deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  // If no deposits, return 0
  if (totalDeposits === 0) {
    return 0;
  }

  // Calculate current value of fixed-income positions only
  let fixedIncomeValue = 0;
  
  positions.forEach(pos => {
    if (pos.type === 'FixedTermDeposit' || pos.type === 'Caucion') {
      // For fixed-term deposits and cauciones, the current value is the amount
      // plus accrued interest since the start date
      const startDate = new Date(pos.startDate);
      const maturityDate = new Date(pos.maturityDate);
      const currentDate = new Date();
      
      // If the position has matured, the value is the amount plus full interest
      if (currentDate >= maturityDate) {
        const termDays = Math.ceil((maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const interest = pos.amount * (pos.annualRate / 100) * (termDays / 365);
        fixedIncomeValue += pos.amount + interest;
      } else {
        // If not matured, calculate accrued interest up to current date
        const daysElapsed = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const accruedInterest = pos.amount * (pos.annualRate / 100) * (daysElapsed / 365);
        fixedIncomeValue += pos.amount + accruedInterest;
      }
    }
  });

  // Calculate gains as the difference between fixed-income value and deposits
  // We assume that deposits are used for fixed-income investments
  if (fixedIncomeValue <= totalDeposits) {
    return 0;
  }
  return fixedIncomeValue - totalDeposits;
}

/**
 * Calculate fixed-income value history for goal progress tracking.
 * This creates a simplified value history based on fixed-income positions only.
 * @param positions - The user's portfolio positions.
 * @param transactions - The user's portfolio transactions.
 * @param days - Number of days to look back (default: 90).
 * @returns Array of value history entries with date and value.
 */
export function calculateFixedIncomeValueHistory(
  positions: PortfolioPosition[],
  transactions: PortfolioTransaction[],
  days: number = 90
): { date: string; value: number }[] {
  const today = new Date();
  const startDate = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  // Get all fixed-income positions
  const fixedIncomePositions = positions.filter(pos => 
    pos.type === 'FixedTermDeposit' || pos.type === 'Caucion'
  );
  const valueHistory: { date: string; value: number }[] = [];
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    let dailyValue = 0;
    if (fixedIncomePositions.length > 0) {
      fixedIncomePositions.forEach(pos => {
        if (pos.type === 'FixedTermDeposit' || pos.type === 'Caucion') {
          const positionStartDate = new Date(pos.startDate);
          const positionMaturityDate = new Date(pos.maturityDate);
          if (currentDate >= positionStartDate) {
            let positionValue = pos.amount;
            if (currentDate >= positionMaturityDate) {
              const termDays = Math.ceil((positionMaturityDate.getTime() - positionStartDate.getTime()) / (1000 * 60 * 60 * 24));
              const interest = pos.amount * (pos.annualRate / 100) * (termDays / 365);
              positionValue = pos.amount + interest;
            } else {
              const daysElapsed = Math.ceil((currentDate.getTime() - positionStartDate.getTime()) / (1000 * 60 * 60 * 24));
              const accruedInterest = pos.amount * (pos.annualRate / 100) * (daysElapsed / 365);
              positionValue = pos.amount + accruedInterest;
            }
            dailyValue += positionValue;
          }
        }
      });
    }
    valueHistory.push({
      date: currentDate.toISOString().split('T')[0],
      value: dailyValue
    });
  }
  return valueHistory;
}

/**
 * Calculate the intersection date between fixed income projection and goal target amount.
 * This determines where the fixed income line crosses the target amount line.
 * @param fixedIncomeProjection - Array of fixed income projection data.
 * @param targetAmount - The goal target amount.
 * @returns The date when fixed income reaches the target amount, or null if never reached.
 */
export function calculateIntersectionDate(
  fixedIncomeProjection: { date: string; value: number }[],
  targetAmount: number
): string | null {
  if (fixedIncomeProjection.length === 0) return null;
  
  // Find the first point where fixed income value >= target amount
  const intersectionPoint = fixedIncomeProjection.find(point => point.value >= targetAmount);
  
  if (!intersectionPoint) {
    // If never reached, return the last date in projection
    return fixedIncomeProjection[fixedIncomeProjection.length - 1]?.date || null;
  }
  
  return intersectionPoint.date;
}

/**
 * Distribute fixed income returns equally among all active goals.
 * This ensures that all goals benefit from the portfolio's fixed income performance.
 * @param positions - The user's portfolio positions.
 * @param bonds - Available bond information.
 * @param goals - Array of all active investment goals.
 * @param currentValue - Current fixed income value.
 * @returns Object containing distributed projections for each goal, in each goal's currency.
 */
export function distributeFixedIncomeReturns(
  positions: PortfolioPosition[],
  bonds: Bond[],
  goals: InvestmentGoal[],
  currentValue: number
): Record<string, { date: string; value: number }[]> {
  if (goals.length === 0) {
    return {};
  }

  const distributedProjections: Record<string, { date: string; value: number }[]> = {};

  // Calculate daily interest for each goal's currency
  const dailyInterestByCurrency: Record<'ARS' | 'USD', number> = {
    ARS: calculateDailyInterest(positions, bonds, 'ARS'),
    USD: calculateDailyInterest(positions, bonds, 'USD'),
  };

  // Distribute equally among all goals
  const dailyInterestPerGoal = {
    ARS: dailyInterestByCurrency.ARS / goals.length,
    USD: dailyInterestByCurrency.USD / goals.length,
  };

  // For each goal, create a projection in its own currency
  goals.forEach(goal => {
    const goalDailyInterest = dailyInterestPerGoal[goal.currency];
    // Distribute the current value equally among all goals, then convert to the goal's currency
    const perGoalValueARS = currentValue / goals.length;
    const goalCurrentValue = convertCurrencySync(perGoalValueARS, 'ARS', goal.currency);
    
    const projection: { date: string; value: number }[] = [];
    let currentDate = dayjs();
    let cumulativeValue = goalCurrentValue;

    // Start with today's value
    projection.push({
      date: currentDate.format('YYYY-MM-DD'),
      value: cumulativeValue,
    });

    // Find the farthest goal date
    const farthestGoalDate = goals.reduce((farthest, g) => {
      const goalDate = dayjs(g.targetDate);
      return goalDate.isAfter(farthest) ? goalDate : farthest;
    }, dayjs());

    // Calculate the maximum projection date: 5 years beyond the farthest goal date
    const maxProjectionDate = farthestGoalDate.add(5, 'year');

    // Project until the goal's target amount is reached or max horizon is hit
    let projectionEndDate = farthestGoalDate;
    
    if (goalDailyInterest > 0) {
      // Calculate when this goal's target amount will be reached
      if (goal.targetAmount > cumulativeValue) {
        const remainingAmount = goal.targetAmount - cumulativeValue;
        const daysToReach = Math.ceil(remainingAmount / goalDailyInterest);
        const goalReachedDate = currentDate.add(daysToReach, 'day');
        
        // Use the later date between goal target date and calculated reach date
        projectionEndDate = goalReachedDate.isAfter(farthestGoalDate) ? goalReachedDate : farthestGoalDate;
      }
    }

    // Limit to max projection date
    if (projectionEndDate.isAfter(maxProjectionDate)) {
      projectionEndDate = maxProjectionDate;
    }

    // Start from tomorrow since we already added today
    currentDate = currentDate.add(1, 'day');
    cumulativeValue += goalDailyInterest;

    while (currentDate.isBefore(projectionEndDate) || currentDate.isSame(projectionEndDate, 'day')) {
      projection.push({
        date: currentDate.format('YYYY-MM-DD'),
        value: cumulativeValue,
      });
      cumulativeValue += goalDailyInterest;
      currentDate = currentDate.add(1, 'day');
    }

    distributedProjections[goal.id] = projection;
  });

  return distributedProjections;
}

/**
 * Calculate the estimated completion date for a goal based on distributed fixed income returns.
 * @param goal - The investment goal.
 * @param distributedProjection - The distributed fixed income projection for this goal.
 * @returns The estimated completion date or null if not reachable.
 */
export function calculateEstimatedCompletionDate(
  goal: InvestmentGoal,
  distributedProjection: { date: string; value: number }[]
): string | null {
  if (distributedProjection.length === 0) return null;
  
  // Find when the distributed projection reaches the target amount
  const completionPoint = distributedProjection.find(point => point.value >= goal.targetAmount);
  
  if (!completionPoint) {
    // If never reached, return null
    return null;
  }
  
  return completionPoint.date;
} 