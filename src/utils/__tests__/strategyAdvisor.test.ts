import { generateInvestmentStrategy } from '../strategyAdvisor';
import { InvestorProfile, InvestmentGoal, PortfolioPosition } from '@/types';

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
      targetDate: '2025-06-01',
      initialDeposit: 1000,
      monthlyContribution: 200
    }
  ];

  const mockPositions: PortfolioPosition[] = [
    {
      type: 'Stock',
      symbol: 'AAPL',
      quantity: 10,
      averagePrice: 150
    },
    {
      type: 'Stock',
      symbol: 'MSFT',
      quantity: 5,
      averagePrice: 300
    }
  ];

  describe('generateInvestmentStrategy', () => {
    it('should generate a strategy with basic input', () => {
      const input = {
        profile: mockProfile,
        goals: mockGoals,
        positions: mockPositions,
        availableCash: 1000
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
        availableCash: 1000
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
        availableCash: 1000
      });

      expect(strategy.targetAllocation.stocks).toBeGreaterThan(60);
      expect(strategy.targetAllocation.bonds).toBeLessThan(30);
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
        availableCash: 1000
      });

      const lowKnowledgeStrategy = generateInvestmentStrategy({
        profile: lowKnowledgeProfile,
        goals: mockGoals,
        positions: mockPositions,
        availableCash: 1000
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
        availableCash: 1000
      });

      expect(strategy.recommendations).toBeDefined();
      expect(Array.isArray(strategy.recommendations)).toBe(true);
      expect(strategy.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should generate rotation recommendations for concentrated portfolios', () => {
      const concentratedPositions: PortfolioPosition[] = [
        { type: 'Stock', symbol: 'AAPL', quantity: 10, averagePrice: 150 },
        { type: 'Stock', symbol: 'MSFT', quantity: 5, averagePrice: 300 },
        { type: 'Stock', symbol: 'GOOGL', quantity: 3, averagePrice: 2500 },
        { type: 'Stock', symbol: 'AMZN', quantity: 2, averagePrice: 3000 },
        { type: 'Stock', symbol: 'TSLA', quantity: 1, averagePrice: 800 }
      ];

      const strategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: mockGoals,
        positions: concentratedPositions,
        availableCash: 1000
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
        availableCash: 10000 // High cash relative to positions
      });

      const cashRecommendations = highCashStrategy.recommendations.filter(
        rec => rec.assetClass === 'cash'
      );

      expect(cashRecommendations.length).toBeGreaterThan(0);
    });

    it('should handle empty positions and goals', () => {
      const strategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: [],
        positions: [],
        availableCash: 1000
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
          targetDate: '2024-06-01', // Less than 1 year
          initialDeposit: 1000,
          monthlyContribution: 200
        }
      ];

      const strategy = generateInvestmentStrategy({
        profile: mockProfile,
        goals: shortTermGoals,
        positions: mockPositions,
        availableCash: 1000
      });

      expect(strategy.timeHorizon).toBe('Corto plazo (< 3 años)');
    });

    it('should generate conservative recommendations for conservative profile with volatile stocks', () => {
      const conservativeProfile = { ...mockProfile, riskAppetite: 'Conservador' as const };
      const volatilePositions: PortfolioPosition[] = [
        { type: 'Stock', symbol: 'TSLA', quantity: 10, averagePrice: 200 }
      ];

      const strategy = generateInvestmentStrategy({
        profile: conservativeProfile,
        goals: mockGoals,
        positions: volatilePositions,
        availableCash: 1000
      });

      const tslaRecommendations = strategy.recommendations.filter(
        rec => rec.symbol === 'TSLA'
      );

      expect(tslaRecommendations.length).toBeGreaterThan(0);
      expect(tslaRecommendations[0].priority).toBe('high');
    });
  });
}); 