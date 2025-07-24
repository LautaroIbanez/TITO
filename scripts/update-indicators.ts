import { fetchEconomicIndicators } from '../src/services/indicators';
import fs from 'fs';
import path from 'path';

async function updateIndicators() {
  try {
    console.log('🔄 Actualizando indicadores económicos...');
    
    const indicators = await fetchEconomicIndicators();
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save indicators to JSON file
    const indicatorsPath = path.join(dataDir, 'indicators.json');
    fs.writeFileSync(indicatorsPath, JSON.stringify(indicators, null, 2));
    
    console.log('✅ Indicadores económicos actualizados exitosamente');
    console.log(`📁 Guardado en: ${indicatorsPath}`);
    console.log(`🕒 Última actualización: ${indicators.lastUpdated}`);
    
    // Log summary
    console.log('\n📊 Resumen de datos:');
    console.log(`📈 Inflación: ${indicators.inflation.data.length} registros`);
    console.log(`💸 Dólares: ${indicators.dollars.data.length} registros`);
    console.log(`🏦 Plazo Fijo: ${indicators.fixedTerm.data.length} bancos`);
    console.log(`💼 Fondos Money Market: ${indicators.mutualFunds.moneyMarket.length} fondos`);
    console.log(`💼 Fondos Renta Fija: ${indicators.mutualFunds.rentaFija.length} fondos`);
    console.log(`💼 Fondos Renta Variable: ${indicators.mutualFunds.rentaVariable.length} fondos`);
    console.log(`💼 Fondos Renta Mixta: ${indicators.mutualFunds.rentaMixta.length} fondos`);
    console.log(`🟣 Otros Fondos: ${indicators.otherFunds.data.length} fondos`);
    
  } catch (error) {
    console.error('❌ Error actualizando indicadores económicos:', error);
    process.exit(1);
  }
}

// Run the update
updateIndicators(); 