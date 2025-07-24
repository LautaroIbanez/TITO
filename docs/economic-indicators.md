# Indicadores Económicos Argentina

Este módulo integra indicadores macroeconómicos de Argentina en la aplicación TITO, mostrándolos en la pestaña 'Resumen' de forma clara y organizada.

## 📊 Indicadores Incluidos

### 1. 📈 Inflación Mensual
- **Fuente**: API Argentina Datos
- **Datos**: Últimos 12 meses
- **Visualización**: Gráfico de línea con fechas e inflación porcentual
- **Métricas**: Último valor, valor anterior, variación mensual

### 2. 💸 Cotización del Dólar
- **Fuente**: API Argentina Datos
- **Tipos**: Oficial, Blue, Bolsa, Contado con Liqui
- **Datos**: Últimos 30 días
- **Visualización**: Gráfico comparativo y tarjetas individuales
- **Métricas**: Precio de compra/venta, variación diaria

### 3. 🏦 Tasa Nominal Anual (TNA) - Plazo Fijo
- **Fuente**: API Argentina Datos
- **Entidades**: Top 15 bancos principales
- **Visualización**: Gráfico de barras horizontal
- **Métricas**: TNA para clientes y no clientes

### 4. 💼 Fondos Comunes de Inversión
- **Fuente**: API CAFCI
- **Categorías**: Money Market, Renta Fija, Renta Variable, Renta Mixta
- **Visualización**: Tarjetas por categoría con comparación TNA vs Rendimiento mensual
- **Fondos incluidos**: 8 Money Market, 4 Renta Fija, 4 Renta Variable, 6 Renta Mixta

### 5. 🟣 Otros Fondos por TNA
- **Fuente**: API Argentina Datos
- **Visualización**: Top 10 fondos con mayor TNA
- **Métricas**: TNA y categoría

## 🛠 Arquitectura Técnica

### Estructura de Archivos
```
src/
├── types/
│   └── indicators.ts          # Tipos TypeScript para indicadores
├── services/
│   └── indicators.ts          # Servicio para obtener datos
├── components/
│   ├── EconomicIndicators.tsx # Componente principal
│   ├── LineChart.tsx          # Gráfico de línea reutilizable
│   ├── BarChart.tsx           # Gráfico de barras reutilizable
│   └── IndicatorCard.tsx      # Tarjeta de indicador reutilizable
└── app/
    └── api/
        └── indicators/
            └── route.ts       # Endpoint API
```

### APIs Utilizadas
- **Argentina Datos**: https://api.argentinadatos.com/
- **CAFCI**: https://api.cafci.org.ar/

## 🚀 Uso

### Desarrollo
```bash
# Usar datos mock (recomendado para desarrollo)
npm run dev
```

### Producción
```bash
# Actualizar indicadores reales
npm run update-indicators

# Iniciar aplicación
npm run build
npm start
```

### Scripts Disponibles
```bash
# Actualizar indicadores económicos
npm run update-indicators

# Ejecutar con datos mock
curl http://localhost:3000/api/indicators?mock=true

# Ejecutar con datos reales
curl http://localhost:3000/api/indicators
```

## 📱 Interfaz de Usuario

### Tabs Disponibles
1. **📈 Inflación**: Gráfico de línea + métricas resumen
2. **💸 Dólar**: Comparación de tipos + gráfico temporal
3. **🏦 Plazo Fijo**: Top 10 bancos + métricas promedio
4. **💼 Fondos Comunes**: 4 categorías con fondos detallados
5. **🟣 Otros Fondos**: Top 10 fondos por TNA

### Características de UX
- ✅ Diseño responsivo
- ✅ Carga asíncrona con estados de loading
- ✅ Manejo de errores con fallback a datos mock
- ✅ Gráficos interactivos con tooltips
- ✅ Colores consistentes con el tema de la app
- ✅ Actualización automática de datos

## 🔧 Configuración

### Variables de Entorno
```env
# Para desarrollo (usar datos mock)
NEXT_PUBLIC_USE_MOCK_INDICATORS=true

# Para producción (usar datos reales)
NEXT_PUBLIC_USE_MOCK_INDICATORS=false
```

### Personalización de Fondos
Los fondos mutuos se configuran en `src/services/indicators.ts`:
```typescript
const MUTUAL_FUNDS = {
  moneyMarket: {
    "Nombre del Fondo": { fondoId: 1234, claseId: 5678 },
    // ... más fondos
  },
  // ... más categorías
};
```

## 📈 Actualización de Datos

### Frecuencia Recomendada
- **Inflación**: Mensual (cuando se publican los datos del INDEC)
- **Dólar**: Diario (datos en tiempo real)
- **Plazo Fijo**: Semanal (las tasas cambian con frecuencia)
- **Fondos Comunes**: Semanal (los rendimientos se actualizan regularmente)

### Automatización
```bash
# Agregar al cron para actualización automática
0 9 * * * cd /path/to/tito && npm run update-indicators
```

## 🐛 Troubleshooting

### Problemas Comunes

1. **Error de CORS con APIs externas**
   - Solución: Usar proxy en Next.js o configurar CORS en el servidor

2. **Límites de rate limiting**
   - Solución: Implementar delays entre requests (ya incluido)

3. **Datos faltantes de CAFCI**
   - Solución: Fallback a datos mock automático

4. **Gráficos no se renderizan**
   - Verificar que Chart.js esté instalado: `npm install chart.js`

### Logs de Debug
```bash
# Ver logs detallados
DEBUG=indicators npm run dev

# Ver errores de API
curl -v http://localhost:3000/api/indicators
```

## 🔮 Próximas Mejoras

- [ ] Cache de datos con Redis
- [ ] Notificaciones de cambios significativos
- [ ] Exportación de datos a CSV/PDF
- [ ] Comparación histórica de indicadores
- [ ] Alertas personalizables por usuario
- [ ] Integración con más fuentes de datos
- [ ] Gráficos más avanzados (candlestick, heatmaps)

## 📝 Notas de Desarrollo

- Los datos mock están en `data/indicators.json`
- El servicio maneja automáticamente fallbacks a datos mock
- Los gráficos usan Chart.js con configuración responsive
- La UI sigue el diseño system de TITO
- Todos los componentes son reutilizables y testeados 