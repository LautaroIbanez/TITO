import { InvestorProfile } from '@/types';

export interface Allocation {
  stocks: number;
  bonds: number;
  deposits: number;
}

/**
 * Generates a portfolio allocation recommendation based on user's investor profile.
 * The allocation is determined by a scoring system that evaluates risk appetite,
 * investment horizon, and financial knowledge.
 *
 * @param profile The user's investor profile.
 * @returns An object with recommended percentages for stocks, bonds, and fixed-term deposits.
 */
export function generatePortfolio(profile: InvestorProfile): Allocation {
  let score = 0;

  // 1. Risk Appetite
  switch (profile.riskAppetite) {
    case 'Conservador':
      score -= 2;
      break;
    case 'Balanceado':
      score += 0;
      break;
    case 'Agresivo':
      score += 2;
      break;
  }

  // 2. Holding Period
  if (profile.holdingPeriod.includes('Largo plazo')) {
    score += 1;
  } else if (profile.holdingPeriod.includes('Corto plazo')) {
    score -= 1;
  }

  // 3. Knowledge Level (average of all instruments)
  const knowledgeValues = Object.values(profile.knowledgeLevels);
  const totalKnowledge = knowledgeValues.reduce((sum, level) => {
    if (level === 'Alto') return sum + 2;
    if (level === 'Medio') return sum + 1;
    return sum;
  }, 0);
  const avgKnowledge = totalKnowledge / (knowledgeValues.length || 1);

  if (avgKnowledge > 1.5) score += 1; // High average knowledge
  if (avgKnowledge < 1) score -= 1; // Low average knowledge
  
  // 4. Age Group (younger investors can take more risk)
  if (profile.ageGroup === '18-30' || profile.ageGroup === '31-40') {
    score += 1;
  } else if (profile.ageGroup === '51-65' || profile.ageGroup === '65+') {
    score -=1;
  }

  // Define base allocations for each risk profile
  const baseAllocations: Record<string, Allocation> = {
    conservative: { stocks: 20, bonds: 50, deposits: 30 },
    balanced: { stocks: 50, bonds: 30, deposits: 20 },
    aggressive: { stocks: 80, bonds: 15, deposits: 5 },
  };

  // Adjust allocation based on the final score
  let finalAllocation: Allocation;

  if (score <= -2) { // Very Conservative
    finalAllocation = baseAllocations.conservative;
  } else if (score > -2 && score <= 0) { // Conservative-Leaning
    finalAllocation = {
      stocks: (baseAllocations.conservative.stocks + baseAllocations.balanced.stocks) / 2,
      bonds: (baseAllocations.conservative.bonds + baseAllocations.balanced.bonds) / 2,
      deposits: (baseAllocations.conservative.deposits + baseAllocations.balanced.deposits) / 2,
    };
  } else if (score > 0 && score <= 2) { // Aggressive-Leaning
    finalAllocation = {
      stocks: (baseAllocations.balanced.stocks + baseAllocations.aggressive.stocks) / 2,
      bonds: (baseAllocations.balanced.bonds + baseAllocations.aggressive.bonds) / 2,
      deposits: (baseAllocations.balanced.deposits + baseAllocations.aggressive.deposits) / 2,
    };
  } else { // Very Aggressive
    finalAllocation = baseAllocations.aggressive;
  }
  
  return finalAllocation;
} 