'use client';

import React, { useState, useEffect } from 'react';
import { PortfolioPosition } from '@/types'; // Import main types
import { usePortfolio } from '@/contexts/PortfolioContext';
import { DEFAULT_COMMISSION_PCT, DEFAULT_PURCHASE_FEE_PCT } from '@/utils/constants';

export type TradeType = 'Buy' | 'Sell' | 'Invest';

export interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: number, assetType: PortfolioPosition['type'], identifier: string, commissionPct?: number, purchaseFeePct?: number) => Promise<void>;
  tradeType: TradeType;
  assetName: string;
  assetType: PortfolioPosition['type']; // 'Stock', 'Bond', 'FixedTermDeposit'
  identifier: string; // symbol, ticker, or id
  price?: number; // Optional for amount-based trades like deposits
  maxShares?: number; // For selling
  availableCash?: number; // For buying/investing
  isAmountBased?: boolean; // Flag for fixed-term deposits
}

export default function TradeModal({
  isOpen,
  onClose,
  onSubmit,
  tradeType,
  assetName,
  assetType,
  identifier,
  price = 1, // Default to 1 for amount-based trades
  maxShares = Infinity,
  availableCash = Infinity,
  isAmountBased = false,
}: TradeModalProps) {
  const [value, setValue] = useState(1);
  const [commissionPct, setCommissionPct] = useState(DEFAULT_COMMISSION_PCT);
  const [purchaseFeePct, setPurchaseFeePct] = useState(DEFAULT_PURCHASE_FEE_PCT);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { refreshPortfolio } = usePortfolio();
  
  // Calculate total cost including fees for buy transactions
  const baseCost = value * price;
  const totalCost = tradeType === 'Buy' && (assetType === 'Stock' || assetType === 'Bond')
    ? baseCost * (1 + commissionPct / 100 + purchaseFeePct / 100)
    : baseCost;

  const getTradeTypeText = () => {
    if (tradeType === 'Invest') return 'Invertir en';
    return tradeType === 'Buy' ? 'Comprar' : 'Vender';
  }
  const tradeTypeText = getTradeTypeText();

  useEffect(() => {
    if (isOpen) {
      setValue(isAmountBased ? 50000 : 1); // Start with a default amount or quantity 1
      setCommissionPct(DEFAULT_COMMISSION_PCT);
      setPurchaseFeePct(DEFAULT_PURCHASE_FEE_PCT);
      setError('');
      setLoading(false);
    }
  }, [isOpen, isAmountBased]);

  useEffect(() => {
    setError('');
    if (value <= 0) {
      setError('El valor debe ser mayor a cero.');
    } else if (tradeType !== 'Sell' && totalCost > availableCash) {
      setError('Fondos insuficientes.');
    } else if (tradeType === 'Sell' && value > maxShares) {
      setError(`Solo puedes vender hasta ${maxShares} unidades.`);
    }
  }, [value, totalCost, availableCash, maxShares, tradeType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (error || loading) return;

    setLoading(true);
    try {
      const commission = tradeType === 'Buy' && (assetType === 'Stock' || assetType === 'Bond') ? commissionPct : undefined;
      const purchaseFee = tradeType === 'Buy' && (assetType === 'Stock' || assetType === 'Bond') ? purchaseFeePct : undefined;
      await onSubmit(value, assetType, identifier, commission, purchaseFee);
      await refreshPortfolio(); // Refresh portfolio data from server
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const labelText = isAmountBased ? "Monto a Invertir" : "Cantidad";
  const inputType = isAmountBased ? "number" : "number";
  const showFees = tradeType === 'Buy' && (assetType === 'Stock' || assetType === 'Bond');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">{tradeTypeText} {assetName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="value" className="block text-sm font-medium text-gray-700">{labelText}</label>
            <input
              id="value"
              type={inputType}
              min="1"
              step="1"
              max={tradeType === 'Sell' ? maxShares : undefined}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          {showFees && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="commission" className="block text-sm font-medium text-gray-700">Comisión (%)</label>
                <input
                  id="commission"
                  type="number"
                  min="0"
                  step="0.01"
                  value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="purchaseFee" className="block text-sm font-medium text-gray-700">Fee de Compra (%)</label>
                <input
                  id="purchaseFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchaseFeePct}
                  onChange={(e) => setPurchaseFeePct(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>
          )}

          <div className="text-sm text-gray-700 space-y-1 mb-4">
            {!isAmountBased && <p>Precio por unidad: <span className="font-semibold text-gray-900">${price.toFixed(2)}</span></p>}
            <p>Costo Base: <span className="font-semibold text-gray-900">${baseCost.toFixed(2)}</span></p>
            {showFees && (
              <>
                <p>Comisión: <span className="font-semibold text-gray-900">${(baseCost * commissionPct / 100).toFixed(2)}</span></p>
                <p>Fee de Compra: <span className="font-semibold text-gray-900">${(baseCost * purchaseFeePct / 100).toFixed(2)}</span></p>
              </>
            )}
            <p className="text-lg font-bold">{tradeType === 'Buy' ? 'Costo Total' : 'Valor Total'}: <span className="font-semibold text-gray-900">${totalCost.toFixed(2)}</span></p>
            {tradeType !== 'Sell' && <p>Efectivo Disponible: <span className="font-semibold text-gray-900">${availableCash.toFixed(2)}</span></p>}
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!!error || loading}
              className={`px-4 py-2 rounded-md text-white ${
                tradeType === 'Sell' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Procesando...' : `Confirmar`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 