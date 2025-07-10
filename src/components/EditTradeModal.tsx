import React, { useState, useEffect } from 'react';
import { PortfolioTransaction } from '@/types';

interface Props {
  transaction: PortfolioTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (transaction: PortfolioTransaction) => Promise<void>;
  error: string | null;
}

export default function EditTradeModal({ transaction, isOpen, onClose, onUpdate, error }: Props) {
  const [commissionPct, setCommissionPct] = useState<number>(0);
  const [purchaseFeePct, setPurchaseFeePct] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (transaction && (transaction.type === 'Buy' || transaction.type === 'Sell')) {
      setCommissionPct(transaction.commissionPct || 0);
      setPurchaseFeePct(transaction.purchaseFeePct || 0);
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    setIsSubmitting(true);
    try {
      const updatedTransaction = {
        ...transaction,
        commissionPct: commissionPct > 0 ? commissionPct : undefined,
        purchaseFeePct: purchaseFeePct > 0 ? purchaseFeePct : undefined,
      };
      await onUpdate(updatedTransaction);
      onClose();
    } catch (err) {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !transaction || (transaction.type !== 'Buy' && transaction.type !== 'Sell')) {
    return null;
  }

  const isTrade = transaction.type === 'Buy' || transaction.type === 'Sell';
  const assetName = 'symbol' in transaction ? transaction.symbol : 'ticker' in transaction ? transaction.ticker : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Editar Comisiones - {transaction.type === 'Buy' ? 'Compra' : 'Venta'} de {assetName}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comisión (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={commissionPct}
              onChange={(e) => setCommissionPct(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fee de Compra (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={purchaseFeePct}
              onChange={(e) => setPurchaseFeePct(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 