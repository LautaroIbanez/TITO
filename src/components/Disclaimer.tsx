'use client';

import { useState } from 'react';

export default function Disclaimer() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 border-t border-yellow-300 p-3 text-center text-sm text-yellow-800 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <span>
          <strong>Aviso:</strong> Esta aplicación es solo para fines educativos y no constituye asesoramiento financiero.
        </span>
        <button 
          onClick={() => setIsVisible(false)} 
          className="ml-4 text-yellow-900 hover:text-yellow-700 font-bold"
          aria-label="Cerrar aviso"
        >
          &times;
        </button>
      </div>
    </div>
  );
} 