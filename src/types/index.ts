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
  investmentSharePct: number;
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
export type AssetType = 'Stock' | 'Bond' | 'FixedTermDeposit' | 'Caucion' | 'Crypto' | 'RealEstate' | 'MutualFund';

export interface StockPosition {
  type: 'Stock';
  symbol: string;
  quantity: number;
  purchasePrice: number;
  currency: 'ARS' | 'USD';
  market: 'NASDAQ' | 'NYSE' | 'BCBA';
}

export interface BondPosition {
  type: 'Bond';
  ticker: string;
  quantity: number;
  purchasePrice: number;
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
  termDays?: number;
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

export interface CryptoPosition {
  type: 'Crypto';
  symbol: string;
  quantity: number;
  purchasePrice: number;
  currency: 'USD';
}

export interface RealEstatePosition {
  type: 'RealEstate';
  id: string;
  name: string;
  amount: number;
  annualRate: number;
  currency: 'ARS' | 'USD';
}

export interface MutualFundPosition {
  type: 'MutualFund';
  id: string;
  name: string;
  category: string;
  amount: number;
  annualRate: number;
  monthlyYield?: number;
  currency: 'ARS' | 'USD';
  startDate: string; // ISO string for when the fund position was created
  tnaHistory?: Array<{
    date: string; // ISO string
    tna: number; // TNA for that day
  }>;
  currentTna?: number; // Current TNA value
}

export type PortfolioPosition = StockPosition | BondPosition | FixedTermDepositPosition | CaucionPosition | CryptoPosition | RealEstatePosition | MutualFundPosition;

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
  source?: 'FixedTermPayout' | 'MutualFundLiquidation';
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

export interface MutualFundCreationTransaction {
  id: string;
  date: string; // ISO string
  type: 'Create';
  assetType: 'MutualFund';
  name: string;
  category: string;
  amount: number;
  annualRate: number;
  monthlyYield?: number;
  currency: 'ARS' | 'USD';
}

export interface CryptoTradeTransaction {
  id: string;
  date: string; // ISO string
  type: 'Buy' | 'Sell';
  assetType: 'Crypto';
  symbol: string;
  quantity: number;
  price: number;
  commissionPct?: number; // Commission percentage (optional)
  purchaseFeePct?: number; // Purchase fee percentage (optional)
  currency: 'USD';
  // Optional conversion tracking for ARS purchases
  originalCurrency?: 'ARS';
  originalAmount?: number;
  convertedAmount?: number;
}

export interface RealEstateTransaction {
  id: string;
  date: string; // ISO string
  type: 'Create' | 'Update' | 'Delete';
  assetType: 'RealEstate';
  name: string;
  amount: number;
  annualRate: number;
  currency: 'ARS' | 'USD';
}

export interface FixedTermDepositCreditTransaction {
  id: string;
  date: string; // ISO string
  type: 'Acreditación Plazo Fijo';
  assetType: 'FixedTermDeposit';
  provider: string;
  amount: number; // payout (principal + interest)
  principal: number;
  interest: number;
  currency: 'ARS' | 'USD';
  depositId: string;
}

export interface CaucionCreditTransaction {
  id: string;
  date: string; // ISO string
  type: 'Acreditación Caución';
  assetType: 'Caucion';
  provider: string;
  amount: number; // payout (principal + interest)
  principal: number;
  interest: number;
  currency: 'ARS' | 'USD';
  caucionId: string;
}

export interface BondCouponTransaction {
  id: string;
  date: string; // ISO string
  type: 'Pago de Cupón Bono';
  assetType: 'Bond';
  ticker: string;
  amount: number;
  currency: 'ARS' | 'USD';
  couponNumber?: number;
}

export interface BondAmortizationTransaction {
  id: string;
  date: string; // ISO string
  type: 'Amortización Bono';
  assetType: 'Bond';
  ticker: string;
  amount: number;
  currency: 'ARS' | 'USD';
  amortizationNumber?: number;
}

export type PortfolioTransaction =
  | StockTradeTransaction
  | BondTradeTransaction
  | DepositTransaction
  | FixedTermDepositCreationTransaction
  | CaucionCreationTransaction
  | MutualFundCreationTransaction
  | WithdrawalTransaction
  | CryptoTradeTransaction
  | RealEstateTransaction
  | FixedTermDepositCreditTransaction
  | CaucionCreditTransaction
  | BondCouponTransaction
  | BondAmortizationTransaction;

// -- Investment Strategy --
export type StrategyAction = 'buy' | 'sell' | 'hold' | 'rotate' | 'increase' | 'decrease';
export type AssetClass = 'stocks' | 'bonds' | 'deposits' | 'cash' | 'crypto';

export interface StrategyRecommendation {
  id: string;
  action: StrategyAction;
  assetClass?: AssetClass;
  symbol?: string;
  targetSymbol?: string; // For rotation actions
  reason: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: 'positive' | 'neutral' | 'negative';
  suggestedAssets?: string[];
}

export interface InvestmentStrategy {
  id: string;
  createdAt: string;
  targetAllocation: {
    stocks: number; // Percentage
    bonds: number; // Percentage
    deposits: number; // Percentage
    cash: number; // Percentage
    crypto?: number; // Percentage
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