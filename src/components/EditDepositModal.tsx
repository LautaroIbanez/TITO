'use client';
import { useState, useEffect } from 'react';
import { DepositTransaction } from '@/types';

interface Props {
  deposit: DepositTransaction;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (deposit: DepositTransaction) => void;
  error: string | null;
}

export default function EditDepositModal({ deposit, isOpen, onClose, onUpdate, error }: Props) {
  const [formData, setFormData] = useState<DepositTransaction>(deposit);

  useEffect(() => {
    setFormData(deposit);
  }, [deposit]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Editar Depósito</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Fecha</label>
            <input
              id="date"
              name="date"
              type="date"
              value={new Date(formData.date).toISOString().split('T')[0]}
              onChange={handleChange}
              className="p-2 mt-1 border rounded text-gray-900 w-full"
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Monto</label>
            <input
              id="amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              className="p-2 mt-1 border rounded text-gray-900 w-full"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 