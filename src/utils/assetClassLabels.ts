import type { AssetClass } from '@/types';

/**
 * Maps AssetClass values to their Spanish labels
 */
export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stocks: 'Acciones',
  bonds: 'Bonos',
  deposits: 'Depósitos',
  cash: 'Efectivo',
  crypto: 'Cripto'
};

/**
 * Gets the Spanish label for an AssetClass
 * @param assetClass The asset class to get the label for
 * @returns The Spanish label for the asset class
 */
export function getAssetClassLabel(assetClass: AssetClass): string {
  return ASSET_CLASS_LABELS[assetClass];
}

/**
 * Gets the Spanish label for an asset class, with fallback logic
 * @param assetClass The asset class to get the label for
 * @param id The recommendation ID for fallback logic
 * @returns The Spanish label or fallback text
 */
export function getRecommendationLabel(assetClass?: AssetClass, id?: string): string {
  if (assetClass) {
    return getAssetClassLabel(assetClass);
  }
  
  // Fallback for cash recommendations that start with 'cash-'
  if (id && id.startsWith('cash-')) {
    return 'Efectivo';
  }
  
  return 'Activo';
} 