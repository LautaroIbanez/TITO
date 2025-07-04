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
import type { CategoryValueEntry } from '@/utils/categoryValueHistory';

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
  stocks: '#4a4e69',
  bonds: '#9a8c98',
  deposits: '#c9ada7',
  crypto: '#f2e9e4',
  cauciones: '#f28482',
  cash: '#588157',
};

const CATEGORY_LABELS: Record<string, string> = {
  total: 'Total',
  stocks: 'Stocks',
  bonds: 'Bonds',
  deposits: 'Deposits',
  crypto: 'Crypto',
  cauciones: 'Cauciones',
  cash: 'Cash',
};

function getCategoryValue(entry: CategoryValueEntry, key: string): number {
  if (key === 'stocks') {
    // Sum all stock categories (tech, etfs, etc, and other_stocks)
    return Object.entries(entry.categories)
      .filter(([cat]) =>
        [
          'tech',
          'etfs',
          'semiconductors',
          'communication',
          'industrials',
          'defensive',
          'materials',
          'healthcare',
          'financials',
          'cyclical',
          'merval',
          'other_stocks',
        ].includes(cat)
      )
      .reduce((sum, [, v]) => sum + v, 0);
  }
  return entry.categories[key] || 0;
}

export interface PortfolioCategoryChartProps {
  history: CategoryValueEntry[];
  height?: number;
}

export const PortfolioCategoryChart: React.FC<PortfolioCategoryChartProps> = ({ history, height = 220 }) => {
  const labels = history.map((entry) => entry.date);

  const datasets = [
    {
      label: CATEGORY_LABELS.total,
      data: history.map((entry) => entry.totalValue),
      borderColor: COLORS.total,
      backgroundColor: COLORS.total,
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2,
    },
    {
      label: CATEGORY_LABELS.stocks,
      data: history.map((entry) => getCategoryValue(entry, 'stocks')),
      borderColor: COLORS.stocks,
      backgroundColor: COLORS.stocks,
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2,
    },
    {
      label: CATEGORY_LABELS.bonds,
      data: history.map((entry) => getCategoryValue(entry, 'bonds')),
      borderColor: COLORS.bonds,
      backgroundColor: COLORS.bonds,
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2,
    },
    {
      label: CATEGORY_LABELS.deposits,
      data: history.map((entry) => getCategoryValue(entry, 'deposits')),
      borderColor: COLORS.deposits,
      backgroundColor: COLORS.deposits,
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2,
    },
    {
      label: CATEGORY_LABELS.crypto,
      data: history.map((entry) => getCategoryValue(entry, 'crypto')),
      borderColor: COLORS.crypto,
      backgroundColor: COLORS.crypto,
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2,
    },
    {
      label: CATEGORY_LABELS.cauciones,
      data: history.map((entry) => getCategoryValue(entry, 'cauciones')),
      borderColor: COLORS.cauciones,
      backgroundColor: COLORS.cauciones,
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 2,
    },
    {
      label: CATEGORY_LABELS.cash,
      data: history.map((entry) => getCategoryValue(entry, 'cash')),
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