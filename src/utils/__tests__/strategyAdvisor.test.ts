import { generateInvestmentStrategy, StrategyInput } from '../strategyAdvisor';
import { InvestorProfile, InvestmentGoal, PortfolioPosition } from '@/types';
import dayjs from 'dayjs';

describe('strategyAdvisor', () => {
  const mockProfile: InvestorProfile = {
    instrumentsUsed: ['stocks', 'bonds'],
    knowledgeLevels: { stocks: 'Medio' },
    holdingPeriod: 'Mediano plazo (3-5 años)',
    ageGroup: '25-35',
    riskAppetite: 'Balanceado',
    investmentAmount: 10000
  };

  const mockGoals: InvestmentGoal[] = [
    {
      id: '1',
      name: 'Vacaciones',
      targetAmount: 5000,
      targetDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
      initialDeposit: 1000,
      monthlyContribution: 200,
      currency: 'ARS'
    }
  ];

  const mockPositions: PortfolioPosition[] = [
    {
      type: 'Stock',
      symbol: 'AAPL',
      quantity: 10,
      averagePrice: 150,
      currency: 'USD',
      market: 'NASDAQ',
    },
    {
      type: 'Stock',
      symbol: 'MSFT',
      quantity: 5,
      averagePrice: 300,
      currency: 'USD',
      market: 'NASDAQ',
    }
  ];

  describe('generateInvestmentStrategy', () => {
    it('should generate a strategy with basic input', () => {
      const strategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: mockGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      expect(strategy).toBeDefined();
      expect(strategy.id).toMatch(/^strategy-/);
      expect(strategy.createdAt).toBeDefined();
      expect(strategy.targetAllocation).toBeDefined();
      expect(strategy.recommendations).toBeDefined();
      expect(strategy.riskLevel).toBe(mockProfile.riskAppetite);

      // Verify allocation totals exactly 100%
      const totalAllocation = strategy.targetAllocation.stocks +
                             strategy.targetAllocation.bonds +
                             strategy.targetAllocation.deposits +
                             strategy.targetAllocation.cash +
                             (strategy.targetAllocation.crypto || 0);
      expect(totalAllocation).toBeCloseTo(100, 1);
    });

    it('should generate conservative allocation for conservative profile', () => {
      const conservativeProfile = { ...mockProfile, riskAppetite: 'Conservador' as const };
      const strategy = generateInvestmentStrategy({
        profile: conservativeProfile,
        goals: mockGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      expect(strategy.targetAllocation.stocks).toBeLessThanOrEqual(50);
      expect(strategy.targetAllocation.bonds).toBeGreaterThanOrEqual(40);
    });

    it('should generate aggressive allocation for aggressive profile', () => {
      const aggressiveProfile = { ...mockProfile, riskAppetite: 'Agresivo' as const };
      const strategy = generateInvestmentStrategy({
        profile: aggressiveProfile,
        goals: mockGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      expect(strategy.targetAllocation.stocks).toBeGreaterThanOrEqual(65);
      expect(strategy.targetAllocation.bonds).toBeLessThanOrEqual(20);
    });

    it('should keep stock allocation high for aggressive profile with short-term goals', () => {
      const aggressiveProfile = { ...mockProfile, riskAppetite: 'Agresivo' as const };
      const shortTermGoals: InvestmentGoal[] = [
        {
          id: '1',
          name: 'Emergencia',
          targetAmount: 3000,
          targetDate: dayjs().add(6, 'months').format('YYYY-MM-DD'),
          initialDeposit: 1000,
          monthlyContribution: 200,
          currency: 'ARS'
        }
      ];

      const strategy = generateInvestmentStrategy({
        profile: aggressiveProfile,
        goals: shortTermGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      expect(strategy.targetAllocation.stocks).toBeGreaterThanOrEqual(65);
      expect(strategy.targetAllocation.bonds).toBeLessThan(25);
      
      const totalAllocation = strategy.targetAllocation.stocks +
                             strategy.targetAllocation.bonds +
                             strategy.targetAllocation.deposits +
                             strategy.targetAllocation.cash +
                             (strategy.targetAllocation.crypto || 0);
      expect(totalAllocation).toBeCloseTo(100, 1);
      
      // Verify all components are non-negative
      expect(strategy.targetAllocation.stocks).toBeGreaterThanOrEqual(0);
      expect(strategy.targetAllocation.bonds).toBeGreaterThanOrEqual(0);
      expect(strategy.targetAllocation.deposits).toBeGreaterThanOrEqual(0);
      expect(strategy.targetAllocation.cash).toBeGreaterThanOrEqual(0);
    });

    it('should ensure allocation totals exactly 100 for long-term aggressive profile with high knowledge', () => {
      const aggressiveProfile = { ...mockProfile, riskAppetite: 'Agresivo' as const };
      const highKnowledgeProfile = { 
        ...aggressiveProfile, 
        knowledgeLevels: { stocks: 'Alto' as const } 
      };
      const longTermGoals: InvestmentGoal[] = [
        {
          id: '1',
          name: 'Retiro',
          targetAmount: 1000000,
          targetDate: dayjs().add(20, 'years').format('YYYY-MM-DD'),
          initialDeposit: 10000,
          monthlyContribution: 1000,
          currency: 'ARS'
        }
      ];

      const strategy = generateInvestmentStrategy({
        profile: highKnowledgeProfile,
        goals: longTermGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      const totalAllocation = strategy.targetAllocation.stocks +
                             strategy.targetAllocation.bonds +
                             strategy.targetAllocation.deposits +
                             strategy.targetAllocation.cash +
                             (strategy.targetAllocation.crypto || 0);
      expect(totalAllocation).toBeCloseTo(100, 1);
      
      // Verify all components are non-negative
      expect(strategy.targetAllocation.stocks).toBeGreaterThanOrEqual(0);
      expect(strategy.targetAllocation.bonds).toBeGreaterThanOrEqual(0);
      expect(strategy.targetAllocation.deposits).toBeGreaterThanOrEqual(0);
      expect(strategy.targetAllocation.cash).toBeGreaterThanOrEqual(0);
    });

    it('should adjust allocation based on knowledge level', () => {
      const highKnowledgeProfile = { 
        ...mockProfile, 
        knowledgeLevels: { stocks: 'Alto' as const } 
      };
      
      const lowKnowledgeProfile = { 
        ...mockProfile, 
        knowledgeLevels: { stocks: 'Bajo' as const } 
      };

      const highKnowledgeStrategy = generateInvestmentStrategy({
        profile: highKnowledgeProfile,
        goals: mockGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      const lowKnowledgeStrategy = generateInvestmentStrategy({
        profile: lowKnowledgeProfile,
        goals: mockGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      expect(highKnowledgeStrategy.targetAllocation.stocks).toBeGreaterThan(
        lowKnowledgeStrategy.targetAllocation.stocks
      );
    });

    it('should generate recommendations for portfolio imbalances', () => {
      const strategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: mockGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      expect(strategy.recommendations).toBeDefined();
      expect(Array.isArray(strategy.recommendations)).toBe(true);
      expect(strategy.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should generate rotation recommendations for concentrated portfolios', () => {
      const concentratedPositions: PortfolioPosition[] = [
        { type: 'Stock', symbol: 'AAPL', quantity: 10, averagePrice: 150, currency: 'USD', market: 'NASDAQ' },
        { type: 'Stock', symbol: 'MSFT', quantity: 5, averagePrice: 300, currency: 'USD', market: 'NASDAQ' },
        { type: 'Stock', symbol: 'GOOGL', quantity: 3, averagePrice: 2500, currency: 'USD', market: 'NASDAQ' },
        { type: 'Stock', symbol: 'AMZN', quantity: 2, averagePrice: 3000, currency: 'USD', market: 'NASDAQ' },
        { type: 'Stock', symbol: 'TSLA', quantity: 1, averagePrice: 800, currency: 'USD', market: 'NASDAQ' }
      ];

      const strategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: mockGoals,
        positions: concentratedPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      const rotationRecommendations = strategy.recommendations.filter(
        (rec: any) => rec.action === 'rotate'
      );

      expect(rotationRecommendations.length).toBeGreaterThan(0);
    });

    it('should generate cash management recommendations', () => {
      // Test with high cash
      const highCashStrategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: mockGoals,
        positions: mockPositions,
        cash: { ARS: 10000, USD: 0 }, // High cash relative to positions
      });

      const cashRecommendations = highCashStrategy.recommendations.filter(
        (rec: any) => rec.reason.includes('efectivo')
      );
      expect(cashRecommendations.length).toBeGreaterThan(0);
      expect(cashRecommendations[0].action).toBe('buy');

      // Test with low cash
      const lowCashPositions: PortfolioPosition[] = [
        ...mockPositions,
        { type: 'Stock', symbol: 'GOOGL', quantity: 10, averagePrice: 2500, currency: 'USD', market: 'NASDAQ' }
      ]
      const lowCashStrategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: mockGoals,
        positions: lowCashPositions,
        cash: { ARS: 100, USD: 0 }, // Low cash relative to positions
      });

      const lowCashRecs = lowCashStrategy.recommendations.filter(
        (rec: any) => rec.reason.includes('efectivo')
      );
      expect(lowCashRecs.length).toBeGreaterThan(0);
      expect(lowCashRecs[0].action).toBe('sell');
    });

    it('should handle empty positions and goals', () => {
      const strategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: [],
        positions: [],
        cash: { ARS: 1000, USD: 0 },
      });

      expect(strategy).toBeDefined();
      expect(strategy.recommendations).toBeDefined();
      expect(strategy.timeHorizon).toBe('5-10 años');
    });

    it('should generate goal-based recommendations for short-term goals', () => {
      const shortTermGoals: InvestmentGoal[] = [
        {
          id: '1',
          name: 'Emergencia',
          targetAmount: 3000,
          targetDate: dayjs().add(6, 'months').format('YYYY-MM-DD'),
          initialDeposit: 1000,
          monthlyContribution: 200,
          currency: 'ARS'
        }
      ];

      const strategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: shortTermGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      expect(strategy.timeHorizon).toBe('Corto plazo (< 3 años)');
    });

    it('should generate conservative recommendations for conservative profile with volatile stocks', () => {
      const conservativeProfile = { ...mockProfile, riskAppetite: 'Conservador' as const };
      const volatilePositions: PortfolioPosition[] = [
        { type: 'Stock', symbol: 'TSLA', quantity: 10, averagePrice: 200, currency: 'USD', market: 'NASDAQ' }
      ];

      const strategy = generateInvestmentStrategy({
        profile: conservativeProfile,
        goals: mockGoals,
        positions: volatilePositions,
        cash: { ARS: 1000, USD: 0 },
      });

      const tslaRecommendations = strategy.recommendations.filter(
        (rec: any) => rec.symbol === 'TSLA'
      );

      expect(tslaRecommendations.length).toBeGreaterThan(0);
      expect(tslaRecommendations[0].priority).toBe('high');
    });

    it('should always normalize allocation to exactly 100% total', () => {
      const testCases = [
        { profile: mockProfile, goals: mockGoals },
        { profile: { ...mockProfile, riskAppetite: 'Conservador' as const }, goals: mockGoals },
        { profile: { ...mockProfile, riskAppetite: 'Agresivo' as const }, goals: mockGoals },
        { profile: mockProfile, goals: [] },
        { profile: { ...mockProfile, knowledgeLevels: { stocks: 'Alto' as const } }, goals: mockGoals },
        { profile: { ...mockProfile, knowledgeLevels: { stocks: 'Bajo' as const } }, goals: mockGoals },
      ];

      testCases.forEach(({ profile, goals }) => {
        const strategy = generateInvestmentStrategy({
          profile,
          goals,
          positions: mockPositions,
          cash: { ARS: 1000, USD: 0 },
        });

        const totalAllocation = strategy.targetAllocation.stocks +
                               strategy.targetAllocation.bonds +
                               strategy.targetAllocation.deposits +
                               strategy.targetAllocation.cash +
                               (strategy.targetAllocation.crypto || 0);
        
        expect(totalAllocation).toBeCloseTo(100, 1);
        
        // Also verify all components are non-negative
        expect(strategy.targetAllocation.stocks).toBeGreaterThanOrEqual(0);
        expect(strategy.targetAllocation.bonds).toBeGreaterThanOrEqual(0);
        expect(strategy.targetAllocation.deposits).toBeGreaterThanOrEqual(0);
        expect(strategy.targetAllocation.cash).toBeGreaterThanOrEqual(0);
      });
    });

    it('should not generate recommendations for a well-balanced portfolio', () => {
      // This is tricky to set up perfectly without real price data, 
      // but we can approximate a "good enough" state.
      const balancedPositions: PortfolioPosition[] = [
        // ~60% stocks
        { type: 'Stock', symbol: 'AAPL', quantity: 40, averagePrice: 150, currency: 'USD', market: 'NASDAQ' }, // 6000
        // ~30% bonds
        { type: 'Bond', ticker: 'GOV-BOND-2025', quantity: 30, averagePrice: 100, currency: 'ARS' }, // 3000
        // ~5% deposits
        { type: 'FixedTermDeposit', id: 'ftd-1', provider: 'Test Bank', amount: 500, annualRate: 0.05, startDate: '2023-01-01', maturityDate: '2024-01-01', currency: 'ARS' } // 500
      ];

      const strategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: mockGoals,
        positions: balancedPositions,
        cash: { ARS: 500, USD: 0 }, // ~5% cash
      });

      // Allow for minor recommendations, but shouldn't have major rebalancing suggestions.
      expect(strategy.recommendations.length).toBeLessThanOrEqual(3);
    });

    it('should recommend rotating from volatile stocks for conservative profiles', () => {
      const conservativeProfile = { ...mockProfile, riskAppetite: 'Conservador' as const };
      const volatilePositions: PortfolioPosition[] = [
        { type: 'Stock', symbol: 'TSLA', quantity: 10, averagePrice: 200, currency: 'USD', market: 'NASDAQ' }
      ];

      const goals: InvestmentGoal[] = [{
        id: '1',
        name: 'Vacaciones',
        targetAmount: 5000,
        targetDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
        initialDeposit: 1000,
        monthlyContribution: 200,
        currency: 'ARS'
      }];

      const strategy = generateInvestmentStrategy({
        profile: conservativeProfile,
        goals: goals,
        positions: volatilePositions,
        cash: { ARS: 1000, USD: 0 },
      });

      const rotationRecommendations = strategy.recommendations.filter(
        (rec: any) => rec.action === 'rotate'
      );

      expect(rotationRecommendations.length).toBeGreaterThan(0);
    });

    it('should generate bond increase recommendations with alternatives', () => {
      const lowBondPositions: PortfolioPosition[] = [
        { type: 'Stock', symbol: 'AAPL', quantity: 10, averagePrice: 150, currency: 'USD', market: 'NASDAQ' },
      ];
      const strategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: mockGoals,
        positions: lowBondPositions,
        cash: { ARS: 1000, USD: 0 },
      });
      const bondRec = strategy.recommendations.find(
        (rec: any) => rec.assetClass === 'bonds' && rec.action === 'increase'
      );
      expect(bondRec).toBeDefined();
      if (!bondRec) throw new Error('No bond recommendation found');
      expect(bondRec.suggestedAssets).toBeDefined();
      expect(Array.isArray(bondRec.suggestedAssets)).toBe(true);
      expect(bondRec.suggestedAssets && bondRec.suggestedAssets.length).toBeGreaterThan(0);
      expect(bondRec.suggestedAssets).toEqual(expect.arrayContaining([
        'GOV-BOND-2025', 'CORP-BOND-2026', 'MUNI-BOND-2027'
      ]));
    });
  });
}); 