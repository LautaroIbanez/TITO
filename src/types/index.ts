export interface PortfolioItem {
  // To be defined later
  id: string;
}

export type KnowledgeLevel = 'Low' | 'Medium' | 'High';
export type RiskAppetite = 'Conservative' | 'Balanced' | 'Aggressive';

export interface InvestorProfile {
  instrumentsUsed: string[];
  knowledgeLevels: Record<string, KnowledgeLevel>;
  holdingPeriod: string;
  ageGroup: string;
  riskAppetite: RiskAppetite;
  investmentAmount: number;
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
} 