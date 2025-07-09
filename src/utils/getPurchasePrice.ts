export default function getPurchasePrice(pos: any): number {
  if (typeof pos.purchasePrice === 'number' && Number.isFinite(pos.purchasePrice)) return pos.purchasePrice;
  if (typeof pos.averagePrice === 'number' && Number.isFinite(pos.averagePrice)) return pos.averagePrice;
  return NaN;
} 