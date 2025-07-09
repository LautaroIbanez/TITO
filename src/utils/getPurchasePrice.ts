export default function getPurchasePrice(pos: any): number {
  return pos.purchasePrice ?? pos.averagePrice ?? 0;
} 