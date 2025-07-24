export interface InflationData {
  fecha: string;
  valor: number;
  fecha_consulta: string;
}

export interface DollarData {
  fecha: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fecha_consulta: string;
}

export interface FixedTermData {
  entidad: string;
  tnaClientes: number;
  tnaNoClientes: number;
  fecha_consulta: string;
}

export interface MutualFundData {
  fondo: string;
  tna: number;
  rendimiento_mensual: number;
  categoria: string;
}

export interface OtherFundData {
  fondo: string;
  tna: number;
  categoria?: string;
}

export interface EconomicIndicators {
  inflation: {
    data: InflationData[];
    lastValue: number;
    previousValue: number;
    variation: number;
  };
  dollars: {
    data: DollarData[];
    lastValues: Record<string, { venta: number; compra: number; variation: number }>;
  };
  fixedTerm: {
    data: FixedTermData[];
    top10: FixedTermData[];
  };
  mutualFunds: {
    moneyMarket: MutualFundData[];
    rentaFija: MutualFundData[];
    rentaVariable: MutualFundData[];
    rentaMixta: MutualFundData[];
  };
  otherFunds: {
    data: OtherFundData[];
    top10: OtherFundData[];
  };
  lastUpdated: string;
} 