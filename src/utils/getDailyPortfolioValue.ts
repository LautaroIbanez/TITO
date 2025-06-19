import { PortfolioTransaction } from '@/types';
import { PriceData } from '@/types/finance';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrBefore);

export function getDailyPortfolioValue(
  transactions: PortfolioTransaction[],
  priceHistory: Record<string, PriceData[]>
): { date: string; value: number }[] {
  if (!transactions.length) return [];
  const txs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstDate = dayjs(txs[0].date).startOf('day');
  const lastDate = dayjs().startOf('day');
  const allDates: string[] = [];
  let d = firstDate;
  while (!d.isAfter(lastDate)) {
    allDates.push(d.format('YYYY-MM-DD'));
    d = d.add(1, 'day');
  }
  let prevPos: Record<string, number> = {};
  let prevValue = 0;
  const result: { date: string; value: number }[] = [];
  for (const date of allDates) {
    // Build position map up to this date
    const pos: Record<string, number> = { ...prevPos };
    for (const tx of txs) {
      if (dayjs(tx.date).isAfter(date)) break;
      if (tx.type === 'Buy') pos[tx.symbol] = (pos[tx.symbol] || 0) + tx.quantity;
      if (tx.type === 'Sell') pos[tx.symbol] = (pos[tx.symbol] || 0) - tx.quantity;
    }
    Object.keys(pos).forEach((s) => { if (pos[s] <= 0) delete pos[s]; });
    let value = 0;
    for (const symbol in pos) {
      const ph = priceHistory[symbol];
      if (!ph) continue;
      let price = 0;
      for (let i = ph.length - 1; i >= 0; i--) {
        if (dayjs(ph[i].date).isSameOrBefore(date)) {
          price = ph[i].close;
          break;
        }
      }
      value += pos[symbol] * price;
    }
    if (value === 0 && prevValue > 0) value = prevValue;
    result.push({ date, value });
    prevPos = pos;
    prevValue = value;
  }
  return result;
} 