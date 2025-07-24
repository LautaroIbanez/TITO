import { EconomicIndicators, InflationData, DollarData, FixedTermData, MutualFundData, OtherFundData } from '@/types/indicators';

// URLs de las APIs
const API_URLS = {
  inflation: 'https://api.argentinadatos.com/v1/finanzas/indices/inflacion',
  dollars: 'https://api.argentinadatos.com/v1/cotizaciones/dolares',
  fixedTerm: 'https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo',
  otherFunds: 'https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo',
};

// Fondos predefinidos por categoría
const MUTUAL_FUNDS = {
  moneyMarket: {
    "Schroder Liquidez - Clase B": { fondoId: 1343, claseId: 3831 },
    "MAF Liquidez - Clase A": { fondoId: 1500, claseId: 4486 },
    "Chaco FCI Money Market - Clase A": { fondoId: 1465, claseId: 4332 },
    "Delta Pesos - Clase X": { fondoId: 394, claseId: 3919 },
    "Balanz Capital Money Market - Clase A": { fondoId: 1213, claseId: 3355 },
    "Mercado Fondo - Clase A": { fondoId: 798, claseId: 1982 },
    "Cocos Ahorro - Clase A": { fondoId: 1469, claseId: 4337 },
    "IOL Dólar Ahorro Plus - Clase D": { fondoId: 1570, claseId: 5100 },
  },
  rentaFija: {
    "MAF Ahorro Plus - Clase C": { fondoId: 655, claseId: 1354 },
    "Compass Opportunity - Clase F": { fondoId: 317, claseId: 1867 },
    "Compass Renta Fija III - Clase F": { fondoId: 429, claseId: 1879 },
    "IOL Dólar Ahorro Plus - Clase C": { fondoId: 1570, claseId: 5099 },
  },
  rentaVariable: {
    "Alpha Latam - Clase A": { fondoId: 1235, claseId: 3422 },
    "Fima Acciones Latinoamerica - Clase A": { fondoId: 851, claseId: 2426 },
    "Delta Select - Clase G": { fondoId: 419, claseId: 1926 },
    "Alpha Latam - Clase Q Ley N° 27.743": { fondoId: 1235, claseId: 5036 },
  },
  rentaMixta: {
    "Schroder Retorno Absoluto Dólares - Clase B": { fondoId: 555, claseId: 2199 },
    "Delta Multimercado I - Clase G": { fondoId: 466, claseId: 1922 },
    "Gainvest Balanceado - Clase E": { fondoId: 545, claseId: 2638 },
    "Alpha Renta Balanceada Global - Clase D": { fondoId: 502, claseId: 1838 },
    "Alpha Retorno Total - Clase I": { fondoId: 184, claseId: 1848 },
    "Gainvest Balanceado - Clase F": { fondoId: 545, claseId: 2639 },
  },
};

// Entidades bancarias deseadas para plazo fijo
const DESIRED_BANKS = [
  "BANCO MACRO S.A.",
  "INDUSTRIAL AND COMMERCIAL BANK OF CHINA (ARGENTINA) S.A.U.",
  "BANCO CMF S.A.",
  "BANCO DE GALICIA Y BUENOS AIRES S.A.",
  "BANCO COMAFI SOCIEDAD ANONIMA",
  "BANCO DE GALICIA Y BUENOS AIRES S.A.U.",
  "BANCO HIPOTECARIO S.A.",
  "BANCO DE LA NACION ARGENTINA",
  "BANCO SANTANDER ARGENTINA S.A.",
  "BANCO CREDICOOP COOPERATIVO LIMITADO",
  "BIBANK S.A.",
  "BANCO BBVA ARGENTINA S.A.",
  "BANCO DE LA PROVINCIA DE BUENOS AIRES",
  "HSBC BANK ARGENTINA S.A.",
  "BANCO DE LA CIUDAD DE BUENOS AIRES",
];

// Tipos de dólar deseados
const DESIRED_DOLLAR_TYPES = ["oficial", "blue", "bolsa", "contadoconliqui"];

// Función para obtener datos de inflación
async function fetchInflationData(): Promise<InflationData[]> {
  try {
    const response = await fetch(API_URLS.inflation);
    if (!response.ok) throw new Error('Failed to fetch inflation data');
    
    const data = await response.json();
    const fecha_consulta = new Date().toISOString();
    
    return data.map((item: any) => ({
      fecha: item.fecha,
      valor: item.valor,
      fecha_consulta,
    }));
  } catch (error) {
    console.error('Error fetching inflation data:', error);
    return [];
  }
}

// Función para obtener datos de dólares
async function fetchDollarData(): Promise<DollarData[]> {
  try {
    const response = await fetch(API_URLS.dollars);
    if (!response.ok) throw new Error('Failed to fetch dollar data');
    
    const data = await response.json();
    const fecha_consulta = new Date().toISOString();
    
    return data.map((item: any) => ({
      fecha: item.fecha,
      casa: item.casa,
      nombre: item.nombre,
      compra: item.compra,
      venta: item.venta,
      fecha_consulta,
    }));
  } catch (error) {
    console.error('Error fetching dollar data:', error);
    return [];
  }
}

// Función para obtener datos de plazo fijo
async function fetchFixedTermData(): Promise<FixedTermData[]> {
  try {
    const response = await fetch(API_URLS.fixedTerm);
    if (!response.ok) throw new Error('Failed to fetch fixed term data');
    
    const data = await response.json();
    const fecha_consulta = new Date().toISOString();
    
    return data
      .filter((item: any) => DESIRED_BANKS.includes(item.entidad))
      .map((item: any) => ({
        entidad: item.entidad,
        tnaClientes: item.tnaClientes,
        tnaNoClientes: item.tnaNoClientes,
        fecha_consulta,
      }))
      .sort((a: FixedTermData, b: FixedTermData) => b.tnaClientes - a.tnaClientes);
  } catch (error) {
    console.error('Error fetching fixed term data:', error);
    return [];
  }
}

// Función para obtener datos de fondos mutuos desde CAFCI
async function fetchMutualFundData(fondoId: number, claseId: number): Promise<{ tna: number; rendimiento_mensual: number } | null> {
  try {
    const url = `https://api.cafci.org.ar/fondo/${fondoId}/clase/${claseId}/ficha`;
    const headers = {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
      "Origin": "https://www.cafci.org.ar",
      "Referer": `https://www.cafci.org.ar/ficha-fondo.html?q=${fondoId};${claseId}`,
    };

    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const data = await response.json();
    const rendimientos = data.data.info.diaria.rendimientos;
    
    return {
      tna: parseFloat(rendimientos.monthYear?.tna || '0'),
      rendimiento_mensual: parseFloat(rendimientos.month?.rendimiento || '0'),
    };
  } catch (error) {
    console.error(`Error fetching mutual fund data for ${fondoId};${claseId}:`, error);
    return null;
  }
}

// Función para procesar fondos por categoría
async function processMutualFundsCategory(
  categoryName: string, 
  funds: Record<string, { fondoId: number; claseId: number }>
): Promise<MutualFundData[]> {
  const results: MutualFundData[] = [];
  
  for (const [nombreFondo, { fondoId, claseId }] of Object.entries(funds)) {
    const fundData = await fetchMutualFundData(fondoId, claseId);
    if (fundData) {
      results.push({
        fondo: nombreFondo,
        tna: fundData.tna,
        rendimiento_mensual: fundData.rendimiento_mensual,
        categoria: categoryName,
      });
    }
    // Pequeña pausa para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results.sort((a, b) => b.tna - a.tna);
}

// Función para obtener otros fondos
async function fetchOtherFundsData(): Promise<OtherFundData[]> {
  try {
    const response = await fetch(API_URLS.otherFunds);
    if (!response.ok) throw new Error('Failed to fetch other funds data');
    
    const data = await response.json();
    
    return data
      .map((item: any) => ({
        fondo: item.fondo,
        tna: item.tna,
        categoria: item.categoria || 'Otros',
      }))
      .sort((a: OtherFundData, b: OtherFundData) => b.tna - a.tna);
  } catch (error) {
    console.error('Error fetching other funds data:', error);
    return [];
  }
}

// Función principal para obtener todos los indicadores
export async function fetchEconomicIndicators(): Promise<EconomicIndicators> {
  try {
    // Obtener datos en paralelo
    const [inflationData, dollarData, fixedTermData, otherFundsData] = await Promise.all([
      fetchInflationData(),
      fetchDollarData(),
      fetchFixedTermData(),
      fetchOtherFundsData(),
    ]);

    // Procesar datos de inflación
    const last12Months = inflationData.slice(-12);
    const lastValue = last12Months[last12Months.length - 1]?.valor || 0;
    const previousValue = last12Months[last12Months.length - 2]?.valor || 0;
    const variation = lastValue - previousValue;

    // Procesar datos de dólares
    const last30Days = dollarData.filter(item => 
      new Date(item.fecha) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    const lastValues: Record<string, { venta: number; compra: number; variation: number }> = {};
    DESIRED_DOLLAR_TYPES.forEach(type => {
      const typeData = dollarData.filter(item => item.casa === type);
      const last = typeData[typeData.length - 1];
      const previous = typeData[typeData.length - 2];
      
      if (last) {
        lastValues[type] = {
          venta: last.venta,
          compra: last.compra,
          variation: previous ? last.venta - previous.venta : 0,
        };
      }
    });

    // Procesar fondos mutuos (esto puede tomar tiempo debido a las pausas)
    const [moneyMarket, rentaFija, rentaVariable, rentaMixta] = await Promise.all([
      processMutualFundsCategory('Money Market', MUTUAL_FUNDS.moneyMarket),
      processMutualFundsCategory('Renta Fija', MUTUAL_FUNDS.rentaFija),
      processMutualFundsCategory('Renta Variable', MUTUAL_FUNDS.rentaVariable),
      processMutualFundsCategory('Renta Mixta', MUTUAL_FUNDS.rentaMixta),
    ]);

    return {
      inflation: {
        data: last12Months,
        lastValue,
        previousValue,
        variation,
      },
      dollars: {
        data: last30Days,
        lastValues,
      },
      fixedTerm: {
        data: fixedTermData,
        top10: fixedTermData.slice(0, 10),
      },
      mutualFunds: {
        moneyMarket,
        rentaFija,
        rentaVariable,
        rentaMixta,
      },
      otherFunds: {
        data: otherFundsData,
        top10: otherFundsData.slice(0, 10),
      },
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching economic indicators:', error);
    throw error;
  }
}

// Función para obtener datos mock (para desarrollo/testing)
export function getMockEconomicIndicators(): EconomicIndicators {
  return {
    inflation: {
      data: [
        { fecha: '2024-01-01', valor: 4.2, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-02-01', valor: 3.8, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-03-01', valor: 4.5, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-04-01', valor: 4.1, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-05-01', valor: 4.3, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-06-01', valor: 4.0, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-07-01', valor: 4.7, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-08-01', valor: 4.2, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-09-01', valor: 4.4, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-10-01', valor: 4.1, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-11-01', valor: 4.6, fecha_consulta: new Date().toISOString() },
        { fecha: '2024-12-01', valor: 4.3, fecha_consulta: new Date().toISOString() },
      ],
      lastValue: 4.3,
      previousValue: 4.6,
      variation: -0.3,
    },
    dollars: {
      data: [],
      lastValues: {
        oficial: { venta: 850, compra: 845, variation: 5 },
        blue: { venta: 1200, compra: 1195, variation: -10 },
        bolsa: { venta: 1100, compra: 1095, variation: 15 },
        contadoconliqui: { venta: 1150, compra: 1145, variation: 8 },
      },
    },
    fixedTerm: {
      data: [
        { entidad: 'BANCO MACRO S.A.', tnaClientes: 0.75, tnaNoClientes: 0.65, fecha_consulta: new Date().toISOString() },
        { entidad: 'BANCO SANTANDER ARGENTINA S.A.', tnaClientes: 0.72, tnaNoClientes: 0.62, fecha_consulta: new Date().toISOString() },
        { entidad: 'BANCO BBVA ARGENTINA S.A.', tnaClientes: 0.70, tnaNoClientes: 0.60, fecha_consulta: new Date().toISOString() },
        { entidad: 'BANCO DE GALICIA Y BUENOS AIRES S.A.', tnaClientes: 0.68, tnaNoClientes: 0.58, fecha_consulta: new Date().toISOString() },
        { entidad: 'BANCO DE LA NACION ARGENTINA', tnaClientes: 0.65, tnaNoClientes: 0.55, fecha_consulta: new Date().toISOString() },
      ],
      top10: [
        { entidad: 'BANCO MACRO S.A.', tnaClientes: 0.75, tnaNoClientes: 0.65, fecha_consulta: new Date().toISOString() },
        { entidad: 'BANCO SANTANDER ARGENTINA S.A.', tnaClientes: 0.72, tnaNoClientes: 0.62, fecha_consulta: new Date().toISOString() },
        { entidad: 'BANCO BBVA ARGENTINA S.A.', tnaClientes: 0.70, tnaNoClientes: 0.60, fecha_consulta: new Date().toISOString() },
        { entidad: 'BANCO DE GALICIA Y BUENOS AIRES S.A.', tnaClientes: 0.68, tnaNoClientes: 0.58, fecha_consulta: new Date().toISOString() },
        { entidad: 'BANCO DE LA NACION ARGENTINA', tnaClientes: 0.65, tnaNoClientes: 0.55, fecha_consulta: new Date().toISOString() },
      ],
    },
    mutualFunds: {
      moneyMarket: [
        { fondo: 'Schroder Liquidez - Clase B', tna: 0.85, rendimiento_mensual: 0.72, categoria: 'Money Market' },
        { fondo: 'MAF Liquidez - Clase A', tna: 0.82, rendimiento_mensual: 0.68, categoria: 'Money Market' },
        { fondo: 'Chaco FCI Money Market - Clase A', tna: 0.80, rendimiento_mensual: 0.65, categoria: 'Money Market' },
      ],
      rentaFija: [
        { fondo: 'MAF Ahorro Plus - Clase C', tna: 0.95, rendimiento_mensual: 0.78, categoria: 'Renta Fija' },
        { fondo: 'Compass Opportunity - Clase F', tna: 0.92, rendimiento_mensual: 0.75, categoria: 'Renta Fija' },
        { fondo: 'Compass Renta Fija III - Clase F', tna: 0.88, rendimiento_mensual: 0.72, categoria: 'Renta Fija' },
      ],
      rentaVariable: [
        { fondo: 'Alpha Latam - Clase A', tna: 1.05, rendimiento_mensual: 0.85, categoria: 'Renta Variable' },
        { fondo: 'Fima Acciones Latinoamerica - Clase A', tna: 1.02, rendimiento_mensual: 0.82, categoria: 'Renta Variable' },
        { fondo: 'Delta Select - Clase G', tna: 0.98, rendimiento_mensual: 0.78, categoria: 'Renta Variable' },
      ],
      rentaMixta: [
        { fondo: 'Schroder Retorno Absoluto Dólares - Clase B', tna: 1.15, rendimiento_mensual: 0.92, categoria: 'Renta Mixta' },
        { fondo: 'Delta Multimercado I - Clase G', tna: 1.12, rendimiento_mensual: 0.88, categoria: 'Renta Mixta' },
        { fondo: 'Gainvest Balanceado - Clase E', tna: 1.08, rendimiento_mensual: 0.85, categoria: 'Renta Mixta' },
      ],
    },
    otherFunds: {
      data: [
        { fondo: 'Fondo A', tna: 1.20, categoria: 'Otros' },
        { fondo: 'Fondo B', tna: 1.18, categoria: 'Otros' },
        { fondo: 'Fondo C', tna: 1.15, categoria: 'Otros' },
        { fondo: 'Fondo D', tna: 1.12, categoria: 'Otros' },
        { fondo: 'Fondo E', tna: 1.10, categoria: 'Otros' },
      ],
      top10: [
        { fondo: 'Fondo A', tna: 1.20, categoria: 'Otros' },
        { fondo: 'Fondo B', tna: 1.18, categoria: 'Otros' },
        { fondo: 'Fondo C', tna: 1.15, categoria: 'Otros' },
        { fondo: 'Fondo D', tna: 1.12, categoria: 'Otros' },
        { fondo: 'Fondo E', tna: 1.10, categoria: 'Otros' },
      ],
    },
    lastUpdated: new Date().toISOString(),
  };
} 