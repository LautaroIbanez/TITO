'use client';

import React, { useState, useEffect } from 'react';

export type TradeType = 'Buy' | 'Sell';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => Promise<void>;
  tradeType: TradeType;
  symbol: string;
  price: number;
  maxShares?: number; // For selling
  availableCash?: number; // For buying
}

export default function TradeModal({
  isOpen,
  onClose,
  onSubmit,
  tradeType,
  symbol,
  price,
  maxShares = Infinity,
  availableCash = Infinity,
}: TradeModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const totalCost = quantity * price;
  const tradeTypeText = tradeType === 'Buy' ? 'Compra' : 'Venta';

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setQuantity(1);
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Validate quantity
    setError('');
    if (quantity <= 0) {
      setError('La cantidad debe ser mayor a cero.');
    } else if (tradeType === 'Buy' && totalCost > availableCash) {
      setError('Fondos insuficientes.');
    } else if (tradeType === 'Sell' && quantity > maxShares) {
      setError(`Solo puedes vender hasta ${maxShares} acciones.`);
    }
  }, [quantity, totalCost, availableCash, maxShares, tradeType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (error || loading) return;

    setLoading(true);
    await onSubmit(quantity);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">{tradeTypeText} {symbol}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Cantidad</label>
            <input
              id="quantity"
              type="number"
              min="1"
              step="1"
              max={tradeType === 'Sell' ? maxShares : undefined}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div className="text-sm text-gray-700 space-y-1 mb-4">
            <p>Precio Actual: <span className="font-semibold text-gray-900">${price.toFixed(2)}</span></p>
            <p>{tradeType === 'Buy' ? 'Costo Total' : 'Ingreso Total'}: <span className="font-semibold text-gray-900">${totalCost.toFixed(2)}</span></p>
            {tradeType === 'Buy' && <p>Efectivo Disponible: <span className="font-semibold text-gray-900">${availableCash.toFixed(2)}</span></p>}
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
                tradeType === 'Buy' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Procesando...' : `Confirmar ${tradeTypeText}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 