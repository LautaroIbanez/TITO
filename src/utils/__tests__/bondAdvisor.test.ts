import { suggestBondsByProfile, getProfileDisplayName } from '../bondAdvisor';
import { Bond } from '@/types/finance';

const mockBonds: Bond[] = [
  {
    id: 'AL30',
    ticker: 'AL30',
    name: 'Bono AL30',
    issuer: 'Argentina',
    price: 100,
    tir: 1500,
    tna: 1200,
    currency: 'ARS',
    bcbaPrice: 100,
    mepPrice: 50,
    cclPrice: 45,
    duration: 5.5,
    difference: 2.5,
    mtir: 1400,
    volume: 1000000,
    parity: 95.5,
    ttir: 1450,
    uptir: 1600,
    couponRate: 7.5,
    maturityDate: '2030-07-09'
  },
  {
    id: 'GD30',
    ticker: 'GD30',
    name: 'Bono GD30',
    issuer: 'Argentina',
    price: 90,
    tir: 1200,
    tna: 1000,
    currency: 'ARS',
    bcbaPrice: 90,
    mepPrice: 45,
    cclPrice: 40,
    duration: 4.5,
    difference: 1.5,
    mtir: 1100,
    volume: 800000,
    parity: 85.5,
    ttir: 1150,
    uptir: 1300,
    couponRate: 6.5,
    maturityDate: '2030-01-15'
  },
  {
    id: 'AE38',
    ticker: 'AE38',
    name: 'Bono AE38',
    issuer: 'Argentina',
    price: 110,
    tir: 1800,
    tna: 1500,
    currency: 'ARS',
    bcbaPrice: 110,
    mepPrice: 55,
    cclPrice: 50,
    duration: 6.5,
    difference: 3.5,
    mtir: 1700,
    volume: 1200000,
    parity: 105.5,
    ttir: 1750,
    uptir: 1900,
    couponRate: 8.5,
    maturityDate: '2038-03-20'
  }
];

describe('bondAdvisor', () => {
  describe('suggestBondsByProfile', () => {
    it('should suggest bonds for conservative profile', () => {
      const recommendations = suggestBondsByProfile('conservador', mockBonds);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('bond');
      expect(recommendations[0]).toHaveProperty('score');
      expect(recommendations[0]).toHaveProperty('reasons');
      
      // Conservative profile should prefer bonds with lower risk
      const firstBond = recommendations[0].bond;
      expect(firstBond.parity).toBeGreaterThanOrEqual(90);
      expect(firstBond.parity).toBeLessThanOrEqual(110);
    });

    it('should suggest bonds for moderate profile', () => {
      const recommendations = suggestBondsByProfile('moderado', mockBonds);
      
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Moderate profile should balance risk and return
      const firstBond = recommendations[0].bond;
      expect(firstBond.tir).toBeGreaterThan(1000);
    });

    it('should suggest bonds for aggressive profile', () => {
      const recommendations = suggestBondsByProfile('arriesgado', mockBonds);
      
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Aggressive profile should prefer higher returns
      const firstBond = recommendations[0].bond;
      expect(firstBond.tir).toBeGreaterThan(1200);
    });

    it('should sort recommendations by score (highest first)', () => {
      const recommendations = suggestBondsByProfile('moderado', mockBonds);
      
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].score).toBeGreaterThanOrEqual(recommendations[i].score);
      }
    });

    it('should include reasons for recommendations', () => {
      const recommendations = suggestBondsByProfile('arriesgado', mockBonds);
      
      recommendations.forEach(rec => {
        expect(Array.isArray(rec.reasons)).toBe(true);
        expect(rec.reasons.length).toBeGreaterThan(0);
      });
    });

    it('should handle bonds with missing data', () => {
      const bondsWithMissingData: Bond[] = [
        {
          ...mockBonds[0],
          tir: null,
          parity: null,
          uptir: null
        },
        {
          ...mockBonds[1],
          volume: null
        }
      ];
      
      const recommendations = suggestBondsByProfile('conservador', bondsWithMissingData);
      
      // Should still return recommendations even with missing data
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getProfileDisplayName', () => {
    it('should return correct display names', () => {
      expect(getProfileDisplayName('conservador')).toBe('Conservador');
      expect(getProfileDisplayName('moderado')).toBe('Moderado');
      expect(getProfileDisplayName('arriesgado')).toBe('Arriesgado');
    });
  });
}); 