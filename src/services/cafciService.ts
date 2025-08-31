export interface CafciFund {
  fondo: string;
  tna: number | null;
  rendimiento_mensual: number | null;
  categoria: string;
}

export interface CafciResponse {
  success: boolean;
  data: CafciFund[];
  stats: {
    totalFunds: number;
    lastUpdate: number;
    cacheAge: number;
    isValid: boolean;
  };
  timestamp: string;
}

export interface CafciError {
  success: false;
  error: string;
  message: string;
  timestamp: string;
}

/**
 * Fetch CAFCI TNA data from the API
 */
export async function fetchFondosTNA(params?: {
  categoria?: string;
  search?: string;
  force?: boolean;
}): Promise<CafciResponse> {
  const url = new URL('/api/fondos/tna', window.location.origin);
  
  if (params?.categoria) {
    url.searchParams.set('categoria', params.categoria);
  }
  if (params?.search) {
    url.searchParams.set('search', params.search);
  }
  if (params?.force) {
    url.searchParams.set('force', 'true');
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData: CafciError = await response.json();
    throw new Error(errorData.message || 'Failed to fetch CAFCI data');
  }

  return response.json();
}

/**
 * Group funds by category for easier consumption
 */
export function groupFundsByCategory(funds: CafciFund[]): Record<string, CafciFund[]> {
  return funds.reduce((acc, fund) => {
    const category = fund.categoria;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(fund);
    return acc;
  }, {} as Record<string, CafciFund[]>);
}

/**
 * Sort funds by TNA (descending)
 */
export function sortFundsByTNA(funds: CafciFund[]): CafciFund[] {
  return [...funds].sort((a, b) => {
    const tnaA = a.tna ?? -Infinity;
    const tnaB = b.tna ?? -Infinity;
    return tnaB - tnaA;
  });
}

/**
 * Filter funds by search term
 */
export function filterFundsBySearch(funds: CafciFund[], searchTerm: string): CafciFund[] {
  if (!searchTerm.trim()) return funds;
  
  const term = searchTerm.toLowerCase();
  return funds.filter(fund => 
    fund.fondo.toLowerCase().includes(term) ||
    fund.categoria.toLowerCase().includes(term)
  );
}







