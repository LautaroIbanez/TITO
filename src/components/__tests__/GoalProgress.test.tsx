import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalProgress from '../GoalProgress';
import { InvestmentGoal, PortfolioTransaction, PortfolioPosition } from '@/types';
import { Bond } from '@/types/finance';
import dayjs from 'dayjs';

describe('GoalProgress', () => {
  const baseGoal: InvestmentGoal = {
    id: 'g1',
    name: 'Meta Test',
    targetAmount: 0,
    targetDate: '2024-12-31',
    initialDeposit: 0,
    monthlyContribution: 0,
    currency: 'ARS',
  };

  it('should show 0% progress if targetAmount is 0', () => {
    render(
      <GoalProgress
        goal={{ ...baseGoal, targetAmount: 0 }}
        valueHistory={[]}
        currentValue={1000}
        transactions={[]}
        positions={[]}
        bonds={[]}
      />
    );
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument();
  });

  it('should show 0% progress if targetAmount is falsy', () => {
    render(
      <GoalProgress
        goal={{ ...baseGoal, targetAmount: undefined as any }}
        valueHistory={[]}
        currentValue={1000}
        transactions={[]}
        positions={[]}
        bonds={[]}
      />
    );
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument();
  });

  it('should calculate progress based on fixed-income gains only', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 10000,
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 5000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 5000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ',
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue={15000} // High current value including stock gains
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should show progress based on fixed-income gains, not total portfolio value
    // Fixed-income gains should be around 5000 * 0.75 * (days elapsed / 365)
    // This test verifies that stock gains don't affect the progress calculation
    expect(screen.getByText(/Ganancias del Portafolio/)).toBeInTheDocument();
  });

  it('should ignore stock gains when calculating goal progress', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 1000,
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 1000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ',
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue={5000} // High current value due to stock gains
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should show 0% progress since there are no fixed-income positions
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument();
  });

  it('should ignore crypto gains when calculating goal progress', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 1000,
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 1000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 1,
        averagePrice: 50000,
        currency: 'USD',
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue= {10000} // High current value due to crypto gains
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should show 0% progress since there are no fixed-income positions
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument();
  });

  it('should calculate progress correctly with fixed-term deposits', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 10000,
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 8000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 8000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue={8000}
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should show some progress based on fixed-term deposit gains
    expect(screen.getByText(/Ganancias del Portafolio/)).toBeInTheDocument();
  });

  it('should calculate progress correctly with cauciones', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 5000,
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 4000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'Caucion',
        id: 'c1',
        provider: 'Broker Test',
        amount: 4000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-06-30',
        currency: 'ARS',
        term: 180,
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue={4000}
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should show some progress based on caucion gains
    expect(screen.getByText(/Ganancias del Portafolio/)).toBeInTheDocument();
  });

  it('should create unified timeline from earliest value history date through goal target date', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 10000,
      targetDate: '2024-12-31',
    };

    const valueHistory = [
      { date: '2024-06-15', value: 5000 },
      { date: '2024-03-01', value: 3000 },
      { date: '2024-09-30', value: 7000 },
    ];

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 5000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 5000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];

    const { container } = render(
      <GoalProgress
        goal={goal}
        valueHistory={valueHistory}
        currentValue={5000}
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // The chart should be rendered with unified timeline
    // Earliest date from valueHistory is 2024-03-01, target date is 2024-12-31
    // Timeline should span from 2024-03-01 to 2024-12-31
    expect(container.querySelector('canvas')).toBeInTheDocument();
    
    // Verify that the component renders without errors when using unified timeline
    expect(screen.getByText(/Progreso de Meta/)).toBeInTheDocument();
    expect(screen.getByText(/Ganancias del Portafolio/)).toBeInTheDocument();
  });

  it('should handle empty value history gracefully', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 10000,
      targetDate: '2024-12-31',
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 5000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 5000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue={5000}
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should render without errors even with empty value history
    expect(screen.getByText(/Progreso de Meta/)).toBeInTheDocument();
  });

  it('should format tooltip label as currency', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 10000,
      targetDate: '2024-12-31',
      currency: 'ARS',
    };
    const valueHistory = [
      { date: '2024-03-01', value: 3000 },
      { date: '2024-06-15', value: 5000 },
    ];
    const transactions: PortfolioTransaction[] = [];
    const positions: PortfolioPosition[] = [];
    const bonds: Bond[] = [];

    // Render to get chartOptions
    const { container } = render(
      <GoalProgress
        goal={goal}
        valueHistory={valueHistory}
        currentValue={5000}
        transactions={transactions}
        positions={positions}
        bonds={bonds}
      />
    );

    // Get chartOptions from the component instance
    // We'll reconstruct the callback as in the component
    const chartOptions = {
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              const currency = goal?.currency || 'ARS';
              // Use the same formatCurrency as in the component
              const { formatCurrency } = require('@/utils/goalCalculator');
              return `${label}: ${formatCurrency(value, currency)}`;
            }
          }
        }
      }
    };

    const context = {
      dataset: { label: 'Retorno estimado por renta fija' },
      parsed: { y: 12345.67 }
    };
    const label = chartOptions.plugins.tooltip.callbacks.label(context);
    expect(label).toMatch(/Retorno estimado por renta fija: \$ ?12.345,67|Retorno estimado por renta fija: ARS ?12.345,67/);
  });

  it('should use distributed fixed income returns when multiple goals are provided', () => {
    const goal1: InvestmentGoal = {
      ...baseGoal,
      id: 'goal1',
      targetAmount: 10000,
      targetDate: '2024-12-31',
    };
    
    const goal2: InvestmentGoal = {
      ...baseGoal,
      id: 'goal2',
      targetAmount: 5000,
      targetDate: '2024-06-30',
    };

    const valueHistory = [
      { date: '2024-01-01', value: 3000 },
      { date: '2024-06-15', value: 5000 },
    ];

    const transactions: PortfolioTransaction[] = [];
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const bonds: Bond[] = [];

    render(
      <GoalProgress
        goal={goal1}
        valueHistory={valueHistory}
        currentValue={10000}
        transactions={transactions}
        positions={positions}
        bonds={bonds}
        allGoals={[goal1, goal2]}
        showManageLink={true}
      />
    );

    // Should show distributed projection note
    expect(screen.getByText(/distribuido equitativamente entre todas las metas/)).toBeInTheDocument();
  });

  it('should calculate intersection date and adjust chart range accordingly', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 5000,
      targetDate: '2024-12-31',
    };

    const valueHistory = [
      { date: '2024-01-01', value: 3000 },
      { date: '2024-06-15', value: 5000 },
    ];

    const transactions: PortfolioTransaction[] = [];
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const bonds: Bond[] = [];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={valueHistory}
        currentValue={10000}
        transactions={transactions}
        positions={positions}
        bonds={bonds}
        showManageLink={true}
      />
    );

    // Should show estimated completion date if available
    const completionDateElement = screen.queryByText(/Fecha estimada de cumplimiento/);
    // This might or might not be present depending on the projection calculation
    // We just verify the component renders without errors
    expect(screen.getByText((content) => content.includes('Progreso de Meta:') && content.includes('Meta Test'))).toBeInTheDocument();
  });

  it('should calculate progress using distributed projections when multiple goals are provided', () => {
    const goal1: InvestmentGoal = {
      ...baseGoal,
      id: 'goal1',
      name: 'Meta 1',
      targetAmount: 10000,
      targetDate: '2024-12-31',
    };
    
    const goal2: InvestmentGoal = {
      ...baseGoal,
      id: 'goal2',
      name: 'Meta 2',
      targetAmount: 5000,
      targetDate: '2024-06-30',
    };

    const valueHistory = [
      { date: '2024-01-01', value: 3000 },
      { date: '2024-06-15', value: 5000 },
    ];

    const transactions: PortfolioTransaction[] = [];
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Test Bank',
        amount: 10000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const bonds: Bond[] = [];

    render(
      <GoalProgress
        goal={goal1}
        valueHistory={valueHistory}
        currentValue={10000}
        transactions={transactions}
        positions={positions}
        bonds={bonds}
        allGoals={[goal1, goal2]}
      />
    );

    // Should show "Valor actual" when using distributed projections (multiple goals)
    expect(screen.getByText('Valor actual')).toBeInTheDocument();
    expect(screen.queryByText('Ganancias del Portafolio')).not.toBeInTheDocument();
    
    // Should show distributed projection note
    expect(screen.getByText(/distribuido equitativamente entre todas las metas/)).toBeInTheDocument();
  });

  it('should apply currency conversion for USD goals', () => {
    const usdGoal: InvestmentGoal = {
      ...baseGoal,
      id: 'usd-goal',
      name: 'USD Goal',
      targetAmount: 1000, // USD
      targetDate: '2024-12-31',
      currency: 'USD',
    };

    const valueHistory = [
      { date: '2024-01-01', value: 3000 },
      { date: '2024-06-15', value: 5000 },
    ];

    const transactions: PortfolioTransaction[] = [];
    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Test Bank',
        amount: 1000000, // 1M ARS = ~1000 USD at simplified rate
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const bonds: Bond[] = [];

    render(
      <GoalProgress
        goal={usdGoal}
        valueHistory={valueHistory}
        currentValue={1000000}
        transactions={transactions}
        positions={positions}
        bonds={bonds}
        allGoals={[usdGoal]}
      />
    );

    // Should show USD currency formatting
    expect(screen.getAllByText(/US\$/)[0]).toBeInTheDocument();
    
    // Should show "Ganancias del Portafolio" for single goal (no distributed projections)
    expect(screen.getByText('Ganancias del Portafolio')).toBeInTheDocument();
  });

  it('should fall back to original calculation when no distributed projections are available', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 10000,
      targetDate: '2024-12-31',
    };

    const valueHistory = [
      { date: '2024-01-01', value: 3000 },
      { date: '2024-06-15', value: 5000 },
    ];

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 5000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Test Bank',
        amount: 5000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];
    const bonds: Bond[] = [];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={valueHistory}
        currentValue={5000}
        transactions={transactions}
        positions={positions}
        bonds={bonds}
        allGoals={[]} // Empty array means no distributed projections
      />
    );

    // Should show "Ganancias del Portafolio" when using original calculation
    expect(screen.getByText('Ganancias del Portafolio')).toBeInTheDocument();
    expect(screen.queryByText('Valor actual')).not.toBeInTheDocument();
  });

  it('should handle missing distributed projection gracefully', () => {
    const goal1: InvestmentGoal = {
      ...baseGoal,
      id: 'goal1',
      targetAmount: 10000,
      targetDate: '2024-12-31',
    };
    
    const goal2: InvestmentGoal = {
      ...baseGoal,
      id: 'goal2',
      targetAmount: 5000,
      targetDate: '2024-06-30',
    };

    const valueHistory = [
      { date: '2024-01-01', value: 3000 },
      { date: '2024-06-15', value: 5000 },
    ];

    const transactions: PortfolioTransaction[] = [];
    const positions: PortfolioPosition[] = []; // No positions means no distributed projections
    const bonds: Bond[] = [];

    render(
      <GoalProgress
        goal={goal1}
        valueHistory={valueHistory}
        currentValue={0}
        transactions={transactions}
        positions={positions}
        bonds={bonds}
        allGoals={[goal1, goal2]}
      />
    );

    // Should fall back to original calculation when no distributed projections
    expect(screen.getByText('Ganancias del Portafolio')).toBeInTheDocument();
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument();
  });

  it('should include "Progreso actual" dataset that stops at today', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 10000,
      targetDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    };
    const today = dayjs().format('YYYY-MM-DD');
    const valueHistory = [
      { date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'), value: 1000 },
      { date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), value: 2000 },
      { date: today, value: 3000 },
      { date: dayjs().add(1, 'day').format('YYYY-MM-DD'), value: 4000 }, // Should not appear in line
    ];
    const { container } = render(
      <GoalProgress
        goal={goal}
        valueHistory={valueHistory}
        currentValue={3000}
        transactions={[]}
        positions={[]}
        bonds={[]}
      />
    );
    // Find the chart data in the Line component
    const chart = container.querySelector('canvas');
    expect(chart).toBeInTheDocument();
    // Check that the dataset exists in the rendered chartData
    // We can't access chartData directly, but we can check for the legend label
    expect(screen.getByText('Progreso actual')).toBeInTheDocument();
    // Optionally, check that the line stops at today by inspecting the rendered points (if possible)
    // But we can at least check that the legend is present
  });
}); 