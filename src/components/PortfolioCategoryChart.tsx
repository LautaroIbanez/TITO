import React from 'react';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { PortfolioSummaryEntry } from '@/utils/portfolioSummaryHistory';

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const COLORS = {
  total: '#22223b',
  invested: '#4a4e69',
  gains: '#9a8c98',
  cash: '#588157',
};

const CATEGORY_LABELS = {
  total: 'Valor Total',
  invested: 'Capital Invertido',
  gains: 'Ganancias Netas',
  cash: 'Efectivo Disponible',
};

export interface PortfolioCategoryChartProps {
  history: PortfolioSummaryEntry[];
  currency: 'ARS' | 'USD';
  height?: number;
}

export const PortfolioCategoryChart: React.FC<PortfolioCategoryChartProps> = ({ 
  history, 
  currency,
  height = 220
}) => {
  const labels = history.map((entry) => entry.date);

  // Get the appropriate currency values
  const getCurrencyValue = (entry: PortfolioSummaryEntry, field: keyof Pick<PortfolioSummaryEntry, 'totalARS' | 'totalUSD' | 'investedARS' | 'investedUSD' | 'cashARS' | 'cashUSD'>) => {
    return entry[field];
  };

  // Calculate cumulative gains from daily differences
  const getCumulativeGains = () => {
    const gains: number[] = [];
    let acc = 0;

    history.forEach((entry, idx) => {
      if (idx === 0) {
        gains.push(0);
        return;
      }

      const prev = history[idx - 1];
      if (currency === 'ARS') {
        acc += entry.totalARS - prev.totalARS;
      } else {
        acc += entry.totalUSD - prev.totalUSD;
      }

      gains.push(acc);
    });

    return gains;
  };

  const cumulativeGains = getCumulativeGains();

  const datasets = [
    {
      label: `${CATEGORY_LABELS.total} (${currency})`,
      data: history.map((entry) => getCurrencyValue(entry, currency === 'ARS' ? 'totalARS' : 'totalUSD')),
      borderColor: COLORS.total,
      backgroundColor: COLORS.total,
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2,
    },
    {
      label: `${CATEGORY_LABELS.invested} (${currency})`,
      data: history.map((entry) => getCurrencyValue(entry, currency === 'ARS' ? 'investedARS' : 'investedUSD')),
      borderColor: COLORS.invested,
      backgroundColor: COLORS.invested,
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2,
    },
    {
      label: `${CATEGORY_LABELS.gains} (${currency})`,
      data: cumulativeGains,
      borderColor: COLORS.gains,
      backgroundColor: COLORS.gains,
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2,
    },
    {
      label: `${CATEGORY_LABELS.cash} (${currency})`,
      data: history.map((entry) => getCurrencyValue(entry, currency === 'ARS' ? 'cashARS' : 'cashUSD')),
      borderColor: COLORS.cash,
      backgroundColor: COLORS.cash,
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2,
    },
  ];

  const data = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        onClick: (e: any, legendItem: any, legend: any) => {
          // Default Chart.js legend click toggles visibility
          const ci = legend.chart;
          const index = legendItem.datasetIndex;
          const meta = ci.getDatasetMeta(index);
          meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
          ci.update();
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          afterBody: (context: any) => {
            if (context.length === 0) return '';
            
            const dataIndex = context[0].dataIndex;
            const entry = history[dataIndex];
            
            if (!entry) return '';
            
            return [
              '',
              `Total ARS: $${entry.totalARS.toLocaleString('es-AR', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              })}`,
              `Total USD: $${entry.totalUSD.toLocaleString('en-US', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              })}`
            ];
          }
        }
      },
    },
    interaction: {
      mode: 'nearest' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 10,
        },
      },
      y: {
        display: true,
        title: {
          display: false,
        },
        beginAtZero: true,
      },
    },
  };

  return <Line data={data} options={options} height={height} />;
};

export default PortfolioCategoryChart; 