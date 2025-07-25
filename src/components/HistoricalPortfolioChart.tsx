import React, { useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  TooltipItem
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import datalabelsPlugin from 'chartjs-plugin-datalabels';
import crosshairPlugin from 'chartjs-plugin-crosshair';
import 'chartjs-adapter-dayjs-4';
import dayjs from 'dayjs';
import type { DailyPortfolioRecord } from '@/utils/portfolioHistory';
import { formatCurrency } from '@/utils/goalCalculator';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  annotationPlugin,
  datalabelsPlugin
);

interface Props {
  records: DailyPortfolioRecord[];
}

function isValidRecord(r: DailyPortfolioRecord) {
  // Check that fecha exists and is a valid string
  if (!r.fecha || typeof r.fecha !== 'string') {
    return false;
  }

  // Only require fecha, totals, invested, and cash to be finite
  // Allow ganancias_netas to be null/undefined
  return [
    r.total_portfolio_ars,
    r.total_portfolio_usd,
    r.capital_invertido_ars,
    r.capital_invertido_usd,
    r.efectivo_disponible_ars,
    r.efectivo_disponible_usd,
  ].every(
    (v) => v !== null && v !== undefined && Number.isFinite(v)
  );
}

// Function to calculate dynamic Y-axis scaling
function calculateDynamicScaling(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const ratio = range / max;
  
  // If ratio is below 5%, use tighter scaling
  if (ratio < 0.05 && range > 0) {
    const tightPadding = range * 0.02; // 2% padding instead of 10%
    return {
      min: min - tightPadding,
      max: max + tightPadding
    };
  }
  
  // Default 10% padding
  const padding = range * 0.1;
  return {
    min: min - padding,
    max: max + padding
  };
}

export default function HistoricalPortfolioChart({ records }: Props) {
  // Register crosshair plugin on mount and unregister on unmount
  useEffect(() => {
    ChartJS.register(crosshairPlugin);
    
    return () => {
      ChartJS.unregister(crosshairPlugin);
    };
  }, []);

  // Helper functions to calculate total values using the correct formula
  const calcTotalARS = (r: DailyPortfolioRecord) =>
    r.capital_invertido_ars + (r.ganancias_netas_ars || 0) + r.efectivo_disponible_ars;
  const calcTotalUSD = (r: DailyPortfolioRecord) =>
    r.capital_invertido_usd + (r.ganancias_netas_usd || 0) + r.efectivo_disponible_usd;

  // Sort records by fecha and filter out invalid ones
  const sortedAndFilteredRecords = (records || [])
    .filter(isValidRecord)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  // Validation: Check if the total values in historical records match the expected formula
  if (sortedAndFilteredRecords.length > 0) {
    // Check each record for discrepancies
    sortedAndFilteredRecords.forEach((record, index) => {
      const expectedTotalARS = calcTotalARS(record);
      const expectedTotalUSD = calcTotalUSD(record);
      
      if (Math.abs(record.total_portfolio_ars - expectedTotalARS) > 0.01 || Math.abs(record.total_portfolio_usd - expectedTotalUSD) > 0.01) {
        console.warn('🚨 HISTORICAL CHART: Portfolio total does not match formula!', {
          recordDate: record.fecha,
          recordIndex: index,
          actualTotal: { ARS: record.total_portfolio_ars, USD: record.total_portfolio_usd },
          expectedTotal: { ARS: expectedTotalARS, USD: expectedTotalUSD },
          components: {
            investedCapital: { ARS: record.capital_invertido_ars, USD: record.capital_invertido_usd },
            netGains: { ARS: record.ganancias_netas_ars || 0, USD: record.ganancias_netas_usd || 0 },
            cash: { ARS: record.efectivo_disponible_ars, USD: record.efectivo_disponible_usd }
          },
          formula: {
            ars: `${record.capital_invertido_ars} + ${record.ganancias_netas_ars || 0} + ${record.efectivo_disponible_ars} = ${expectedTotalARS}`,
            usd: `${record.capital_invertido_usd} + ${record.ganancias_netas_usd || 0} + ${record.efectivo_disponible_usd} = ${expectedTotalUSD}`
          }
        });
      }
    });
  }

  if (!sortedAndFilteredRecords || sortedAndFilteredRecords.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico del Portafolio</h3>
        <p className="text-gray-500 text-center py-8">No hay datos históricos disponibles</p>
      </div>
    );
  }

  const labels = sortedAndFilteredRecords.map((r) => dayjs(r.fecha).toDate());

  // Compute cumulative gains from daily differences
  const computedGainsARS: number[] = [];
  const computedGainsUSD: number[] = [];
  let accARS = 0;
  let accUSD = 0;

  sortedAndFilteredRecords.forEach((record, idx) => {
    if (idx === 0) {
      computedGainsARS.push(0);
      computedGainsUSD.push(0);
      return;
    }

    const prev = sortedAndFilteredRecords[idx - 1];
    accARS += calcTotalARS(record) - calcTotalARS(prev);
    accUSD += calcTotalUSD(record) - calcTotalUSD(prev);

    computedGainsARS.push(accARS);
    computedGainsUSD.push(accUSD);
  });

  // Check if all computed gains are zero
  const allGainsZero = computedGainsARS.every(gain => gain === 0) && 
                      computedGainsUSD.every(gain => gain === 0);

  // Calculate Y-axis ranges with dynamic scaling
  const arsValues = [
    ...sortedAndFilteredRecords.map(r => calcTotalARS(r)),
    ...sortedAndFilteredRecords.map(r => r.capital_invertido_ars),
    ...computedGainsARS,
    ...sortedAndFilteredRecords.map(r => r.efectivo_disponible_ars)
  ].filter(v => Number.isFinite(v));
  
  const usdValues = [
    ...sortedAndFilteredRecords.map(r => calcTotalUSD(r)),
    ...sortedAndFilteredRecords.map(r => r.capital_invertido_usd),
    ...computedGainsUSD,
    ...sortedAndFilteredRecords.map(r => r.efectivo_disponible_usd)
  ].filter(v => Number.isFinite(v));

  const arsScaling = calculateDynamicScaling(arsValues);
  const usdScaling = calculateDynamicScaling(usdValues);

  // ARS datasets with individual border widths and contrasting colors
  const arsChartData = {
    labels,
    datasets: [
      {
        label: 'Total ARS',
        data: sortedAndFilteredRecords.map((r) => calcTotalARS(r)),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.08)',
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'ARS',
        borderWidth: 4, // Thickest for Total
      },
      {
        label: 'Invertido ARS',
        data: sortedAndFilteredRecords.map((r) => r.capital_invertido_ars),
        borderColor: '#7c2d12', // More contrasting brown
        backgroundColor: 'rgba(124,45,18,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [6, 3],
        tension: 0.2,
        yAxisID: 'ARS',
        borderWidth: 3, // Medium for Invertido
      },
      {
        label: 'Ganancia Neta ARS',
        data: computedGainsARS,
        borderColor: '#166534', // Darker green for better contrast
        backgroundColor: 'rgba(22,101,52,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [3, 3],
        tension: 0.2,
        yAxisID: 'ARS',
        borderWidth: 2, // Thinner for Ganancia Neta
      },
      {
        label: 'Efectivo ARS',
        data: sortedAndFilteredRecords.map((r) => r.efectivo_disponible_ars),
        borderColor: '#ea580c', // More contrasting orange
        backgroundColor: 'rgba(234,88,12,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [2, 4],
        tension: 0.2,
        yAxisID: 'ARS',
        borderWidth: 1, // Thinnest for Efectivo
      },
    ],
  };

  // USD datasets with individual border widths and contrasting colors
  const usdChartData = {
    labels,
    datasets: [
      {
        label: 'Total USD',
        data: sortedAndFilteredRecords.map((r) => calcTotalUSD(r)),
        borderColor: '#3730a3', // Darker indigo for better contrast
        backgroundColor: 'rgba(55,48,163,0.08)',
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'USD',
        borderWidth: 4, // Thickest for Total
      },
      {
        label: 'Invertido USD',
        data: sortedAndFilteredRecords.map((r) => r.capital_invertido_usd),
        borderColor: '#be185d', // Darker pink for better contrast
        backgroundColor: 'rgba(190,24,93,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [6, 3],
        tension: 0.2,
        yAxisID: 'USD',
        borderWidth: 3, // Medium for Invertido
      },
      {
        label: 'Ganancia Neta USD',
        data: computedGainsUSD,
        borderColor: '#a16207', // Darker yellow for better contrast
        backgroundColor: 'rgba(161,98,7,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [3, 3],
        tension: 0.2,
        yAxisID: 'USD',
        borderWidth: 2, // Thinner for Ganancia Neta
      },
      {
        label: 'Efectivo USD',
        data: sortedAndFilteredRecords.map((r) => r.efectivo_disponible_usd),
        borderColor: '#0369a1', // Darker blue for better contrast
        backgroundColor: 'rgba(3,105,161,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [2, 4],
        tension: 0.2,
        yAxisID: 'USD',
        borderWidth: 1, // Thinnest for Efectivo
      },
    ],
  };

  const arsChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context: TooltipItem<'line'>) =>
            `${context.dataset.label}: ${formatCurrency(context.parsed.y, 'ARS')}`,
          title: (context: TooltipItem<'line'>[]) =>
            `Fecha: ${dayjs(context[0]?.parsed.x).format('YYYY-MM-DD')}`,
        }
      },
      datalabels: {
        display: false, // Hidden by default, will be shown via annotation
      },
      annotation: {
        annotations: {
          // Add annotations for the last value of each dataset
          totalARS: {
            type: 'point' as const,
            xValue: new Date(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].fecha).toISOString(),
            yValue: calcTotalARS(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1]),
            backgroundColor: '#2563eb',
            borderColor: '#2563eb',
            borderWidth: 2,
            radius: 4,
            label: {
              content: formatCurrency(calcTotalARS(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1]), 'ARS'),
              enabled: true,
              position: 'top' as const,
              color: '#2563eb',
              font: { size: 10, weight: 'bold' as const }
            }
          },
          invertidoARS: {
            type: 'point' as const,
            xValue: new Date(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].fecha).toISOString(),
            yValue: sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].capital_invertido_ars,
            backgroundColor: '#7c2d12',
            borderColor: '#7c2d12',
            borderWidth: 2,
            radius: 4,
            label: {
              content: formatCurrency(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].capital_invertido_ars, 'ARS'),
              enabled: true,
              position: 'bottom' as const,
              color: '#7c2d12',
              font: { size: 10, weight: 'bold' as const }
            }
          },
          gananciaARS: {
            type: 'point' as const,
            xValue: new Date(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].fecha).toISOString(),
            yValue: computedGainsARS[computedGainsARS.length - 1],
            backgroundColor: '#166534',
            borderColor: '#166534',
            borderWidth: 2,
            radius: 4,
            label: {
              content: formatCurrency(computedGainsARS[computedGainsARS.length - 1], 'ARS'),
              enabled: true,
              position: 'top' as const,
              color: '#166534',
              font: { size: 10, weight: 'bold' as const }
            }
          },
          efectivoARS: {
            type: 'point' as const,
            xValue: new Date(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].fecha).toISOString(),
            yValue: sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].efectivo_disponible_ars,
            backgroundColor: '#ea580c',
            borderColor: '#ea580c',
            borderWidth: 2,
            radius: 4,
            label: {
              content: formatCurrency(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].efectivo_disponible_ars, 'ARS'),
              enabled: true,
              position: 'bottom' as const,
              color: '#ea580c',
              font: { size: 10, weight: 'bold' as const }
            }
          }
        }
      },
      crosshair: {
        line: {
          color: '#666',
          width: 1,
          dashPattern: [5, 5]
        },
        sync: {
          enabled: true,
          group: 1,
          suppressTooltips: false
        },
        snap: {
          enabled: true
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'day' as const },
        title: { display: true, text: 'Fecha' },
      },
      ARS: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'ARS' },
        min: arsScaling.min,
        max: arsScaling.max,
      },
    },
    elements: { line: { borderWidth: 2 } }, // Fallback default
    maintainAspectRatio: false,
    layout: { padding: 0 },
  };

  const usdChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context: TooltipItem<'line'>) =>
            `${context.dataset.label}: ${formatCurrency(context.parsed.y, 'USD')}`,
          title: (context: TooltipItem<'line'>[]) =>
            `Fecha: ${dayjs(context[0]?.parsed.x).format('YYYY-MM-DD')}`,
        }
      },
      datalabels: {
        display: false, // Hidden by default, will be shown via annotation
      },
      annotation: {
        annotations: {
          // Add annotations for the last value of each dataset
          totalUSD: {
            type: 'point' as const,
            xValue: new Date(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].fecha).toISOString(),
            yValue: calcTotalUSD(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1]),
            backgroundColor: '#3730a3',
            borderColor: '#3730a3',
            borderWidth: 2,
            radius: 4,
            label: {
              content: formatCurrency(calcTotalUSD(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1]), 'USD'),
              enabled: true,
              position: 'top' as const,
              color: '#3730a3',
              font: { size: 10, weight: 'bold' as const }
            }
          },
          invertidoUSD: {
            type: 'point' as const,
            xValue: new Date(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].fecha).toISOString(),
            yValue: sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].capital_invertido_usd,
            backgroundColor: '#be185d',
            borderColor: '#be185d',
            borderWidth: 2,
            radius: 4,
            label: {
              content: formatCurrency(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].capital_invertido_usd, 'USD'),
              enabled: true,
              position: 'bottom' as const,
              color: '#be185d',
              font: { size: 10, weight: 'bold' as const }
            }
          },
          gananciaUSD: {
            type: 'point' as const,
            xValue: new Date(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].fecha).toISOString(),
            yValue: computedGainsUSD[computedGainsUSD.length - 1],
            backgroundColor: '#a16207',
            borderColor: '#a16207',
            borderWidth: 2,
            radius: 4,
            label: {
              content: formatCurrency(computedGainsUSD[computedGainsUSD.length - 1], 'USD'),
              enabled: true,
              position: 'top' as const,
              color: '#a16207',
              font: { size: 10, weight: 'bold' as const }
            }
          },
          efectivoUSD: {
            type: 'point' as const,
            xValue: new Date(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].fecha).toISOString(),
            yValue: sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].efectivo_disponible_usd,
            backgroundColor: '#0369a1',
            borderColor: '#0369a1',
            borderWidth: 2,
            radius: 4,
            label: {
              content: formatCurrency(sortedAndFilteredRecords[sortedAndFilteredRecords.length - 1].efectivo_disponible_usd, 'USD'),
              enabled: true,
              position: 'bottom' as const,
              color: '#0369a1',
              font: { size: 10, weight: 'bold' as const }
            }
          }
        }
      },
      crosshair: {
        line: {
          color: '#666',
          width: 1,
          dashPattern: [5, 5]
        },
        sync: {
          enabled: true,
          group: 1,
          suppressTooltips: false
        },
        snap: {
          enabled: true
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'day' as const },
        title: { display: true, text: 'Fecha' },
      },
      USD: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'USD' },
        min: usdScaling.min,
        max: usdScaling.max,
      },
    },
    elements: { line: { borderWidth: 2 } }, // Fallback default
    maintainAspectRatio: false,
    layout: { padding: 0 },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico del Portafolio</h3>
      <div className="flex flex-col gap-8">
        <div className="h-80" data-testid="ars-chart-container">
          <h4 className="text-md font-semibold text-blue-700 mb-2">ARS</h4>
          <Line data={arsChartData} options={arsChartOptions} height={300} className="w-full" data-testid="ars-line-chart" />
        </div>
        <div className="h-80" data-testid="usd-chart-container">
          <h4 className="text-md font-semibold text-indigo-700 mb-2">USD</h4>
          <Line data={usdChartData} options={usdChartOptions} height={300} className="w-full" data-testid="usd-line-chart" />
        </div>
      </div>
      {allGainsZero && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Advertencia:</strong> No se detectaron ganancias en este período. Verificá si los precios están actualizados.
          </p>
        </div>
      )}
    </div>
  );
} 