'use client';

import React, { useState, useEffect } from 'react';

export type TradeType = 'Buy' | 'Sell' | 'Invest';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: number) => Promise<void>;
  tradeType: TradeType;
  assetName: string;
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
  price = 1, // Default to 1 for amount-based trades
  maxShares = Infinity,
  availableCash = Infinity,
  isAmountBased = false,
}: TradeModalProps) {
  const [value, setValue] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const totalCost = value * price;

  const getTradeTypeText = () => {
    if (tradeType === 'Invest') return 'Invertir en';
    return tradeType === 'Buy' ? 'Comprar' : 'Vender';
  }
  const tradeTypeText = getTradeTypeText();

  useEffect(() => {
    if (isOpen) {
      setValue(isAmountBased ? 50000 : 1); // Start with a default amount or quantity 1
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
      await onSubmit(value);
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

          <div className="text-sm text-gray-700 space-y-1 mb-4">
            {!isAmountBased && <p>Precio por unidad: <span className="font-semibold text-gray-900">${price.toFixed(2)}</span></p>}
            <p>{tradeType === 'Buy' ? 'Costo Total' : 'Valor Total'}: <span className="font-semibold text-gray-900">${totalCost.toFixed(2)}</span></p>
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