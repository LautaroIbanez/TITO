import { NextRequest, NextResponse } from 'next/server';
import { generatePortfolio } from '@/utils/portfolioAdvisor';
import { InvestorProfile } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const profile = (await req.json()) as InvestorProfile;
    if (!profile) {
      return NextResponse.json({ error: 'Investor profile is required' }, { status: 400 });
    }
    
    const recommendation = generatePortfolio(profile);
    
    return NextResponse.json(recommendation);
  } catch (error) {
    console.error('Failed to generate portfolio recommendation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 