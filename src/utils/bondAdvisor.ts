import { Bond } from '@/types/finance';
import { RiskAppetite } from '@/types';

export type RiskProfile = 'conservador' | 'moderado' | 'arriesgado';

export function mapRiskAppetiteToProfile(appetite?: RiskAppetite | null): RiskProfile {
  if (appetite === 'Conservador') return 'conservador';
  if (appetite === 'Agresivo') return 'arriesgado';
  // "Balanceado" o undefined/null
  return 'moderado';
}

export interface BondRecommendation {
  bond: Bond;
  score: number;
  reasons: string[];
}

/**
 * Suggests bonds based on user's risk profile
 */
export function suggestBondsByProfile(profile: RiskProfile, bonds: Bond[]): BondRecommendation[] {
  const recommendations: BondRecommendation[] = [];

  for (const bond of bonds) {
    const score = calculateBondScore(bond, profile);
    const reasons = getRecommendationReasons(bond, profile);

    if (score > 0) {
      recommendations.push({
        bond,
        score,
        reasons
      });
    }
  }

  // Sort by score (highest first)
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Calculates a score for a bond based on risk profile
 */
function calculateBondScore(bond: Bond, profile: RiskProfile): number {
  let score = 0;

  // TIR scoring (higher is better for all profiles, but weight varies)
  if (bond.tir !== null && bond.tir !== undefined) {
    const tirWeight = profile === 'conservador' ? 0.3 : profile === 'moderado' ? 0.5 : 0.7;
    score += (bond.tir / 100) * tirWeight;
  }

  // Parity scoring (closer to 100 is better for conservative, higher is better for aggressive)
  if (bond.parity !== null && bond.parity !== undefined) {
    if (profile === 'conservador') {
      // Conservative: prefer bonds closer to par (100)
      const distanceFromPar = Math.abs(bond.parity - 100);
      score += (100 - distanceFromPar) / 100 * 0.4;
    } else {
      // Moderate/Aggressive: prefer higher parity
      score += (bond.parity / 100) * 0.3;
    }
  }

  // UPTIR scoring (higher is better for aggressive profiles)
  if (bond.uptir !== null && bond.uptir !== undefined) {
    const uptirWeight = profile === 'conservador' ? 0.1 : profile === 'moderado' ? 0.3 : 0.5;
    score += (bond.uptir / 100) * uptirWeight;
  }

  // Duration scoring (lower is better for conservative, higher for aggressive)
  if (bond.duration !== null && bond.duration !== undefined) {
    if (profile === 'conservador') {
      // Conservative: prefer shorter duration
      score += (1 / Math.max(bond.duration, 1)) * 0.2;
    } else if (profile === 'arriesgado') {
      // Aggressive: prefer longer duration
      score += Math.min(bond.duration / 10, 1) * 0.2;
    }
  }

  // Volume scoring (higher volume = more liquid = better)
  if (bond.volume !== null && bond.volume !== undefined) {
    const volumeScore = Math.min(bond.volume / 1000000, 1); // Normalize to 1M
    score += volumeScore * 0.1;
  }

  return score;
}

/**
 * Gets reasons for recommending a bond
 */
function getRecommendationReasons(bond: Bond, profile: RiskProfile): string[] {
  const reasons: string[] = [];

  if (bond.tir !== null && bond.tir !== undefined) {
    if (profile === 'conservador' && bond.tir > 800) {
      reasons.push('TIR atractivo para perfil conservador');
    } else if (profile === 'moderado' && bond.tir > 1200) {
      reasons.push('TIR alto para perfil moderado');
    } else if (profile === 'arriesgado' && bond.tir > 1500) {
      reasons.push('TIR muy alto para perfil arriesgado');
    }
  }

  if (bond.parity !== null && bond.parity !== undefined) {
    if (profile === 'conservador' && bond.parity >= 90 && bond.parity <= 110) {
      reasons.push('Paridad cercana al valor nominal');
    } else if (profile === 'arriesgado' && bond.parity > 120) {
      reasons.push('Alta paridad para mayor retorno');
    }
  }

  if (bond.uptir !== null && bond.uptir !== undefined) {
    if (profile === 'arriesgado' && bond.uptir > 1500) {
      reasons.push('UPTIR alto para perfil arriesgado');
    }
  }

  if (bond.volume !== null && bond.volume !== undefined && bond.volume > 500000) {
    reasons.push('Alto volumen de negociación');
  }

  return reasons;
}

/**
 * Gets profile display name
 */
export function getProfileDisplayName(profile: RiskProfile): string {
  const names = {
    conservador: 'Conservador',
    moderado: 'Moderado',
    arriesgado: 'Arriesgado'
  };
  return names[profile];
} 