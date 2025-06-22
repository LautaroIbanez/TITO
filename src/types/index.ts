export interface PortfolioItem {
  // To be defined later
  id: string;
}

export type KnowledgeLevel = 'Bajo' | 'Medio' | 'Alto';
export type RiskAppetite = 'Conservador' | 'Balanceado' | 'Agresivo';

export interface InvestorProfile {
  instrumentsUsed: string[];
  knowledgeLevels: Record<string, KnowledgeLevel>;
  holdingPeriod: string;
  ageGroup: string;
  riskAppetite: RiskAppetite;
  investmentAmount: number;
}

export interface InvestmentGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  initialDeposit: number;
  monthlyContribution: number;
}

// -- Portfolio Positions --
export interface StockPosition {
  type: 'Stock';
  symbol: string;
  quantity: number;
  averagePrice: number;
}

export interface BondPosition {
  type: 'Bond';
  ticker: string;
  quantity: number;
  averagePrice: number;
}

export interface FixedTermDepositPosition {
  type: 'FixedTermDeposit';
  id: string; // Unique ID for this specific deposit
  provider: string;
  amount: number;
  annualRate: number;
  startDate: string;
  maturityDate: string;
}

export type PortfolioPosition = StockPosition | BondPosition | FixedTermDepositPosition;

// -- Portfolio Transactions --
export interface StockTradeTransaction {
  id: string;
  date: string; // ISO string
  type: 'Buy' | 'Sell';
  assetType: 'Stock';
  symbol:string;
  quantity: number;
  price: number;
}

export interface BondTradeTransaction {
  id: string;
  date: string; // ISO string
  type: 'Buy' | 'Sell';
  assetType: 'Bond';
  ticker: string;
  quantity: number;
  price: number;
}

export interface DepositTransaction {
  id: string;
  date: string; // ISO string
  type: 'Deposit';
  amount: number;
}

export interface FixedTermDepositCreationTransaction {
  id: string;
  date: string; // ISO string
  type: 'Create';
  assetType: 'FixedTermDeposit';
  provider: string;
  amount: number;
  annualRate: number;
  termDays: number;
  maturityDate: string;
}

export type PortfolioTransaction = StockTradeTransaction | BondTradeTransaction | DepositTransaction | FixedTermDepositCreationTransaction;

// -- Investment Strategy --
export type StrategyAction = 'buy' | 'sell' | 'hold' | 'rotate' | 'increase' | 'decrease';
export type AssetClass = 'stocks' | 'bonds' | 'deposits' | 'cash';

export interface StrategyRecommendation {
  id: string;
  action: StrategyAction;
  assetClass?: AssetClass;
  symbol?: string;
  targetSymbol?: string; // For rotation actions
  reason: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: 'positive' | 'neutral' | 'negative';
}

export interface InvestmentStrategy {
  id: string;
  createdAt: string;
  targetAllocation: {
    stocks: number; // Percentage
    bonds: number; // Percentage
    deposits: number; // Percentage
    cash: number; // Percentage
  };
  recommendations: StrategyRecommendation[];
  riskLevel: RiskAppetite;
  timeHorizon: string;
  notes?: string;
}

export interface UserData {
  username: string;
  createdAt: string;
  profileCompleted: boolean;
  profile?: InvestorProfile;
  positions: PortfolioPosition[];
  transactions: PortfolioTransaction[];
  goals: InvestmentGoal[];
  availableCash: number;
  investmentStrategy?: InvestmentStrategy;
} 