import { Bond } from '@/types/finance';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: keyof Bond;
  direction: SortDirection;
}

/**
 * Sorts bonds by the specified column and direction
 */
export function sortBonds(bonds: Bond[], column: keyof Bond, direction: SortDirection): Bond[] {
  return [...bonds].sort((a, b) => {
    const aValue = a[column];
    const bValue = b[column];

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) return direction === 'asc' ? 1 : -1;
    if (bValue === null || bValue === undefined) return direction === 'asc' ? -1 : 1;

    // Handle numeric values
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Handle string values
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return direction === 'asc' ? comparison : -comparison;
    }

    // Handle mixed types (convert to string for comparison)
    const aString = String(aValue);
    const bString = String(bValue);
    const comparison = aString.localeCompare(bString);
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Toggles sort direction
 */
export function toggleSortDirection(currentDirection: SortDirection): SortDirection {
  return currentDirection === 'asc' ? 'desc' : 'asc';
}

/**
 * Gets sort indicator (arrow) for display
 */
export function getSortIndicator(column: keyof Bond, sortColumn: keyof Bond, sortDirection: SortDirection): string {
  if (column !== sortColumn) return '';
  return sortDirection === 'asc' ? '↑' : '↓';
} 