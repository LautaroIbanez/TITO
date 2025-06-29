(async () => {
  const fs = require('fs').promises;
  const path = require('path');
  const nodeFetch = require('node-fetch');

  /**
   * @typedef {Object} CaucionRate
   * @property {number} term
   * @property {number} annualRate
   * @property {'ARS'|'USD'} currency
   * @property {string} provider
   * @property {string} description
   */

  /**
   * @typedef {Object} CaucionesData
   * @property {string} lastUpdated
   * @property {CaucionRate[]} rates
   */

  const BYMA_CAUCIONES_URL = 'https://www.byma.com.ar/api/cauciones';
  const BCRA_CAUCIONES_URL = 'https://www.bcra.gob.ar/api/estadisticas/cauciones';

  const FALLBACK_RATES = [
    { term: 1, annualRate: 118.5, currency: 'ARS', provider: 'BYMA', description: 'Caución a 1 día' },
    { term: 7, annualRate: 120.2, currency: 'ARS', provider: 'BYMA', description: 'Caución a 7 días' },
    { term: 14, annualRate: 121.8, currency: 'ARS', provider: 'BYMA', description: 'Caución a 14 días' },
    { term: 30, annualRate: 123.5, currency: 'ARS', provider: 'BYMA', description: 'Caución a 30 días' },
    { term: 60, annualRate: 125.1, currency: 'ARS', provider: 'BYMA', description: 'Caución a 60 días' },
    { term: 90, annualRate: 126.8, currency: 'ARS', provider: 'BYMA', description: 'Caución a 90 días' },
    { term: 180, annualRate: 128.5, currency: 'ARS', provider: 'BYMA', description: 'Caución a 180 días' },
    { term: 365, annualRate: 130.2, currency: 'ARS', provider: 'BYMA', description: 'Caución a 365 días' }
  ];

  async function fetchFromBYMA() {
    try {
      console.log('🔗 Fetching cauciones data from BYMA...');
      const response = await nodeFetch(BYMA_CAUCIONES_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TITO-Financial-App/1.0'
        }
      });
      if (!response.ok) throw new Error(`BYMA API responded with status: ${response.status}`);
      const data = await response.json();
      const rates: any[] = [];
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.term && item.rate) {
            rates.push({
              term: parseInt(item.term),
              annualRate: parseFloat(item.rate),
              currency: 'ARS',
              provider: 'BYMA',
              description: `Caución a ${item.term} día${item.term > 1 ? 's' : ''}`
            });
          }
        });
      } else if (data.rates && Array.isArray(data.rates)) {
        data.rates.forEach((item: any) => {
          if (item.term && item.rate) {
            rates.push({
              term: parseInt(item.term),
              annualRate: parseFloat(item.rate),
              currency: 'ARS',
              provider: 'BYMA',
              description: `Caución a ${item.term} día${item.term > 1 ? 's' : ''}`
            });
          }
        });
      }
      console.log(`✅ BYMA: Retrieved ${rates.length} cauciones rates`);
      return rates;
    } catch (error) {
      console.warn(`⚠️ BYMA API error: ${error}`);
      return [];
    }
  }

  async function fetchFromBCRA() {
    try {
      console.log('🔗 Fetching cauciones data from BCRA...');
      const response = await nodeFetch(BCRA_CAUCIONES_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TITO-Financial-App/1.0'
        }
      });
      if (!response.ok) throw new Error(`BCRA API responded with status: ${response.status}`);
      const data = await response.json();
      const rates: any[] = [];
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.plazo && item.tasa) {
            rates.push({
              term: parseInt(item.plazo),
              annualRate: parseFloat(item.tasa),
              currency: 'ARS',
              provider: 'BCRA',
              description: `Caución a ${item.plazo} día${item.plazo > 1 ? 's' : ''}`
            });
          }
        });
      } else if (data.resultados && Array.isArray(data.resultados)) {
        data.resultados.forEach((item: any) => {
          if (item.plazo && item.tasa) {
            rates.push({
              term: parseInt(item.plazo),
              annualRate: parseFloat(item.tasa),
              currency: 'ARS',
              provider: 'BCRA',
              description: `Caución a ${item.plazo} día${item.plazo > 1 ? 's' : ''}`
            });
          }
        });
      }
      console.log(`✅ BCRA: Retrieved ${rates.length} cauciones rates`);
      return rates;
    } catch (error) {
      console.warn(`⚠️ BCRA API error: ${error}`);
      return [];
    }
  }

  async function fetchCaucionesRates() {
    console.log('📊 Fetching cauciones rates from official APIs...');
    const [bymaRates, bcraRates] = await Promise.allSettled([
      fetchFromBYMA(),
      fetchFromBCRA()
    ]);
    let rates: any[] = [];
    if (bymaRates.status === 'fulfilled' && bymaRates.value.length > 0) {
      rates = bymaRates.value;
      console.log('✅ Using BYMA data as primary source');
    } else if (bcraRates.status === 'fulfilled' && bcraRates.value.length > 0) {
      rates = bcraRates.value;
      console.log('✅ Using BCRA data as fallback source');
    } else {
      console.warn('⚠️ Both APIs failed, using fallback rates');
      rates = [...FALLBACK_RATES];
    }
    const standardTerms = [1, 7, 14, 30, 60, 90, 180, 365];
    const finalRates: any[] = [];
    standardTerms.forEach((term: number) => {
      const existingRate = rates.find((rate: any) => rate.term === term);
      if (existingRate) {
        finalRates.push(existingRate);
      } else {
        const availableRates = rates.filter((rate: any) => rate.term > 0);
        if (availableRates.length > 0) {
          const closestRate = availableRates.reduce((prev: any, curr: any) =>
            Math.abs(curr.term - term) < Math.abs(prev.term - term) ? curr : prev
          );
          finalRates.push({
            term,
            annualRate: closestRate.annualRate,
            currency: 'ARS',
            provider: closestRate.provider,
            description: `Caución a ${term} día${term > 1 ? 's' : ''}`
          });
        }
      }
    });
    finalRates.forEach((rate: any) => {
      rate.annualRate = Math.round(rate.annualRate * 10) / 10;
    });
    console.log(`📈 Final rates: ${finalRates.length} entries processed`);
    return finalRates;
  }

  async function updateCaucionesData() {
    try {
      const rates = await fetchCaucionesRates();
      const caucionesData = {
        lastUpdated: new Date().toISOString(),
        rates
      };
      const dataPath = path.join(process.cwd(), 'data', 'cauciones.json');
      await fs.writeFile(dataPath, JSON.stringify(caucionesData, null, 2));
      console.log('✅ Cauciones data updated successfully');
      console.log(`📅 Last updated: ${caucionesData.lastUpdated}`);
      console.log(`📊 Updated ${rates.length} rate entries`);
      console.log('\n📈 Sample rates:');
      rates.slice(0, 3).forEach((rate: any) => {
        console.log(`  ${rate.description}: ${rate.annualRate}% (${rate.provider})`);
      });
    } catch (error) {
      console.error('❌ Failed to update cauciones data:', error);
      process.exit(1);
    }
  }

  if (require.main === module) {
    await updateCaucionesData();
  }

  module.exports = { updateCaucionesData, fetchCaucionesRates };
})();
