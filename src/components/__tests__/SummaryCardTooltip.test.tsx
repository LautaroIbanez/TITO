import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SummaryCardTooltip from '../SummaryCardTooltip';

describe('SummaryCardTooltip', () => {
  const defaultProps = {
    capitalInvertidoARS: 1000000,
    capitalInvertidoUSD: 1000,
    gananciaNetaARS: 50000,
    gananciaNetaUSD: 50,
    efectivoDisponibleARS: 100000,
    efectivoDisponibleUSD: 100,
  };

  it('renders children without tooltip initially', () => {
    render(
      <SummaryCardTooltip {...defaultProps}>
        <div data-testid="test-card">Test Card Content</div>
      </SummaryCardTooltip>
    );

    expect(screen.getByTestId('test-card')).toBeInTheDocument();
    expect(screen.queryByText('Fórmula: Capital + Ganancias + Efectivo')).not.toBeInTheDocument();
  });

  it('shows tooltip on mouse enter', () => {
    render(
      <SummaryCardTooltip {...defaultProps}>
        <div data-testid="test-card">Test Card Content</div>
      </SummaryCardTooltip>
    );

    const card = screen.getByTestId('test-card');
    fireEvent.mouseEnter(card);

    expect(screen.getByText('Fórmula: Capital + Ganancias + Efectivo')).toBeInTheDocument();
    expect(screen.getByText(/ARS: \$1\.000\.000,00 \+ \$50\.000,00 \+ \$100\.000,00 = \$1\.150\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/USD: US\$1,000\.00 \+ US\$50\.00 \+ US\$100\.00 = US\$1,150\.00/)).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    render(
      <SummaryCardTooltip {...defaultProps}>
        <div data-testid="test-card">Test Card Content</div>
      </SummaryCardTooltip>
    );

    const card = screen.getByTestId('test-card');
    fireEvent.mouseEnter(card);
    expect(screen.getByText('Fórmula: Capital + Ganancias + Efectivo')).toBeInTheDocument();

    fireEvent.mouseLeave(card);
    expect(screen.queryByText('Fórmula: Capital + Ganancias + Efectivo')).not.toBeInTheDocument();
  });

  it('shows tooltip on focus', () => {
    render(
      <SummaryCardTooltip {...defaultProps}>
        <div data-testid="test-card">Test Card Content</div>
      </SummaryCardTooltip>
    );

    const card = screen.getByTestId('test-card');
    fireEvent.focus(card);

    expect(screen.getByText('Fórmula: Capital + Ganancias + Efectivo')).toBeInTheDocument();
  });

  it('hides tooltip on blur', () => {
    render(
      <SummaryCardTooltip {...defaultProps}>
        <div data-testid="test-card">Test Card Content</div>
      </SummaryCardTooltip>
    );

    const card = screen.getByTestId('test-card');
    fireEvent.focus(card);
    expect(screen.getByText('Fórmula: Capital + Ganancias + Efectivo')).toBeInTheDocument();

    fireEvent.blur(card);
    expect(screen.queryByText('Fórmula: Capital + Ganancias + Efectivo')).not.toBeInTheDocument();
  });

  it('calculates totals correctly', () => {
    const props = {
      ...defaultProps,
      capitalInvertidoARS: 2000000,
      gananciaNetaARS: -100000,
      efectivoDisponibleARS: 500000,
    };

    render(
      <SummaryCardTooltip {...props}>
        <div data-testid="test-card">Test Card Content</div>
      </SummaryCardTooltip>
    );

    const card = screen.getByTestId('test-card');
    fireEvent.mouseEnter(card);

    // Should show negative gains with minus sign
    expect(screen.getByText(/ARS: \$2\.000\.000,00 \+ \$-100\.000,00 \+ \$500\.000,00 = \$2\.400\.000,00/)).toBeInTheDocument();
  });

  it('is keyboard accessible with tabIndex', () => {
    render(
      <SummaryCardTooltip {...defaultProps}>
        <div data-testid="test-card">Test Card Content</div>
      </SummaryCardTooltip>
    );

    const container = screen.getByTestId('test-card').parentElement;
    expect(container).toHaveAttribute('tabIndex', '0');
  });
}); 