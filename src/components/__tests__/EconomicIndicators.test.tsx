import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EconomicIndicators from '../EconomicIndicators';
import { EconomicIndicators as EconomicIndicatorsType } from '@/types/indicators';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock environment variables
const originalEnv = process.env;

describe('EconomicIndicators', () => {
  const mockIndicators: EconomicIndicatorsType = {
    inflation: {
      data: [
        { fecha: '2024-01-01', valor: 4.2, fecha_consulta: '2024-01-01T00:00:00Z' },
        { fecha: '2024-02-01', valor: 4.5, fecha_consulta: '2024-02-01T00:00:00Z' }
      ],
      lastValue: 4.5,
      previousValue: 4.2,
      variation: 0.3
    },
    dollars: {
      data: [
        { fecha: '2024-01-01', casa: 'oficial', nombre: 'Dólar Oficial', compra: 800, venta: 820, fecha_consulta: '2024-01-01T00:00:00Z' },
        { fecha: '2024-01-01', casa: 'blue', nombre: 'Dólar Blue', compra: 1200, venta: 1250, fecha_consulta: '2024-01-01T00:00:00Z' },
        { fecha: '2024-01-01', casa: 'bolsa', nombre: 'Dólar Bolsa', compra: 1100, venta: 1150, fecha_consulta: '2024-01-01T00:00:00Z' },
        { fecha: '2024-01-01', casa: 'contadoconliqui', nombre: 'Dólar CCL', compra: 1050, venta: 1100, fecha_consulta: '2024-01-01T00:00:00Z' },
        { fecha: '2024-02-01', casa: 'oficial', nombre: 'Dólar Oficial', compra: 810, venta: 830, fecha_consulta: '2024-02-01T00:00:00Z' },
        { fecha: '2024-02-01', casa: 'blue', nombre: 'Dólar Blue', compra: 1220, venta: 1270, fecha_consulta: '2024-02-01T00:00:00Z' },
        { fecha: '2024-02-01', casa: 'bolsa', nombre: 'Dólar Bolsa', compra: 1120, venta: 1170, fecha_consulta: '2024-02-01T00:00:00Z' },
        { fecha: '2024-02-01', casa: 'contadoconliqui', nombre: 'Dólar CCL', compra: 1070, venta: 1120, fecha_consulta: '2024-02-01T00:00:00Z' }
      ],
      lastValues: {
        oficial: { venta: 830, compra: 810, variation: 1.2 },
        blue: { venta: 1270, compra: 1220, variation: 1.6 },
        bolsa: { venta: 1170, compra: 1120, variation: 1.7 },
        contadoconliqui: { venta: 1120, compra: 1070, variation: 1.8 }
      }
    },
    fixedTerm: {
      data: [
        { entidad: 'BANCO MACRO S.A.', tnaClientes: 0.118, tnaNoClientes: 0.125, fecha_consulta: '2024-01-01T00:00:00Z' }
      ],
      top10: [
        { entidad: 'BANCO MACRO S.A.', tnaClientes: 0.118, tnaNoClientes: 0.125, fecha_consulta: '2024-01-01T00:00:00Z' }
      ]
    },
    mutualFunds: {
      moneyMarket: [],
      rentaFija: [],
      rentaVariable: [],
      rentaMixta: []
    },
    otherFunds: {
      data: [],
      top10: []
    },
    lastUpdated: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    mockFetch.mockClear();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('requests /api/indicators when NEXT_PUBLIC_USE_MOCK_INDICATORS is false', async () => {
    process.env.NEXT_PUBLIC_USE_MOCK_INDICATORS = 'false';
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndicators
    });

    render(<EconomicIndicators />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/indicators');
    });
  });

  it('requests /api/indicators?mock=true when NEXT_PUBLIC_USE_MOCK_INDICATORS is true', async () => {
    process.env.NEXT_PUBLIC_USE_MOCK_INDICATORS = 'true';
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndicators
    });

    render(<EconomicIndicators />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/indicators?mock=true');
    });
  });

  it('requests /api/indicators when NEXT_PUBLIC_USE_MOCK_INDICATORS is undefined', async () => {
    delete process.env.NEXT_PUBLIC_USE_MOCK_INDICATORS;
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndicators
    });

    render(<EconomicIndicators />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/indicators');
    });
  });

  it('displays loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<EconomicIndicators />);

    expect(screen.getByText('Cargando indicadores económicos...')).toBeInTheDocument();
  });

  it('displays error when API call fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<EconomicIndicators />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar los indicadores económicos')).toBeInTheDocument();
    });
  });

  it('displays error when API returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<EconomicIndicators />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar los indicadores económicos')).toBeInTheDocument();
    });
  });

  it('renders inflation tab by default', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndicators
    });

    render(<EconomicIndicators />);

    await waitFor(() => {
      expect(screen.getByText('Inflación Mensual')).toBeInTheDocument();
      expect(screen.getByText('4.5%')).toBeInTheDocument();
    });
  });

  it('renders dollar cards with correct values', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndicators
    });

    render(<EconomicIndicators />);

    // Wait for component to load, then switch to dollars tab
    await waitFor(() => {
      expect(screen.getByText('Inflación Mensual')).toBeInTheDocument();
    });

    // Click on dollars tab
    const dollarsTab = screen.getByText('💸 Dólar');
    dollarsTab.click();

    await waitFor(() => {
      expect(screen.getByText('Dólar Oficial')).toBeInTheDocument();
      expect(screen.getByText('$830')).toBeInTheDocument();
      expect(screen.getByText('Dólar Blue')).toBeInTheDocument();
      expect(screen.getByText('$1.270')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndicators
    });

    render(<EconomicIndicators />);

    await waitFor(() => {
      expect(screen.getByText('Inflación Mensual')).toBeInTheDocument();
    });

    // Click on dollars tab
    const dollarsTab = screen.getByText('💸 Dólar');
    dollarsTab.click();

    await waitFor(() => {
      expect(screen.getByText('Dólar Oficial')).toBeInTheDocument();
      expect(screen.queryByText('Inflación Mensual')).not.toBeInTheDocument();
    });
  });

  it('renders multi-series dollar chart with all dollar types', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndicators
    });

    render(<EconomicIndicators />);

    // Switch to dollars tab
    await waitFor(() => {
      const dollarsTab = screen.getByText('💸 Dólar');
      dollarsTab.click();
    });

    await waitFor(() => {
      expect(screen.getByText('Cotización del Dólar - Últimos 30 días')).toBeInTheDocument();
    });

    // The chart should be rendered with multi-series data
    // We can't easily test the chart content directly, but we can verify the component renders
    expect(screen.getByText('Cotización del Dólar - Últimos 30 días')).toBeInTheDocument();
  });

  it('displays last updated timestamp', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndicators
    });

    render(<EconomicIndicators />);

    await waitFor(() => {
      expect(screen.getByText(/Última actualización:/)).toBeInTheDocument();
    });
  });
}); 