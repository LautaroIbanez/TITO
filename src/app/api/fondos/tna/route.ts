import { NextRequest, NextResponse } from 'next/server';
import { cafciCache } from '@/server/cafci/cache';

/**
 * GET /api/fondos/tna
 * Endpoint para obtener datos de TNA y rendimiento de fondos CAFCI
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('categoria');
    const search = searchParams.get('search');
    const forceUpdate = searchParams.get('force') === 'true';

    // Forzar actualización si se solicita
    if (forceUpdate) {
      await cafciCache.forceUpdate();
    }

    let data;

    // Filtrar por categoría si se especifica
    if (category) {
      data = await cafciCache.getFundDataByCategory(category);
    }
    // Buscar por nombre si se especifica
    else if (search) {
      const fund = await cafciCache.findFund(search);
      data = fund ? [fund] : [];
    }
    // Obtener todos los datos
    else {
      data = await cafciCache.getFundData();
    }

    // Obtener estadísticas del caché
    const stats = await cafciCache.getCacheStats();

    // Preparar respuesta
    const response = {
      success: true,
      data,
      stats: {
        totalFunds: data.length,
        lastUpdate: stats.lastUpdate,
        cacheAge: stats.cacheAge,
        isValid: stats.isValid
      },
      timestamp: new Date().toISOString()
    };

    // Configurar headers de caché (5 minutos)
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    return NextResponse.json(response, { 
      status: 200,
      headers
    });

  } catch (error) {
    console.error('❌ Error en endpoint /api/fondos/tna:', error);

    // Respuesta de error
    const errorResponse = {
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * OPTIONS /api/fondos/tna
 * Manejo de CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}






