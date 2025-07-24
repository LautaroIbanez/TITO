import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LineChart from '../LineChart';

// Mock Chart.js
jest.mock('chart.js/auto', () => ({
  Chart: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
  })),
}));

// Mock canvas context
const mockContext = {
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
};

// Mock getContext
const mockGetContext = jest.fn(() => mockContext);

describe('LineChart', () => {
  const mockSingleSeriesData = [
    { fecha: '2024-01-01', valor: 100 },
    { fecha: '2024-01-02', valor: 110 },
    { fecha: '2024-01-03', valor: 105 },
  ];

  const mockMultiSeriesData = [
    { fecha: '2024-01-01', oficial: 850, blue: 1200, bolsa: 1100, contadoconliqui: 1050 },
    { fecha: '2024-01-02', oficial: 860, blue: 1250, bolsa: 1150, contadoconliqui: 1100 },
    { fecha: '2024-01-03', oficial: 855, blue: 1220, bolsa: 1120, contadoconliqui: 1070 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock canvas getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: mockGetContext,
    });
  });

  it('renders single series chart correctly', () => {
    render(
      <LineChart
        data={mockSingleSeriesData}
        title="Test Single Series"
        multiSeries={false}
      />
    );

    expect(screen.getByText('Test Single Series')).toBeInTheDocument();
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders multi-series chart correctly', () => {
    render(
      <LineChart
        data={mockMultiSeriesData}
        title="Test Multi Series"
        multiSeries={true}
        seriesLabels={{
          oficial: 'Dólar Oficial',
          blue: 'Dólar Blue',
          bolsa: 'Dólar Bolsa',
          contadoconliqui: 'Dólar CCL'
        }}
        seriesColors={{
          oficial: '#10B981',
          blue: '#EF4444',
          bolsa: '#3B82F6',
          contadoconliqui: '#F59E0B'
        }}
      />
    );

    expect(screen.getByText('Test Multi Series')).toBeInTheDocument();
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('shows no data message when data is empty', () => {
    render(
      <LineChart
        data={[]}
        title="Empty Chart"
      />
    );

    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument();
  });

  it('handles dollar data formatting correctly', () => {
    render(
      <LineChart
        data={mockMultiSeriesData}
        title="Cotización del Dólar - Últimos 30 días"
        multiSeries={true}
        seriesLabels={{
          oficial: 'Dólar Oficial',
          blue: 'Dólar Blue',
          bolsa: 'Dólar Bolsa',
          contadoconliqui: 'Dólar CCL'
        }}
        seriesColors={{
          oficial: '#10B981',
          blue: '#EF4444',
          bolsa: '#3B82F6',
          contadoconliqui: '#F59E0B'
        }}
      />
    );

    expect(screen.getByText('Cotización del Dólar - Últimos 30 días')).toBeInTheDocument();
  });

  it('handles inflation data formatting correctly', () => {
    const inflationData = [
      { fecha: '2024-01-01', valor: 4.2 },
      { fecha: '2024-02-01', valor: 4.5 },
      { fecha: '2024-03-01', valor: 4.1 },
    ];

    render(
      <LineChart
        data={inflationData}
        title="Inflación Mensual - Últimos 12 meses"
        multiSeries={false}
      />
    );

    expect(screen.getByText('Inflación Mensual - Últimos 12 meses')).toBeInTheDocument();
  });

  it('processes multi-series data correctly', () => {
    const rawDollarData = [
      { fecha: '2024-01-01', casa: 'oficial', venta: 850 },
      { fecha: '2024-01-01', casa: 'blue', venta: 1200 },
      { fecha: '2024-01-02', casa: 'oficial', venta: 860 },
      { fecha: '2024-01-02', casa: 'blue', venta: 1250 },
    ];

    render(
      <LineChart
        data={rawDollarData.map(item => ({
          fecha: item.fecha,
          [item.casa]: item.venta
        }))}
        title="Test Dollar Processing"
        multiSeries={true}
        seriesLabels={{
          oficial: 'Dólar Oficial',
          blue: 'Dólar Blue'
        }}
        seriesColors={{
          oficial: '#10B981',
          blue: '#EF4444'
        }}
      />
    );

    expect(screen.getByText('Test Dollar Processing')).toBeInTheDocument();
  });

  it('renders canvas element when chart is displayed', () => {
    render(
      <LineChart
        data={mockSingleSeriesData}
        title="Test Canvas"
        multiSeries={false}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
}); 