import React from 'react';

interface Props {
  data: {
    portfolioReturnARS: number;
    portfolioReturnUSD: number;
    [key: string]: number;
  };
}

const benchmarkLabels: Record<string, string> = {
  'S&P 500': 'S&P 500',
  'Gold': 'Oro',
  'US 10-Year Treasury': 'Bono USA 10 años',
  'NASDAQ': 'NASDAQ',
  'Dow Jones': 'Dow Jones',
  'Russell 2000': 'Russell 2000',
  'VIX': 'VIX',
  'Bitcoin': 'Bitcoin',
  'Ethereum': 'Ethereum',
  'US Dollar Index': 'Índice Dólar USA',
  'fixedDeposit': 'Plazo Fijo',
  'realEstate': 'Bienes Raíces',
  'usTreasury': 'Bono USA',
  'sp500': 'S&P 500',
  'gold': 'Oro'
};

export default function ReturnComparison({ data }: Props) {
  // Extract portfolio returns and create items for other benchmarks
  const { portfolioReturnARS, portfolioReturnUSD, ...benchmarks } = data;

  // Redondear y formatear los valores del portafolio a 1 decimal como string
  const formattedPortfolioReturnARS =
    typeof portfolioReturnARS === 'number' ? (portfolioReturnARS >= 0 ? '+' : '') + portfolioReturnARS.toFixed(1) + '%' : String(portfolioReturnARS);
  const formattedPortfolioReturnUSD =
    typeof portfolioReturnUSD === 'number' ? (portfolioReturnUSD >= 0 ? '+' : '') + portfolioReturnUSD.toFixed(1) + '%' : String(portfolioReturnUSD);

  const items = [
    { label: 'Tu Portafolio (ARS)', value: portfolioReturnARS, display: formattedPortfolioReturnARS, decimals: 1 },
    { label: 'Tu Portafolio (USD)', value: portfolioReturnUSD, display: formattedPortfolioReturnUSD, decimals: 1 },
    ...Object.entries(benchmarks).map(([key, value]) => ({
      label: benchmarkLabels[key] || key,
      value: value as number,
      display: (value >= 0 ? '+' : '') + value.toFixed(2) + '%',
      decimals: 2
    }))
  ];

  const best = Math.max(...items.map(i => Math.abs(i.value)));
  
  return (
    <div className="mb-8 bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Comparación de Retorno Anualizado</h3>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <div className="w-40 text-gray-800 text-sm font-medium">{item.label}</div>
            <div
              className={`w-24 font-mono text-base text-right pr-4 ${
                item.value === best ? 'font-bold' : ''
              } ${
                item.value >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
              title={item.display}
            >
              {item.display}
            </div>
            <div className="flex-1 h-3 bg-gray-200 rounded">
              <div
                className={`h-3 rounded ${item.value === best ? 'bg-green-500' : 'bg-gray-400'}`}
                style={{ width: `${best > 0 ? Math.max(0, (item.value / best) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-600 mt-4 text-center">El rendimiento pasado no garantiza resultados futuros.</div>
    </div>
  );
} 