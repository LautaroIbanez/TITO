#!/usr/bin/env ts-node

import { cafciCache } from '../src/server/cafci/cache';

async function main() {
  try {
    console.log('🔄 Iniciando actualización de datos CAFCI...');
    await cafciCache.forceUpdate();
    console.log('✅ Actualización de CAFCI completada exitosamente');
  } catch (error) {
    console.error('❌ Error durante la actualización de CAFCI:', error);
    process.exit(1);
  }
}

main();







