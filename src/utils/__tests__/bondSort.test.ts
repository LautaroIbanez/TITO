import { sortBonds, toggleSortDirection, getSortIndicator } from '../bondSort';
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

describe('bondSort', () => {
  describe('sortBonds', () => {
    it('should sort bonds by price in ascending order', () => {
      const sorted = sortBonds(mockBonds, 'price', 'asc');
      expect(sorted[0].ticker).toBe('GD30');
      expect(sorted[1].ticker).toBe('AL30');
      expect(sorted[2].ticker).toBe('AE38');
    });

    it('should sort bonds by price in descending order', () => {
      const sorted = sortBonds(mockBonds, 'price', 'desc');
      expect(sorted[0].ticker).toBe('AE38');
      expect(sorted[1].ticker).toBe('AL30');
      expect(sorted[2].ticker).toBe('GD30');
    });

    it('should sort bonds by TIR in ascending order', () => {
      const sorted = sortBonds(mockBonds, 'tir', 'asc');
      expect(sorted[0].ticker).toBe('GD30');
      expect(sorted[1].ticker).toBe('AL30');
      expect(sorted[2].ticker).toBe('AE38');
    });

    it('should sort bonds by ticker in ascending order', () => {
      const sorted = sortBonds(mockBonds, 'ticker', 'asc');
      expect(sorted[0].ticker).toBe('AE38');
      expect(sorted[1].ticker).toBe('AL30');
      expect(sorted[2].ticker).toBe('GD30');
    });

    it('should handle null values correctly', () => {
      const bondsWithNull = [
        { ...mockBonds[0], tir: null },
        { ...mockBonds[1], tir: 1200 },
        { ...mockBonds[2], tir: 1800 }
      ];
      
      const sorted = sortBonds(bondsWithNull, 'tir', 'asc');
      expect(sorted[0].ticker).toBe('GD30'); // 1200
      expect(sorted[1].ticker).toBe('AE38'); // 1800
      expect(sorted[2].ticker).toBe('AL30'); // null value goes last
    });
  });

  describe('toggleSortDirection', () => {
    it('should toggle from asc to desc', () => {
      expect(toggleSortDirection('asc')).toBe('desc');
    });

    it('should toggle from desc to asc', () => {
      expect(toggleSortDirection('desc')).toBe('asc');
    });
  });

  describe('getSortIndicator', () => {
    it('should return up arrow for ascending sort', () => {
      expect(getSortIndicator('price', 'price', 'asc')).toBe('↑');
    });

    it('should return down arrow for descending sort', () => {
      expect(getSortIndicator('price', 'price', 'desc')).toBe('↓');
    });

    it('should return empty string for different column', () => {
      expect(getSortIndicator('price', 'tir', 'asc')).toBe('');
    });
  });
}); 