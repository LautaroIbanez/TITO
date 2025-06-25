import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

async function fetchArgentinaInflation(): Promise<{ monthly: number; annual: number }> {
  // INDEC API: https://apis.datos.gob.ar/series/api/series/?ids=148.3_INFLACION_M_2016,148.3_INFLACION_I2N_2016
  // We'll use the "Nivel general" (CPI) monthly variation (148.3_INFLACION_M_2016)
  const url = 'https://apis.datos.gob.ar/series/api/series/?ids=148.3_INFLACION_M_2016&limit=13&format=json';
  const res = await fetch(url);
  const data = await res.json();
  const series = data?.data;
  if (!series || !Array.isArray(series) || series.length < 2) throw new Error('No INDEC data');
  // Last value is latest month, previous 12 for annual
  const monthly = parseFloat(series[series.length - 1][1]);
  // Annual: sum of last 12 months
  const last12 = series.slice(-12).map((row: any) => parseFloat(row[1]));
  const annual = last12.reduce((a, b) => a + b, 0);
  return { monthly, annual };
}

async function fetchUSInflation(): Promise<{ monthly: number; annual: number }> {
  // FRED API: https://fred.stlouisfed.org/series/CPIAUCSL
  // We'll use the FRED API for US CPI (monthly, not seasonally adjusted)
  // FRED API key is not required for basic queries
  const url = 'https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=YOUR_FRED_API_KEY&file_type=json&sort_order=desc&limit=13';
  // For demo, use a public proxy (or ask user to set their own key)
  // We'll fallback to a public endpoint if no key is set
  const apiKey = process.env.FRED_API_KEY || '';
  const fetchUrl = apiKey
    ? `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13`
    : 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL';

  if (apiKey) {
    const res = await fetch(fetchUrl);
    const data = await res.json();
    const obs = data.observations;
    if (!obs || obs.length < 2) throw new Error('No FRED data');
    // Monthly: percent change from previous month
    const last = parseFloat(obs[obs.length - 1].value);
    const prev = parseFloat(obs[obs.length - 2].value);
    const monthly = ((last - prev) / prev) * 100;
    // Annual: percent change from 12 months ago
    const prev12 = parseFloat(obs[obs.length - 13].value);
    const annual = ((last - prev12) / prev12) * 100;
    return { monthly, annual };
  } else {
    // Fallback: parse CSV
    const res = await fetch(fetchUrl);
    const text = await res.text();
    const lines = text.trim().split('\n').slice(-13);
    const values = lines.map((line: string) => parseFloat(line.split(',')[1])).filter((v: number) => !isNaN(v));
    if (values.length < 13) throw new Error('Not enough FRED data');
    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    const prev12 = values[0];
    const monthly = ((last - prev) / prev) * 100;
    const annual = ((last - prev12) / prev12) * 100;
    return { monthly, annual };
  }
}

async function main() {
  try {
    const argentina = await fetchArgentinaInflation();
    const usa = await fetchUSInflation();
    const inflation = {
      argentina: {
        monthly: parseFloat(argentina.monthly.toFixed(2)),
        annual: parseFloat(argentina.annual.toFixed(2)),
      },
      usa: {
        monthly: parseFloat(usa.monthly.toFixed(2)),
        annual: parseFloat(usa.annual.toFixed(2)),
      },
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    const outPath = path.join(process.cwd(), 'data', 'inflation.json');
    fs.writeFileSync(outPath, JSON.stringify(inflation, null, 2));
    console.log('Updated inflation.json:', inflation);
  } catch (err) {
    console.error('Failed to update inflation:', err);
    process.exit(1);
  }
}

main(); 