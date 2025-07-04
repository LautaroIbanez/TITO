'use client';

import { useState, useEffect } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { RealEstatePosition } from '@/types';

interface RealEstateFormData {
  name: string;
  amount: number;
  annualRate: number;
  currency: 'ARS' | 'USD';
}

export default function RealEstatePage() {
  const { portfolioData, refreshPortfolio } = usePortfolio();
  const [realEstatePositions, setRealEstatePositions] = useState<RealEstatePosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState<RealEstatePosition | null>(null);
  const [formData, setFormData] = useState<RealEstateFormData>({
    name: '',
    amount: 0,
    annualRate: 0,
    currency: 'ARS'
  });

  useEffect(() => {
    if (portfolioData?.username) {
      fetchRealEstatePositions();
    }
  }, [portfolioData?.username]);

  const fetchRealEstatePositions = async () => {
    if (!portfolioData?.username) return;
    
    try {
      const response = await fetch(`/api/portfolio/real-estate?username=${portfolioData.username}`);
      if (response.ok) {
        const data = await response.json();
        setRealEstatePositions(data.positions || []);
      }
    } catch (error) {
      console.error('Error fetching real estate positions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioData?.username) return;

    try {
      const url = editingPosition 
        ? `/api/portfolio/real-estate/${editingPosition.id}`
        : '/api/portfolio/real-estate';
      
      const method = editingPosition ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: portfolioData.username,
          ...formData
        }),
      });

      if (response.ok) {
        await fetchRealEstatePositions();
        await refreshPortfolio();
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving real estate position:', error);
      alert('Error saving real estate position');
    }
  };

  const handleDelete = async (positionId: string) => {
    if (!portfolioData?.username || !confirm('¿Estás seguro de que quieres eliminar esta posición?')) return;

    try {
      const response = await fetch(`/api/portfolio/real-estate/${positionId}?username=${portfolioData.username}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchRealEstatePositions();
        await refreshPortfolio();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting real estate position:', error);
      alert('Error deleting real estate position');
    }
  };

  const handleEdit = (position: RealEstatePosition) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      amount: position.amount,
      annualRate: position.annualRate,
      currency: position.currency
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: 0,
      annualRate: 0,
      currency: 'ARS'
    });
    setEditingPosition(null);
    setShowForm(false);
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bienes Raíces</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Agregar Propiedad
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">
            {editingPosition ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de la Propiedad</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valor (ARS/USD)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full p-2 border rounded"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tasa de Apreciación Anual (%)</label>
              <input
                type="number"
                value={formData.annualRate}
                onChange={(e) => setFormData({ ...formData, annualRate: Number(e.target.value) })}
                className="w-full p-2 border rounded"
                min="0"
                max="100"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Moneda</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'ARS' | 'USD' })}
                className="w-full p-2 border rounded"
                required
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {editingPosition ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {realEstatePositions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay propiedades registradas
          </div>
        ) : (
          realEstatePositions.map((position) => (
            <div key={position.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{position.name}</h3>
                  <p className="text-gray-600">
                    Valor: {position.currency} {position.amount.toLocaleString()}
                  </p>
                  <p className="text-gray-600">
                    Apreciación anual: {position.annualRate}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(position)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(position.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 