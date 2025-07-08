import { InvestorProfile, InvestmentGoal, InvestmentStrategy, StrategyRecommendation, RiskAppetite, PortfolioPosition } from '@/types';
import dayjs from 'dayjs';

// Popular stock symbols for rotation suggestions
const POPULAR_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'JPM', 'JNJ'];

// Bond alternatives
const BOND_ALTERNATIVES = ['GOV-BOND-2025', 'CORP-BOND-2026', 'MUNI-BOND-2027'];

export interface StrategyInput {
  profile: InvestorProfile;
  goals: InvestmentGoal[];
  positions: PortfolioPosition[];
  cash: { ARS: number; USD: number };
}

// Helper para generar IDs únicos
function generateId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback simple
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
}

export function generateInvestmentStrategy(input: StrategyInput): InvestmentStrategy {
  const { profile, goals, positions, cash } = input;
  
  // Calculate target allocation based on risk profile and goals
  const targetAllocation = calculateTargetAllocation(profile, goals);
  
  // Generate recommendations based on current positions vs target allocation
  const recommendations = generateRecommendations(profile, goals, positions, cash, targetAllocation);
  
  // Determine time horizon based on goals
  const timeHorizon = calculateTimeHorizon(goals);
  
  return {
    id: `strategy-${generateId()}`,
    createdAt: new Date().toISOString(),
    targetAllocation,
    recommendations,
    riskLevel: profile.riskAppetite,
    timeHorizon,
    notes: generateStrategyNotes(profile, goals)
  };
}

function calculateTargetAllocation(profile: InvestorProfile, goals: InvestmentGoal[]): InvestmentStrategy['targetAllocation'] & { crypto?: number } {
  let stocks = 60;
  let bonds = 30;
  let deposits = 5;
  let cash = 5;
  let crypto = 0;
  
  // Adjust based on risk appetite
  switch (profile.riskAppetite) {
    case 'Conservador':
      stocks = 40;
      bonds = 45;
      deposits = 10;
      cash = 5;
      crypto = 0;
      break;
    case 'Agresivo':
      stocks = 75;
      bonds = 15;
      deposits = 3;
      cash = 2;
      crypto = 5; // Aggressive: allow up to 5% in crypto
      break;
    case 'Balanceado':
    default:
      crypto = 1; // Balanced: allow up to 1% in crypto
      break;
  }
  
  // Adjust based on time horizon (goals)
  const avgYearsToGoal = goals.length > 0 
    ? goals.reduce((sum, goal) => {
        const years = dayjs(goal.targetDate).diff(dayjs(), 'year', true);
        return sum + years;
      }, 0) / goals.length
    : 5;
  
  if (avgYearsToGoal < 3) {
    // Short-term: more conservative
    if (profile.riskAppetite === 'Agresivo') {
      // For aggressive profiles, reduce stock allocation less and set a floor
      stocks = Math.max(70, stocks - 10); // Floor at 70%
      bonds = Math.min(20, bonds + 5);
      deposits = Math.min(5, deposits + 2);
    } else {
      stocks = Math.max(20, stocks - 20);
      bonds = Math.min(60, bonds + 15);
      deposits = Math.min(15, deposits + 5);
    }
  } else if (avgYearsToGoal > 10) {
    // Long-term: more aggressive
    stocks = Math.min(90, stocks + 10); // Slightly less aggressive increase
    bonds = Math.max(5, bonds - 8);
    deposits = Math.max(2, deposits - 2);
  }
  
  // Adjust based on knowledge level
  if (profile.knowledgeLevels?.stocks === 'Alto') {
    stocks = Math.min(90, stocks + 5);
    bonds = Math.max(5, bonds - 3);
    deposits = Math.max(2, deposits - 2);
  } else if (profile.knowledgeLevels?.stocks === 'Bajo') {
    stocks = Math.max(30, stocks - 10);
    bonds = Math.min(50, bonds + 5);
    deposits = Math.min(15, deposits + 5);
  }

  // Ensure aggressive profiles maintain minimum stock allocation for short-term goals
  if (profile.riskAppetite === 'Agresivo' && avgYearsToGoal < 3) {
    stocks = Math.max(stocks, 70);
  }

  // Remove crypto from normalization, normalize the rest to 100-crypto
  let total = stocks + bonds + deposits + cash;
  const nonCryptoTotal = total;
  if (crypto > 0) {
    const scale = (100 - crypto) / nonCryptoTotal;
    stocks *= scale;
    bonds *= scale;
    deposits *= scale;
    cash *= scale;
    total = stocks + bonds + deposits + cash + crypto;
  } else {
    // If no crypto, normalize to 100 as before
    if (total !== 100) {
      const diff = 100 - total;
      if (diff > 0) {
        cash += diff;
      } else {
        const excess = Math.abs(diff);
        if (cash > excess + 1) {
          cash -= excess;
        } else {
          const remainingExcess = excess - (cash - 1);
          cash = 1;
          const otherAssets = stocks + bonds + deposits;
          if (otherAssets > 0) {
            const stocksRatio = stocks / otherAssets;
            const bondsRatio = bonds / otherAssets;
            const depositsRatio = deposits / otherAssets;
            stocks -= remainingExcess * stocksRatio;
            bonds -= remainingExcess * bondsRatio;
            deposits -= remainingExcess * depositsRatio;
          }
        }
      }
    }
  }
  
  // Normalize all allocations so the sum is exactly 100
  function normalizeAllocations(parts: number[]): number[] {
    const total = parts.reduce((a, b) => a + b, 0);
    if (total === 0) return [0, 0, 0, 100, 0]; // Default to 100% cash if no allocations
    
    let normalized = parts.map(x => Math.round((x / total) * 10000) / 100);
    let sum = normalized.reduce((a, b) => a + b, 0);
    
    // Ajustar el componente más grande para compensar el error de redondeo
    if (Math.abs(sum - 100) > 0.01) {
      const maxIdx = normalized.indexOf(Math.max(...normalized));
      normalized[maxIdx] = Math.round((normalized[maxIdx] + (100 - sum)) * 100) / 100;
    }
    
    return normalized;
  }
  
  [stocks, bonds, deposits, cash, crypto] = normalizeAllocations([stocks, bonds, deposits, cash, crypto]);
  
  // Ensure cash is at least 1% after normalization
  if (cash < 1) {
    const diff = 1 - cash;
    cash = 1;
    // Remove from the largest allocation
    const allocations = [
      { key: 'stocks', value: stocks },
      { key: 'bonds', value: bonds },
      { key: 'deposits', value: deposits },
      { key: 'crypto', value: crypto },
    ];
    allocations.sort((a, b) => b.value - a.value);
    for (const alloc of allocations) {
      if (alloc.value > diff) {
        if (alloc.key === 'stocks') stocks -= diff;
        if (alloc.key === 'bonds') bonds -= diff;
        if (alloc.key === 'deposits') deposits -= diff;
        if (alloc.key === 'crypto') crypto -= diff;
        break;
      }
    }
  }
  
  // Final normalization to ensure exact 100%
  const finalTotal = stocks + bonds + deposits + cash + crypto;
  if (Math.abs(finalTotal - 100) > 0.01) {
    [stocks, bonds, deposits, cash, crypto] = normalizeAllocations([stocks, bonds, deposits, cash, crypto]);
  }
  
  // Ensure the return object includes crypto
  return { stocks, bonds, deposits, cash, crypto };
}

function generateRecommendations(
  profile: InvestorProfile, 
  goals: InvestmentGoal[], 
  positions: PortfolioPosition[], 
  cash: { ARS: number; USD: number },
  targetAllocation: ReturnType<typeof calculateTargetAllocation>
): StrategyRecommendation[] {
  const recommendations: StrategyRecommendation[] = [];
  const totalCash = cash.ARS + cash.USD;
  
  // Calculate current allocation
  const totalValue = calculateTotalPortfolioValue(positions, totalCash);
  const currentAllocation = calculateCurrentAllocation(positions, totalCash, totalValue);
  
  // Asset allocation recommendations
  if (currentAllocation.stocks < targetAllocation.stocks - 5) {
    recommendations.push({
      id: `alloc-${generateId()}`,
      action: 'increase',
      assetClass: 'stocks',
      reason: `Tu portafolio tiene ${currentAllocation.stocks.toFixed(1)}% en acciones, pero tu estrategia objetivo es ${targetAllocation.stocks}%`,
      priority: 'high',
      expectedImpact: 'positive'
    });
  } else if (currentAllocation.stocks > targetAllocation.stocks + 5) {
    recommendations.push({
      id: `alloc-${generateId()}`,
      action: 'decrease',
      assetClass: 'stocks',
      reason: `Tu portafolio tiene ${currentAllocation.stocks.toFixed(1)}% en acciones, pero tu estrategia objetivo es ${targetAllocation.stocks}%`,
      priority: 'medium',
      expectedImpact: 'neutral'
    });
  }
  
  if (currentAllocation.bonds < targetAllocation.bonds - 5) {
    recommendations.push({
      id: `alloc-${generateId()}`,
      action: 'increase',
      assetClass: 'bonds',
      reason: `Tu portafolio tiene ${currentAllocation.bonds.toFixed(1)}% en bonos, pero tu estrategia objetivo es ${targetAllocation.bonds}%. Considera alternativas como: ${BOND_ALTERNATIVES.join(', ')}`,
      priority: 'high',
      expectedImpact: 'positive',
      suggestedAssets: BOND_ALTERNATIVES,
    });
  }
  
  // Stock rotation recommendations
  const stockPositions = positions.filter((p): p is PortfolioPosition & { type: 'Stock'; symbol: string } => p.type === 'Stock');
  
  if (stockPositions.length > 0) {
    // Suggest rotation based on diversification
    const symbols = stockPositions.map(p => p.symbol);
    const techStocks = symbols.filter(s => ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'].includes(s));
    
    if (techStocks.length > 3) {
      const nonTechAlternatives = POPULAR_STOCKS.filter(s => !symbols.includes(s) && !['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'].includes(s));
      if (nonTechAlternatives.length > 0) {
        recommendations.push({
          id: `rotate-${generateId()}`,
          action: 'rotate',
          symbol: techStocks[0],
          targetSymbol: nonTechAlternatives[0],
          reason: 'Tu portafolio está muy concentrado en tecnología. Considera diversificar',
          priority: 'medium',
          expectedImpact: 'positive'
        });
      }
    }
    
    // Suggest rotation based on risk profile
    if (profile.riskAppetite === 'Conservador' && symbols.includes('TSLA')) {
      recommendations.push({
        id: `rotate-${generateId()}`,
        action: 'rotate',
        symbol: 'TSLA',
        targetSymbol: 'JNJ',
        reason: 'TSLA es muy volátil para un perfil conservador. Considera JNJ',
        priority: 'high',
        expectedImpact: 'positive'
      });
    }
  }
  
  // Cash management recommendations
  if (totalCash > totalValue * 0.15) {
    recommendations.push({
      id: `cash-invest-${generateId()}`,
      action: 'buy',
      assetClass: 'cash',
      reason: `Tienes un ${currentAllocation.cash.toFixed(1)}% de tu portafolio en efectivo. Considera invertirlo para alcanzar tus metas más rápido`,
      priority: 'high',
      expectedImpact: 'positive'
    });
  } else if (totalCash < totalValue * 0.02) {
    recommendations.push({
      id: `cash-reserve-${generateId()}`,
      action: 'sell',
      assetClass: 'cash',
      reason: `Tienes menos de 2% de tu portafolio en efectivo. Considera vender algunas posiciones para tener una reserva de liquidez.`,
      priority: 'low',
      expectedImpact: 'neutral'
    });
  }
  
  // Goal-based recommendations
  if (goals.length > 0) {
    const shortTermGoals = goals.filter(g => dayjs(g.targetDate).diff(dayjs(), 'year') < 3);
    if (shortTermGoals.length > 0 && currentAllocation.stocks > 70) {
      recommendations.push({
        id: `goal-${generateId()}`,
        action: 'decrease',
        assetClass: 'stocks',
        reason: 'Tienes metas a corto plazo. Considera reducir la exposición a acciones',
        priority: 'high',
        expectedImpact: 'positive'
      });
    }
  }
  
  // --- CRYPTO RECOMMENDATIONS ---
  if (typeof targetAllocation.crypto === 'number') {
    if ((currentAllocation.crypto ?? 0) < targetAllocation.crypto - 1) {
      recommendations.push({
        id: `alloc-${generateId()}`,
        action: 'increase',
        assetClass: 'crypto',
        reason: `Tu portafolio tiene ${(currentAllocation.crypto ?? 0).toFixed(1)}% en cripto, pero tu estrategia objetivo es ${targetAllocation.crypto}% (máximo recomendado por volatilidad).`,
        priority: 'medium',
        expectedImpact: 'neutral',
      });
    } else if ((currentAllocation.crypto ?? 0) > targetAllocation.crypto + 1) {
      recommendations.push({
        id: `alloc-${generateId()}`,
        action: 'decrease',
        assetClass: 'crypto',
        reason: `Tu portafolio tiene ${(currentAllocation.crypto ?? 0).toFixed(1)}% en cripto, superando el máximo recomendado de ${targetAllocation.crypto}%. Considera reducir exposición por volatilidad.`,
        priority: 'high',
        expectedImpact: 'negative',
      });
    }
  }
  
  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}

function calculateTotalPortfolioValue(positions: PortfolioPosition[], totalCash: number): number {
  let total = totalCash;
  // This function is simplified and assumes all assets are in a common currency (e.g., USD)
  // A real implementation would need price history and exchange rates.
  for (const pos of positions) {
    if (pos.type === 'Stock' || pos.type === 'Bond' || pos.type === 'Crypto') {
      total += pos.quantity * pos.averagePrice; 
    } else if (pos.type === 'FixedTermDeposit' || pos.type === 'Caucion') {
      total += pos.amount;
    }
  }
  return total;
}

function calculateCurrentAllocation(
  positions: PortfolioPosition[], 
  totalCash: number, 
  totalValue: number
): { stocks: number; bonds: number; deposits: number; cash: number; crypto: number } {
  if (totalValue === 0) {
    return { stocks: 0, bonds: 0, deposits: 0, cash: 100, crypto: 0 };
  }

  let stockValue = 0;
  let bondValue = 0;
  let depositValue = 0;
  let cryptoValue = 0;

  for (const pos of positions as any[]) {
    if (pos.type === 'Stock') {
      stockValue += pos.quantity * pos.averagePrice;
    } else if (pos.type === 'Bond') {
      bondValue += pos.quantity * pos.averagePrice;
    } else if (pos.type === 'FixedTermDeposit' || pos.type === 'Caucion') {
      depositValue += pos.amount;
    } else if (pos.type === 'Crypto') {
      cryptoValue += pos.quantity * pos.averagePrice;
    }
  }
  
  return {
    stocks: (stockValue / totalValue) * 100,
    bonds: (bondValue / totalValue) * 100,
    deposits: (depositValue / totalValue) * 100,
    cash: totalValue > 0 ? (totalCash / totalValue) * 100 : 0,
    crypto: (cryptoValue / totalValue) * 100,
  };
}

function calculateTimeHorizon(goals: InvestmentGoal[]): string {
  if (goals.length === 0) return '5-10 años';
  
  const avgYears = goals.reduce((sum, goal) => {
    const years = dayjs(goal.targetDate).diff(dayjs(), 'year', true);
    return sum + years;
  }, 0) / goals.length;
  
  if (avgYears < 3) return 'Corto plazo (< 3 años)';
  if (avgYears < 7) return 'Mediano plazo (3-7 años)';
  return 'Largo plazo (> 7 años)';
}

function generateStrategyNotes(profile: InvestorProfile, goals: InvestmentGoal[]): string {
  const notes = [];
  
  if (profile.riskAppetite === 'Conservador') {
    notes.push('Estrategia conservadora: prioriza la preservación de capital');
  } else if (profile.riskAppetite === 'Agresivo') {
    notes.push('Estrategia agresiva: busca maximizar retornos asumiendo mayor riesgo');
  }
  
  if (goals.length > 0) {
    notes.push(`Estrategia alineada con ${goals.length} meta(s) de inversión`);
  }
  
  if (profile.knowledgeLevels?.stocks === 'Alto') {
    notes.push('Perfil de alto conocimiento: puede manejar instrumentos más complejos');
  }
  
  return notes.join('. ');
} 