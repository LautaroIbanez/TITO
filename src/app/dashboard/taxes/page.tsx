'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TaxSimulation {
  grossReturn: number;
  taxRate: number;
  netReturn: number;
}

const TaxAlert = () => (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
    <div className="flex">
      <div className="flex-shrink-0">
        <span className="text-yellow-400 text-xl">⚠️</span>
      </div>
      <div className="ml-3">
        <p className="text-sm text-yellow-700">
          Esta información es solo una guía general. Para decisiones importantes,
          consultá con un profesional impositivo calificado.
        </p>
      </div>
    </div>
  </div>
);

const CountrySection = ({ country, children }: { country: '🇦🇷' | '🇺🇸'; children: React.ReactNode }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
      {country === '🇦🇷' ? (
        <>
          <span className="text-2xl">🇦🇷</span>
          <span>Argentina</span>
        </>
      ) : (
        <>
          <span className="text-2xl">🇺🇸</span>
          <span>Estados Unidos</span>
        </>
      )}
    </h2>
    <div className="space-y-3 text-gray-600">
      {children}
    </div>
  </div>
);

const TaxSimulator = ({ portfolioReturn = 10 }: { portfolioReturn?: number }) => {
  const [taxRate, setTaxRate] = useState(15);
  const [isExporting, setIsExporting] = useState(false);
  const simulatorRef = useRef<HTMLDivElement>(null);
  const netReturn = portfolioReturn * (1 - taxRate / 100);

  const handleExportPDF = async () => {
    if (!simulatorRef.current) return;
    
    setIsExporting(true);
    try {
      // Capture the simulator content as canvas
      const canvas = await html2canvas(simulatorRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190; // Slightly smaller for better margins
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add header with logo and title
      pdf.setFontSize(24);
      pdf.setTextColor(0, 0, 139); // Dark blue
      pdf.text('TITO Finance', 20, 20);
      
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Simulación de Impacto Impositivo', 20, 35);

      // Add metadata
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      const currentDate = new Date().toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Fecha de generación: ${currentDate}`, 20, 45);

      // Add summary before the screenshot
      pdf.setFontSize(14);
      pdf.setTextColor(0);
      pdf.text('Resumen de la simulación:', 20, 60);
      
      pdf.setFontSize(12);
      pdf.text([
        `• Rentabilidad bruta: ${portfolioReturn.toFixed(2)}%`,
        `• Alícuota impositiva: ${taxRate}%`,
        `• Rentabilidad neta: ${netReturn.toFixed(2)}%`,
        `• Impacto fiscal: ${(portfolioReturn - netReturn).toFixed(2)}%`
      ], 25, 70);

      // Add the simulator screenshot
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 100, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 100); // Adjust for the header content

      // Add new pages if content is too long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Add footer with disclaimer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text(
          'Este documento es solo informativo. Consulte con un profesional para tomar decisiones financieras.',
          20,
          285
        );
        pdf.text(`Página ${i} de ${pageCount}`, 180, 285);
      }

      // Save the PDF
      const fileName = `simulacion-impositiva-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Inténtalo de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div ref={simulatorRef} className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Simulador de Impacto Impositivo</h2>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Rentabilidad Bruta</div>
            <div className="text-2xl font-semibold text-gray-900">{portfolioReturn.toFixed(2)}%</div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Alícuota Impositiva</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-20 text-2xl font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-2xl font-semibold text-gray-900">%</span>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Rentabilidad Neta</div>
            <div className="text-2xl font-semibold text-blue-600">{netReturn.toFixed(2)}%</div>
          </div>
        </div>

        <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(netReturn / portfolioReturn) * 100}%` }}
          />
        </div>

        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="mt-4 px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isExporting ? '⏳' : '📄'}</span> 
          {isExporting ? 'Generando PDF...' : 'Descargar informe PDF'}
        </button>
      </div>
    </div>
  );
};

export default function TaxesPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Aspectos Impositivos
      </h1>

      <TaxAlert />

      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <p className="text-lg text-gray-600">
          Cuando obtenés una ganancia al vender una acción o cobrás dividendos, 
          podrías estar alcanzado por impuestos. Conocer cómo funciona esto te 
          ayuda a tomar mejores decisiones.
        </p>
      </div>

      <CountrySection country="🇦🇷">
        <p>Las acciones que cotizan en mercados locales (BYMA) están exentas de impuesto a las ganancias.</p>
        <p>Las acciones extranjeras (ej: AAPL, MSFT) pagan 15% sobre la ganancia neta.</p>
        <p>Dividendos distribuidos por empresas extranjeras están alcanzados por una retención en origen.</p>
      </CountrySection>

      <CountrySection country="🇺🇸">
        <p>Capital gains se pagan sobre la diferencia entre compra y venta (a corto o largo plazo).</p>
        <p>Dividendos calificados tienen una alícuota más baja.</p>
        <p>Para no residentes, la tasa de retención sobre dividendos es generalmente del 30%.</p>
      </CountrySection>

      <TaxSimulator />
    </div>
  );
} 