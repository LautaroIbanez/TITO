import { PortfolioPosition, InvestmentGoal } from '@/types';
import { Bond } from '@/types/finance';
import dayjs from 'dayjs';

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
  const formatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
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
    } else if (pos.type === 'Bond') {
      const bondInfo = bonds.find(b => b.ticker === pos.ticker);
      if (bondInfo) {
        const value = pos.quantity * pos.averagePrice;
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