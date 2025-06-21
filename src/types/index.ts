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

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
}

export interface PortfolioTransaction {
  date: string; // ISO string
  type: 'Buy' | 'Sell';
  symbol: string;
  quantity: number;
  price: number;
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
} 