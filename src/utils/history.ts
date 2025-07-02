// src/utils/history.ts
// Utility functions for working with historical value data
export function trimHistory<T extends { invested: number; total: number }>(hist: T[]): T[] {
  const first = hist.findIndex((h) => h.invested !== 0 || h.total !== 0);
  return first >= 0 ? hist.slice(first) : [];
}

export function trimCategoryValueHistory<T extends { totalValue: number }>(hist: T[]): T[] {
  const first = hist.findIndex((h) => h.totalValue !== 0);
  return first >= 0 ? hist.slice(first) : [];
} 