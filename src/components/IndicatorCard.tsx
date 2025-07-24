'use client';
import { ReactNode } from 'react';

interface IndicatorCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variation?: number;
  variationLabel?: string;
  icon?: ReactNode;
  color?: 'red' | 'green' | 'blue' | 'orange' | 'purple' | 'gray';
  children?: ReactNode;
}

export default function IndicatorCard({ 
  title, 
  value, 
  subtitle, 
  variation, 
  variationLabel,
  icon,
  color = 'blue',
  children 
}: IndicatorCardProps) {
  const colorClasses = {
    red: 'border-red-500 bg-red-50',
    green: 'border-green-500 bg-green-50',
    blue: 'border-blue-500 bg-blue-50',
    orange: 'border-orange-500 bg-orange-50',
    purple: 'border-purple-500 bg-purple-50',
    gray: 'border-gray-500 bg-gray-50',
  };

  const variationColor = variation !== undefined 
    ? (variation >= 0 ? 'text-green-600' : 'text-red-600')
    : 'text-gray-600';

  return (
    <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon && <div className="text-gray-500">{icon}</div>}
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-gray-900">
              {typeof value === 'number' ? value.toFixed(2) : value}
            </p>
            
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
            
            {variation !== undefined && (
              <div className="flex items-center gap-1">
                <span className={`text-sm font-medium ${variationColor}`}>
                  {variation >= 0 ? '+' : ''}{variation.toFixed(2)}%
                </span>
                {variationLabel && (
                  <span className="text-xs text-gray-500">({variationLabel})</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
} 