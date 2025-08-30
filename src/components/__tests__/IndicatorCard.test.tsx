import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import IndicatorCard from '../IndicatorCard';

describe('IndicatorCard', () => {
  it('renders basic card with title and value', () => {
    render(
      <IndicatorCard
        title="Test Title"
        value="100"
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders numeric value with 2 decimal places', () => {
    render(
      <IndicatorCard
        title="Test Title"
        value={123.456}
      />
    );

    expect(screen.getByText('123.46')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <IndicatorCard
        title="Test Title"
        value="100"
        subtitle="Test Subtitle"
      />
    );

    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders percentage variation by default', () => {
    render(
      <IndicatorCard
        title="Test Title"
        value="100"
        variation={5.25}
        variationLabel="vs anterior"
      />
    );

    expect(screen.getByText('+5.25%')).toBeInTheDocument();
    expect(screen.getByText('(vs anterior)')).toBeInTheDocument();
  });

  it('renders negative percentage variation', () => {
    render(
      <IndicatorCard
        title="Test Title"
        value="100"
        variation={-3.75}
        variationLabel="vs anterior"
      />
    );

    expect(screen.getByText('-3.75%')).toBeInTheDocument();
  });

  it('renders absolute variation with unit', () => {
    render(
      <IndicatorCard
        title="Test Title"
        value="100"
        variation={25.50}
        variationLabel="variación"
        variationType="absolute"
        variationUnit=" $"
      />
    );

    expect(screen.getByText('+25.50 $')).toBeInTheDocument();
    expect(screen.getByText('(variación)')).toBeInTheDocument();
  });

  it('renders absolute variation without unit', () => {
    render(
      <IndicatorCard
        title="Test Title"
        value="100"
        variation={10}
        variationType="absolute"
      />
    );

    expect(screen.getByText('+10.00')).toBeInTheDocument();
  });

  it('applies correct color classes', () => {
    const { rerender } = render(
      <IndicatorCard
        title="Test Title"
        value="100"
        color="red"
      />
    );

    const card = screen.getByText('Test Title').closest('div')?.parentElement?.parentElement?.parentElement;
    expect(card).toHaveClass('border-red-500', 'bg-red-50');

    rerender(
      <IndicatorCard
        title="Test Title"
        value="100"
        color="green"
      />
    );

    expect(card).toHaveClass('border-green-500', 'bg-green-50');
  });

  it('applies correct variation colors', () => {
    const { rerender } = render(
      <IndicatorCard
        title="Test Title"
        value="100"
        variation={5}
      />
    );

    const variationElement = screen.getByText('+5.00%');
    expect(variationElement).toHaveClass('text-green-600');

    rerender(
      <IndicatorCard
        title="Test Title"
        value="100"
        variation={-5}
      />
    );

    const negativeVariationElement = screen.getByText('-5.00%');
    expect(negativeVariationElement).toHaveClass('text-red-600');
  });

  it('renders children when provided', () => {
    render(
      <IndicatorCard
        title="Test Title"
        value="100"
      >
        <div data-testid="child-content">Child Content</div>
      </IndicatorCard>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const icon = <span data-testid="test-icon">📊</span>;
    
    render(
      <IndicatorCard
        title="Test Title"
        value="100"
        icon={icon}
      />
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('handles zero variation correctly', () => {
    render(
      <IndicatorCard
        title="Test Title"
        value="100"
        variation={0}
        variationLabel="vs anterior"
      />
    );

    expect(screen.getByText('+0.00%')).toBeInTheDocument();
  });

  it('handles undefined variation gracefully', () => {
    render(
      <IndicatorCard
        title="Test Title"
        value="100"
      />
    );

    // Should not render any variation text
    expect(screen.queryByText(/[+-]\d+\.\d+%/)).not.toBeInTheDocument();
  });
});
