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
  currency: 'ARS' | 'USD';
}

// -- Portfolio Positions --
export interface StockPosition {
  type: 'Stock';
  symbol: string;
  quantity: number;
  averagePrice: number;
  currency: 'ARS' | 'USD';
  market: 'NASDAQ' | 'NYSE' | 'BCBA';
}

export interface BondPosition {
  type: 'Bond';
  ticker: string;
  quantity: number;
  averagePrice: number;
  currency: 'ARS' | 'USD';
}

export interface FixedTermDepositPosition {
  type: 'FixedTermDeposit';
  id: string; // Unique ID for this specific deposit
  provider: string;
  amount: number;
  annualRate: number;
  startDate: string;
  maturityDate: string;
  currency: 'ARS' | 'USD';
}

export interface CaucionPosition {
  type: 'Caucion';
  id: string; // Unique ID for this specific caución
  provider: string;
  amount: number;
  annualRate: number;
  startDate: string;
  maturityDate: string;
  currency: 'ARS' | 'USD';
  term: number; // Term in days
}

export type PortfolioPosition = StockPosition | BondPosition | FixedTermDepositPosition | CaucionPosition;

// -- Portfolio Transactions --
export interface StockTradeTransaction {
  id: string;
  date: string; // ISO string
  type: 'Buy' | 'Sell';
  assetType: 'Stock';
  symbol:string;
  quantity: number;
  price: number;
  commissionPct?: number; // Commission percentage (optional)
  purchaseFeePct?: number; // Purchase fee percentage (optional)
  currency: 'ARS' | 'USD';
  market: 'NASDAQ' | 'NYSE' | 'BCBA';
}

export interface BondTradeTransaction {
  id: string;
  date: string; // ISO string
  type: 'Buy' | 'Sell';
  assetType: 'Bond';
  ticker: string;
  quantity: number;
  price: number;
  commissionPct?: number; // Commission percentage (optional)
  purchaseFeePct?: number; // Purchase fee percentage (optional)
  currency: 'ARS' | 'USD';
}

export interface DepositTransaction {
  id: string;
  date: string; // ISO string
  type: 'Deposit';
  amount: number;
  currency: 'ARS' | 'USD';
}

export interface WithdrawalTransaction {
  id: string;
  date: string; // ISO string
  type: 'Withdrawal';
  amount: number;
  currency: 'ARS' | 'USD';
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
  currency: 'ARS' | 'USD';
}

export interface CaucionCreationTransaction {
  id: string;
  date: string; // ISO string
  type: 'Create';
  assetType: 'Caucion';
  provider: string;
  amount: number;
  annualRate: number;
  termDays: number;
  maturityDate: string;
  currency: 'ARS' | 'USD';
}

export type PortfolioTransaction = StockTradeTransaction | BondTradeTransaction | DepositTransaction | FixedTermDepositCreationTransaction | CaucionCreationTransaction | WithdrawalTransaction;

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
  cash: {
    ARS: number;
    USD: number;
  };
  investmentStrategy?: InvestmentStrategy;
} 