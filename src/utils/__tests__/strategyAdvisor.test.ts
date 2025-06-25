import { generateInvestmentStrategy, StrategyInput } from '../strategyAdvisor';
import { InvestorProfile, InvestmentGoal, PortfolioPosition } from '@/types';
import dayjs from 'dayjs';
import { getSuggestedStocks } from '../../app/dashboard/scoop/page';

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
      monthlyContribution: 200
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
      const input: StrategyInput = {
        profile: mockProfile,
        goals: mockGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      };

      const strategy = generateInvestmentStrategy(input);

      expect(strategy).toBeDefined();
      expect(strategy.id).toMatch(/^strategy-/);
      expect(strategy.createdAt).toBeDefined();
      expect(strategy.riskLevel).toBe('Balanceado');
      expect(strategy.timeHorizon).toBeDefined();
      expect(strategy.notes).toBeDefined();
      
      // Check target allocation
      expect(strategy.targetAllocation).toBeDefined();
      expect(strategy.targetAllocation.stocks).toBeGreaterThan(0);
      expect(strategy.targetAllocation.bonds).toBeGreaterThan(0);
      expect(strategy.targetAllocation.deposits).toBeGreaterThan(0);
      expect(strategy.targetAllocation.cash).toBeGreaterThan(0);
      
      // Check that percentages sum to approximately 100
      const totalAllocation = strategy.targetAllocation.stocks + 
                             strategy.targetAllocation.bonds + 
                             strategy.targetAllocation.deposits + 
                             strategy.targetAllocation.cash;
      expect(totalAllocation).toBeCloseTo(100, 0);
    });

    it('should generate conservative allocation for conservative profile', () => {
      const conservativeProfile = { ...mockProfile, riskAppetite: 'Conservador' as const };
      
      const strategy = generateInvestmentStrategy({
        profile: conservativeProfile,
        goals: mockGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      expect(strategy.targetAllocation.stocks).toBeLessThan(50);
      expect(strategy.targetAllocation.bonds).toBeGreaterThan(40);
    });

    it('should generate aggressive allocation for aggressive profile', () => {
      const aggressiveProfile = { ...mockProfile, riskAppetite: 'Agresivo' as const };
      
      const strategy = generateInvestmentStrategy({
        profile: aggressiveProfile,
        goals: mockGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      expect(strategy.targetAllocation.stocks).toBeGreaterThanOrEqual(70);
      expect(strategy.targetAllocation.bonds).toBeLessThanOrEqual(20);
    });

    it('should keep stock allocation high for aggressive profile with short-term goals', () => {
      const aggressiveProfile = { ...mockProfile, riskAppetite: 'Agresivo' as const };
      const shortTermGoals: InvestmentGoal[] = [
        {
          id: '1',
          name: 'Car',
          targetAmount: 10000,
          targetDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
          initialDeposit: 1000,
          monthlyContribution: 200
        }
      ];
      
      const strategy = generateInvestmentStrategy({
        profile: aggressiveProfile,
        goals: shortTermGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      expect(strategy.targetAllocation.stocks).toBeGreaterThanOrEqual(70);
      expect(strategy.targetAllocation.bonds).toBeLessThan(25);
      
      const totalAllocation = strategy.targetAllocation.stocks + 
                             strategy.targetAllocation.bonds + 
                             strategy.targetAllocation.deposits + 
                             strategy.targetAllocation.cash;
      expect(totalAllocation).toBe(100);
    });

    it('should ensure allocation totals exactly 100 for long-term aggressive profile with high knowledge', () => {
      const aggressiveHighKnowledgeProfile = { 
        ...mockProfile, 
        riskAppetite: 'Agresivo' as const,
        knowledgeLevels: { stocks: 'Alto' as const }
      };
      
      const longTermGoals: InvestmentGoal[] = [
        {
          id: '1',
          name: 'Retirement',
          targetAmount: 1000000,
          targetDate: dayjs().add(15, 'years').format('YYYY-MM-DD'),
          initialDeposit: 50000,
          monthlyContribution: 2000
        }
      ];
      
      const strategy = generateInvestmentStrategy({
        profile: aggressiveHighKnowledgeProfile,
        goals: longTermGoals,
        positions: mockPositions,
        cash: { ARS: 1000, USD: 0 },
      });

      // Verify high stock allocation for aggressive + long-term + high knowledge
      expect(strategy.targetAllocation.stocks).toBeGreaterThan(80);
      expect(strategy.targetAllocation.bonds).toBeLessThan(15);
      
      // Verify exact 100% total
      const totalAllocation = strategy.targetAllocation.stocks + 
                             strategy.targetAllocation.bonds + 
                             strategy.targetAllocation.deposits + 
                             strategy.targetAllocation.cash;
      expect(totalAllocation).toBe(100);
      
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
        rec => rec.action === 'rotate'
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
        rec => rec.reason.includes('efectivo')
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
        rec => rec.reason.includes('efectivo')
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
          monthlyContribution: 200
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
        rec => rec.symbol === 'TSLA'
      );

      expect(tslaRecommendations.length).toBeGreaterThan(0);
      expect(tslaRecommendations[0].priority).toBe('high');
    });

    it('should always normalize allocation to exactly 100% total', () => {
      // Test multiple profile combinations to ensure normalization works
      const testCases = [
        {
          profile: { ...mockProfile, riskAppetite: 'Conservador' as const },
          goals: [],
          description: 'Conservative profile with no goals'
        },
        {
          profile: { ...mockProfile, riskAppetite: 'Agresivo' as const, knowledgeLevels: { stocks: 'Alto' as const } },
          goals: [],
          description: 'Aggressive profile with high knowledge'
        },
        {
          profile: { ...mockProfile, riskAppetite: 'Balanceado' as const, knowledgeLevels: { stocks: 'Bajo' as const } },
          goals: [],
          description: 'Balanced profile with low knowledge'
        }
      ];

      testCases.forEach(({ profile, goals, description }) => {
        const strategy = generateInvestmentStrategy({
          profile,
          goals,
          positions: mockPositions,
          cash: { ARS: 1000, USD: 0 },
        });

        const totalAllocation = strategy.targetAllocation.stocks + 
                               strategy.targetAllocation.bonds + 
                               strategy.targetAllocation.deposits + 
                               strategy.targetAllocation.cash;
        
        expect(totalAllocation).toBe(100);
        
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

      // Allow for one minor recommendation, but shouldn't have major rebalancing suggestions.
      expect(strategy.recommendations.length).toBeLessThanOrEqual(1);
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
        monthlyContribution: 200
      }];

      const strategy = generateInvestmentStrategy({
        profile: conservativeProfile,
        goals: goals,
        positions: volatilePositions,
        cash: { ARS: 1000, USD: 0 },
      });

      const rotationRecommendations = strategy.recommendations.filter(
        rec => rec.action === 'rotate'
      );

      expect(rotationRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getSuggestedStocks', () => {
    const baseFundamentals = {
      peRatio: 15,
      beta: 1,
      roe: 0.25,
    };

    it('suggests stock if risk and return match', () => {
      const stocks = [
        { symbol: 'AAPL', fundamentals: { ...baseFundamentals, roe: 0.35 } },
        { symbol: 'TSLA', fundamentals: { ...baseFundamentals, roe: 0.05 } },
      ];
      const result = getSuggestedStocks(mockProfile, stocks, 20);
      expect(result.find(s => s.symbol === 'AAPL')?.isSuggested).toBe(true);
      expect(result.find(s => s.symbol === 'TSLA')?.isSuggested).toBe(false);
    });

    it('does not suggest if risk is too high', () => {
      const stocks = [
        { symbol: 'RISKY', fundamentals: { ...baseFundamentals, peRatio: 40, beta: 2, roe: 0.35 } },
      ];
      const result = getSuggestedStocks(mockProfile, stocks, 20);
      expect(result[0].isSuggested).toBe(false);
    });

    it('does not suggest if return is too low', () => {
      const stocks = [
        { symbol: 'LOWROE', fundamentals: { ...baseFundamentals, roe: 0.05 } },
      ];
      const result = getSuggestedStocks(mockProfile, stocks, 20);
      expect(result[0].isSuggested).toBe(false);
    });

    it('handles missing fundamentals gracefully', () => {
      const stocks = [
        { symbol: 'NOFUNDS' },
      ];
      const result = getSuggestedStocks(mockProfile, stocks, 20);
      expect(result[0].isSuggested).toBe(false);
    });
  });
}); 