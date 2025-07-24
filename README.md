# TITO - Tu Asistente de Inversiones

TITO es una aplicación web construida con Next.js diseñada para ayudarte a gestionar tu portafolio de inversiones, analizar nuevas oportunidades y mantenerte alineado con tus metas financieras.

## Características Principales

- **Gestión de Portafolio**: Visualiza tus posiciones, su valor actual y su rendimiento histórico.
- **Análisis "Scoop"**: Recibe recomendaciones de acciones personalizadas según tu perfil de riesgo.
- **Metas Financieras**: Las metas se gestionan automáticamente según tu perfil de inversión.
- **Manejo de Efectivo**: Deposita fondos y úsalos para comprar activos.
- **Estrategia de Inversión Personalizada**: Recibe una estrategia de asignación de activos y recomendaciones de rebalanceo según tu perfil y metas (ver más abajo).

### Gráfico de Rendimiento Histórico por Categorías

TITO incluye un gráfico interactivo que muestra la evolución histórica del valor de tu portafolio desglosado por categorías de activos. Esta funcionalidad te permite:

- **Visualizar tendencias**: Observa cómo cada categoría (acciones, bonos, depósitos, criptomonedas, cauciones y efectivo) ha evolucionado a lo largo del tiempo
- **Análisis de diversificación**: Identifica qué categorías han contribuido más al crecimiento de tu portafolio
- **Interactividad**: Puedes activar o desactivar categorías específicas haciendo clic en la leyenda del gráfico
- **Múltiples monedas**: Los valores se muestran tanto en pesos argentinos (ARS) como en dólares estadounidenses (USD)
- **Datos en tiempo real**: El gráfico se actualiza automáticamente con cada transacción y cambio en el portafolio

El gráfico está disponible tanto en el dashboard principal como en la página detallada del portafolio, proporcionando una vista completa de la composición y evolución de tus inversiones.

## Lista de Activos

TITO incluye una lista completa de activos organizados por categorías para facilitar el análisis y la diversificación de tu portafolio.

### Categorías de ETFs

- **ETFs**: SPY, DIA, QQQ, EWZ, XLF, XLE, GLD, ARKK, BITO
- **Tecnología**: AAPL, GOOGL, MSFT, ADBE, META
- **Semiconductores**: ASML, TSM, MU, NVDA, AMD, INTC, ARM
- **Comunicaciones**: DIS, NFLX, T, VZ
- **Industriales**: CAT, DE, MMM, TM
- **Defensivas**: KO, PEP, MCD, SBUX, MDLZ
- **Materiales**: NEM, VALE, VIST, OXY
- **Salud**: ABBV, CVS, PFE, PG, UL, JNJ
- **Financieros**: BAC, BRK.B, C, JPM, V, NU
- **Cíclicas**: AMZN, MELI, WMT
- **Merval**: ALUAR, BBAR, BYMA, CAPU, GGAL, LOMA, PAMP, TGNO4, TGSU2, TRAN, YPFD, COME, CRES

### Bonos Soberanos Argentinos

La aplicación también incluye bonos soberanos argentinos:
- **Bonos Soberanos**: AL29D, GD29D, AL30D, GD30D, AE38D, GD38D, AL35D, GD35D, AL41D, GD41D, GD46D

### Actualización de Datos

El comando `npm run update-data` ahora descarga automáticamente datos para todos los tickers definidos en `src/utils/assetCategories.ts`, incluyendo:

- **Precios históricos** de los últimos 5 años
- **Datos fundamentales** (ratios financieros, métricas de rentabilidad)
- **Indicadores técnicos** (RSI, MACD, medias móviles, ADX)

### Compatibilidad con Yahoo Finance

**Importante**: Algunos símbolos argentinos (especialmente los del Merval) pueden no estar disponibles en Yahoo Finance. En estos casos, la aplicación mostrará "Datos no disponibles" en lugar de datos incorrectos o faltantes.

- **Símbolos compatibles**: La mayoría de acciones estadounidenses y algunos ADRs argentinos
- **Símbolos limitados**: Algunos bonos soberanos y acciones del Merval pueden tener datos limitados
- **Manejo de errores**: La aplicación detecta automáticamente símbolos no soportados y muestra advertencias apropiadas

## Estrategia de Inversión y Recomendaciones

TITO genera automáticamente una **estrategia de inversión personalizada** para cada usuario, basada en su perfil de riesgo, horizonte de inversión, nivel de conocimiento y metas financieras.

- La estrategia incluye una **asignación objetivo** de activos (acciones, bonos, depósitos, efectivo) y una lista de **recomendaciones accionables** (por ejemplo: aumentar exposición a acciones, diversificar sectores, mantener más liquidez, etc).
- Estas recomendaciones se muestran en la tarjeta de **Resumen** del dashboard principal (`/dashboard`), junto con un **descargo de responsabilidad** aclarando que no constituyen asesoramiento financiero profesional.
- El sistema ajusta dinámicamente la estrategia si cambias tu perfil, tus metas o tu portafolio.

### Descargo de Responsabilidad en el Dashboard

> Las recomendaciones de estrategia son generadas automáticamente y no constituyen asesoramiento financiero profesional. Consulta siempre con un asesor calificado antes de tomar decisiones de inversión.

## API Endpoints

### Estrategia de Inversión

- **`GET /api/strategy?username={username}`**

Este endpoint calcula y devuelve la estrategia de inversión personalizada para el usuario especificado. La respuesta incluye:

- `targetAllocation`: Porcentaje objetivo para cada clase de activo (acciones, bonos, depósitos, efectivo), siempre sumando exactamente 100%.
- `recommendations`: Lista de recomendaciones accionables para rebalancear o mejorar el portafolio.
- `riskLevel`: Nivel de riesgo del usuario.
- `timeHorizon`: Horizonte de inversión calculado a partir de las metas.
- `notes`: Notas explicativas sobre la estrategia generada.

**Ejemplo de respuesta:**

```json
{
  "id": "strategy-1680000000000",
  "createdAt": "2024-04-01T12:00:00.000Z",
  "targetAllocation": {
    "stocks": 75,
    "bonds": 15,
    "deposits": 5,
    "cash": 5
  },
  "recommendations": [
    {
      "id": "alloc-1680000000000-1",
      "action": "increase",
      "assetClass": "stocks",
      "reason": "Tu portafolio tiene 60% en acciones, pero tu estrategia objetivo es 75%",
      "priority": "high",
      "expectedImpact": "positive"
    }
  ],
  "riskLevel": "Agresivo",
  "timeHorizon": "Largo plazo (> 7 años)",
  "notes": "Estrategia agresiva: busca maximizar retornos asumiendo mayor riesgo. Estrategia alineada con 2 meta(s) de inversión."
}
```

Puedes consultar este endpoint directamente o dejar que el frontend lo consuma automáticamente al cargar el dashboard.

### Datos de Bonos

- **`GET /api/bonds`**

Endpoint principal que devuelve datos de bonos procesados y transformados para el frontend.

- **`GET /api/bonds/raw`**

Endpoint que devuelve los datos raw de bonos directamente desde `data/bonds.json` sin transformación. Útil para debugging o cuando se necesita acceso directo a los datos originales del scraper.

**Ejemplo de respuesta del endpoint raw:**

```json
{
  "bonds": [
    {
      "id": "AL30",
      "ticker": "AL30",
      "name": "Bono AL30",
      "issuer": "Argentina",
      "price": 75930.0,
      "tir": 1311.3706087763877,
      "tna": 1238.5821314373313,
      "currency": "ARS"
    }
  ],
  "lastUpdated": "2024-07-12T11:43:17.123456",
  "source": "bonistas.com",
  "totalBonds": 94
}
```

Los datos de bonos se actualizan automáticamente ejecutando el scraper:

```bash
python3 scripts/scrape_bonistas.py
```

## Cómo Empezar

Sigue estos pasos para levantar el entorno de desarrollo local.

### 1. Instalación

Primero, instala las dependencias del proyecto:

```bash
npm install
```

### 2. Ejecutar la Aplicación

Una vez instaladas las dependencias, inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación en funcionamiento.

## Flujo de la Aplicación

### 1. Iniciar Sesión

Para comenzar, simplemente ingresa un nombre de usuario en la página de login. Si el usuario no existe, se creará uno nuevo automáticamente.

### 2. Completar el Perfil de Inversor

Antes de recibir recomendaciones, debes completar tu perfil de inversor.
- **Ruta**: `/profile`
- **Acción**: Responde el cuestionario para definir tu tolerancia al riesgo, horizonte de inversión y conocimiento del mercado. El **monto de inversión** que ingreses aquí se establecerá como tu capital inicial disponible.

### 3. Depositar Fondos

Puedes agregar más fondos a tu cuenta en cualquier momento desde el dashboard de tu portafolio.
- **Ruta**: `/dashboard/portfolio`
- **Acción**: Ingresa un monto en el campo de depósito y haz clic en "Deposit". Tus saldos de efectivo (`cash`) en ARS y USD se actualizarán según la moneda seleccionada.

### 4. Revisar Recomendaciones "Scoop"

La sección "Scoop" analiza acciones y te sugiere las que mejor se alinean con tu perfil y tus metas financieras.
- **Ruta**: `/dashboard/scoop`
- **Funcionalidad**: Puedes comprar acciones directamente desde las tarjetas de recomendación. El botón de compra se desactivará si no tienes suficiente saldo en la moneda correspondiente (`cash.ARS` o `cash.USD`) para la operación.



## Manejo de Posiciones por Mercado y Moneda

TITO soporta operaciones en múltiples mercados y monedas, permitiendo una gestión diferenciada de posiciones según el mercado de cotización.

### Mercados Soportados

- **NASDAQ**: Mercado estadounidense para acciones en USD
- **BCBA**: Mercado argentino (Buenos Aires) para acciones en ARS (símbolos con sufijo `.BA`)

### Identificación Única de Posiciones

Cada posición se identifica únicamente por la combinación de:
- **Símbolo** (`symbol`): Código de la acción (ej. `AAPL`, `AAPL.BA`)
- **Moneda** (`currency`): Moneda de cotización (`USD` o `ARS`)
- **Mercado** (`market`): Mercado donde cotiza (`NASDAQ` o `BCBA`)

### Ejemplos de Posiciones Diferenciadas

```json
// Posición en NASDAQ (USD)
{
  "type": "Stock",
  "symbol": "AAPL",
  "quantity": 10,
  "averagePrice": 150,
  "currency": "USD",
  "market": "NASDAQ"
}

// Posición en BCBA (ARS) - misma empresa, mercado diferente
{
  "type": "Stock", 
  "symbol": "AAPL.BA",
  "quantity": 100,
  "averagePrice": 150000,
  "currency": "ARS",
  "market": "BCBA"
}
```

### Operaciones de Compra y Venta

- **Compra**: Al comprar una acción, el sistema verifica si ya existe una posición con el mismo `symbol`, `currency` y `market`. Si existe, actualiza la cantidad y precio promedio. Si no existe, crea una nueva posición.
- **Venta**: Al vender, el sistema busca la posición específica usando los tres campos para asegurar que se venda de la posición correcta.
- **Scoop**: En la sección de recomendaciones, se muestran indicadores visuales si ya tienes la acción en USD o ARS, y el botón de compra se deshabilita según el mercado seleccionado.

### Beneficios

- **Diversificación**: Puedes tener la misma empresa en diferentes mercados
- **Gestión de Riesgo**: Manejo independiente de posiciones por moneda
- **Análisis Granular**: Seguimiento separado del rendimiento por mercado
- **Flexibilidad**: Operaciones en la moneda y mercado que prefieras

## Ejecutar Tests

El proyecto incluye tests unitarios para verificar la lógica de negocio crítica, como el manejo de depósitos, compras y ventas.

## Running Tests

Before running tests, make sure to install all dependencies (including dev dependencies) by running:

```
npm install
```

The test suite depends on [Jest](https://jestjs.io/) being available. You can then run the tests with:

```
npm test
```

This will run Jest using the local installation (`node ./node_modules/jest/bin/jest.js`) as specified in the `package.json` scripts.

## Actualización de Datos

La aplicación utiliza datos de mercado (precios históricos, fundamentales y técnicos) que se guardan localmente en el directorio `/data`. Para mantener esta información actualizada, se incluyen scripts que se pueden ejecutar manualmente.

### Actualización de Datos de Acciones

```bash
npm run update-data
```

Este comando descarga automáticamente datos para todos los tickers definidos en `src/utils/assetCategories.ts`, incluyendo todas las categorías de ETFs, acciones y bonos soberanos argentinos. El sistema:

### Actualización de Datos de Bonos

```bash
npm run scrape-bonds
```

Este comando ejecuta el scraper de bonistas.com para obtener datos actualizados de bonos argentinos. Los datos se guardan en `data/bonds.json` y se utilizan como fallback cuando no hay datos de precio histórico disponibles.

**Nota**: El archivo `data/bonds.json` está incluido en `.gitignore` y se genera automáticamente al ejecutar el scraper. Para desarrollo local, ejecuta este comando antes de iniciar la aplicación.

- **Descarga datos completos**: Precios históricos, fundamentales e indicadores técnicos
- **Maneja errores**: Detecta símbolos no soportados en Yahoo Finance y los registra
- **Control de concurrencia**: Procesa múltiples símbolos simultáneamente sin sobrecargar las APIs
- **Reintentos automáticos**: Reintenta operaciones fallidas hasta 3 veces
- **Logging detallado**: Muestra progreso en tiempo real y resumen final

**Nota**: Algunos símbolos argentinos pueden no estar disponibles en Yahoo Finance. En estos casos, el script registrará el error pero continuará procesando los demás símbolos.

### Actualización de Datos de Benchmarks

```bash
npm run update-benchmarks
```

Este comando descarga los rendimientos de 1 año de varios benchmarks importantes:
- **S&P 500** (`^GSPC`)
- **Gold** (`GC=F`)
- **US 10-Year Treasury** (`^TNX`)
- **NASDAQ** (`^IXIC`)
- **Dow Jones** (`^DJI`)
- **Russell 2000** (`^RUT`)
- **VIX** (`^VIX`)
- **Bitcoin** (`BTC-USD`)
- **Ethereum** (`ETH-USD`)
- **US Dollar Index** (`DX-Y.NYB`)

Los datos se guardan en `data/benchmarks.json` con un timestamp y se utilizan para comparar el rendimiento de tu portafolio con estos benchmarks. Si los datos son más antiguos de 1 semana, el sistema automáticamente usará valores por defecto.

### Automatización (Ejemplo con Cron)

Para mantener los datos actualizados de forma automática, puedes configurar tareas programadas (cron jobs) en tu servidor:

#### Actualización Diaria de Datos de Acciones
```cron
0 0 * * * cd /ruta/completa/hacia/el/proyecto/TITO && npm run update-data >> /var/log/tito-updates.log 2>&1
```

#### Actualización Semanal de Benchmarks
```cron
0 0 * * 0 cd /ruta/completa/hacia/el/proyecto/TITO && npm run update-benchmarks >> /var/log/tito-benchmarks.log 2>&1
```

Asegúrate de reemplazar `/ruta/completa/hacia/el/proyecto/TITO` con la ruta real a tu proyecto.

### Características de los Scripts

- **Control de Concurrencia**: Los scripts utilizan `p-limit` para evitar sobrecargar las APIs
- **Manejo de Errores**: Errores individuales no detienen el proceso completo
- **Logging Detallado**: Progreso en tiempo real y resumen final
- **Reintentos Automáticos**: Sistema de reintentos para operaciones fallidas
- **Interrupción Graceful**: Manejo correcto de Ctrl+C y terminación del proceso

### Dynamic Exchange Rate Configuration

TITO now uses a live USD/ARS exchange rate for all currency conversions, fetched from [exchangerate.host](https://exchangerate.host/). The rate is cached in memory for 10 minutes to minimize API calls and ensure performance.

#### How it works
- All currency conversions (e.g., in portfolio value calculations) use the latest USD/ARS rate.
- The rate is fetched automatically from exchangerate.host and cached for 10 minutes.
- If the API is unavailable, a configurable fallback rate is used (default: 1000).

#### Configuration
You can change the fallback rate in `src/utils/currency.ts` by editing:
```ts
const DEFAULT_EXCHANGE_RATE_USD_TO_ARS = 1000;
```

#### Usage in Code
- Use the async functions `getExchangeRate(from, to)` and `convertCurrency(amount, from, to)` for all conversions.
- Example:
  ```ts
  import { getExchangeRate, convertCurrency } from '@/utils/currency';

  const rate = await getExchangeRate('USD', 'ARS');
  const amountInARS = await convertCurrency(100, 'USD', 'ARS');
  ```
- All portfolio calculations (e.g., `calculatePortfolioValueHistory`) now use the dynamic rate.

## Live Data Fetching and Caching

This project now uses live financial data for stocks (and trending stocks) via [yahoo-finance2](https://www.npmjs.com/package/yahoo-finance2), with in-memory caching using [node-cache](https://www.npmjs.com/package/node-cache).

### How it works
- API endpoints under `/api/stocks/`, `/api/stocks/list/`, `/api/scoop/`, and `/api/portfolio/data/` first try to fetch live data from Yahoo Finance.
- Results are cached in memory for 10 minutes to avoid excessive requests and rate limits.
- If the live API fails, the endpoints fall back to the local JSON files under `/data/`.

### Dependencies
- `yahoo-finance2`: For live stock quotes, historical prices, trending stocks, and search.
- `node-cache`: For in-memory caching of API responses.

### Example
If you request `/api/stocks/AAPL`, the server will:
1. Try to fetch the latest data for AAPL from Yahoo Finance and cache it.
2. If Yahoo Finance is unavailable, it will return the last saved data from `data/stocks/AAPL.json`.

## Descargo de Responsabilidad

TITO es un proyecto con fines exclusivamente educativos y de demostración. La información y las recomendaciones proporcionadas por esta aplicación no deben considerarse como asesoramiento financiero profesional. Realiza tu propia investigación y/o consulta a un asesor financiero calificado antes de tomar cualquier decisión de inversión.

## Endpoints de la API

A continuación se describen los principales endpoints de la API REST del proyecto.

### Autenticación y Perfil
*   `POST /api/login`: Autentica a un usuario.
*   `GET /api/profile?username={username}`: Obtiene el perfil de un usuario.

### Portafolio
*   `GET /api/portfolio/data?username={username}`: Obtiene todos los datos del portafolio del usuario, incluyendo posiciones, historial de transacciones, valores calculados y precios históricos de las acciones.
*   `POST /api/portfolio/buy`: Compra un activo (acción, bono, etc.).
*   `POST /api/portfolio/sell`: Vende un activo.
*   `POST /api/portfolio/remove`: Elimina un activo del portafolio.
*   `POST /api/portfolio/deposit`: Realiza un depósito de efectivo en la cuenta.

### Datos de Mercado
*   `GET /api/stocks/list`: Obtiene la lista completa de símbolos de acciones disponibles.
*   `GET /api/stocks/{symbol}`: Obtiene un resumen completo de la cotización de una acción.
    *   `GET /api/stocks/{symbol}?type=fundamentals`: Obtiene solo los datos fundamentales.
    -   `GET /api/stocks/{symbol}?type=technicals`: Obtiene solo los indicadores técnicos.
    -   `GET /api/stocks/{symbol}?type=prices`: Obtiene el historial de precios de los últimos 90 días.
*   `GET /api/scoop`: Obtiene la lista de acciones que son tendencia en el mercado (EEUU).
*   `GET /api/bonds`: Obtiene la lista de bonos disponibles.
*   `GET /api/deposits`: Obtiene la lista de depósitos a plazo fijo disponibles.

### Metas Financieras
*   Las metas se gestionan automáticamente según el perfil de inversión del usuario.

## Updating Inflation Data

To fetch and update the latest inflation data for Argentina and the U.S. (from INDEC/BCRA and FRED), run:

```
npm run update-inflation
```

This will update `data/inflation.json` with the latest monthly and annual inflation rates.

> Note: You may need to set a FRED API key in the environment as `FRED_API_KEY` for more reliable U.S. data fetching, or the script will use a public CSV fallback.

## Daily Portfolio Snapshots

To generate daily portfolio snapshots for all users, run:

```
npm run daily-snapshot
```

This script will:
1. Read all usernames from `data/users/` directory
2. Calculate current portfolio values, invested capital, and net gains for each user
3. Save daily snapshots to `data/history/<username>.json` if no record exists for today
4. Mark snapshots as incomplete if any metrics couldn't be computed due to missing price data

### Scheduling Daily Snapshots

You can schedule this script to run automatically using cron (Linux/macOS) or Task Scheduler (Windows):

**Linux/macOS (cron):**
```bash
# Add to crontab to run daily at 6:00 AM
0 6 * * * cd /path/to/tito && npm run daily-snapshot
```

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create a new Basic Task
3. Set trigger to Daily at 6:00 AM
4. Set action to start a program: `npm`
5. Add arguments: `run daily-snapshot`
6. Set start in: `/path/to/tito`

### CI/CD Integration

For automated deployments, you can add this to your CI pipeline:

```yaml
# Example GitHub Actions workflow
- name: Generate Daily Snapshots
  run: npm run daily-snapshot
  if: github.event_name == 'schedule' && github.event.schedule == '0 6 * * *'
```

The snapshots are used by the Historical Portfolio Chart component to display portfolio performance over time.

## Crypto Data Update Script

To fetch and update recent price data for major cryptocurrencies (BTC, ETH, etc.) from Binance and store it under `data/crypto/`, run:

```
npm run update-crypto
```

Or directly:

```
npx ts-node scripts/update-crypto.ts
```

This will download daily price history for the following symbols:
- BTCUSDT
- ETHUSDT
- BNBUSDT
- SOLUSDT
- ADAUSDT
- MATICUSDT
- DOGEUSDT

The data is saved as JSON files in `data/crypto/` (e.g., `data/crypto/BTCUSDT.json`).

## Portfolio Gains Calculation

TITO uses a cumulative daily differences approach for calculating portfolio gains, implemented through the `calculateCumulativeNetGains` function in `src/utils/netGainsCalculator.ts`. This approach ensures consistency across all components and provides accurate historical gain tracking.

### How Gains Are Calculated

The system calculates gains using the following approach:

1. **Daily Portfolio Records**: Each day's portfolio value is recorded in `DailyPortfolioRecord` format
2. **Cumulative Differences**: Gains are calculated as the sum of daily differences in `total_portfolio_ars` and `total_portfolio_usd` between consecutive days
3. **Historical Consistency**: Each record stores cumulative gains up to that point in time
4. **Position-Level Details**: Individual position gains are still calculated using `getPortfolioNetGains` for detailed analysis

### Cumulative Calculation Formula

```typescript
// For each consecutive pair of days (i, i+1):
dailyGainARS = day[i+1].total_portfolio_ars - day[i].total_portfolio_ars
dailyGainUSD = day[i+1].total_portfolio_usd - day[i].total_portfolio_usd

// Cumulative gains are the sum of all daily gains
cumulativeGainsARS = sum(dailyGainARS for all days)
cumulativeGainsUSD = sum(dailyGainUSD for all days)
```

### Components Using the Same Calculation

All components now use the cumulative approach for consistency:

- **DashboardSummary**: Displays cumulative gains from portfolio history
- **PortfolioTable**: Shows individual position gains using `getPortfolioNetGains`
- **HistoricalPortfolioChart**: Uses cumulative gains for chart datasets
- **PortfolioCategoryChart**: Uses cumulative gains for category analysis

### Migration from Previous System

The system has been migrated from the simple `total - invested` formula to the cumulative approach. A migration script is available:

```bash
npx tsx scripts/migrate-net-gains.ts
```

This script updates all existing portfolio history files to use the new calculation method.

### Position Exclusion Handling

Positions are excluded from gain calculations when:
- No price data is available for the symbol
- Current prices are zero or invalid
- Purchase prices are not finite (NaN, Infinity)
- Position type is not supported

Excluded positions are clearly marked in the UI and don't contribute to total gains.

### Benefits of Cumulative Approach

1. **Historical Accuracy**: Gains reflect actual daily portfolio value changes
2. **Consistency**: All components use the same calculation method
3. **Chart Alignment**: Dashboard gains match chart datasets exactly
4. **Data Integrity**: Eliminates discrepancies between different calculation methods

## Crypto Currency Conversion

TITO supports purchasing cryptocurrencies using either USD or ARS. When ARS is selected for crypto purchases, the system automatically converts the ARS amount to USD using the current exchange rate.

### How it works

- **Currency Selection**: Users can choose between USD and ARS when buying cryptocurrencies
- **Automatic Conversion**: When ARS is selected, the system:
  - Deducts the ARS amount from the user's ARS balance
  - Converts the ARS amount to USD using the current exchange rate
  - Records the crypto position in USD (crypto positions are always denominated in USD)
  - Stores conversion details in the transaction history for transparency

### Fractional Quantities

Cryptocurrencies support fractional quantities with precision up to 6 decimal places (0.000001):
- **Minimum quantity**: 0.000001 units
- **Step increment**: 0.000001 units
- **Examples**: You can buy 0.5 BTC, 0.001 ETH, or 0.000001 of any cryptocurrency
- **Other assets**: Stocks and bonds still use whole number quantities (minimum 1 unit)

### Transaction Tracking

Crypto transactions include conversion information when ARS is used:
- `originalCurrency`: 'ARS' (when applicable)
- `originalAmount`: The ARS amount deducted
- `convertedAmount`: The USD equivalent used for the crypto position

### Exchange Rate

The conversion uses the same dynamic exchange rate system as other currency conversions in TITO, fetched from [exchangerate.host](https://exchangerate.host/) and cached for 10 minutes.

### Example

If a user buys 0.1 BTC at $50,000 USD using ARS:
- ARS balance is reduced by the equivalent ARS amount
- USD equivalent is calculated using current exchange rate
- Crypto position shows 0.1 BTC at $50,000 USD
- Transaction history includes both ARS deduction and USD conversion details

## Refreshing Caución Data

To manually refresh the caución (repo) rates used by the app, run the following script:

```bash
node scripts/update-cauciones.ts
```

This script fetches the latest caución rates from official sources (BYMA, BCRA) and updates `data/cauciones.json` with the new rates and timestamp. The API and UI will automatically use the latest data after this update.

**When to run this script:**
- If you want to ensure the app displays the most up-to-date caución rates.
- If you suspect the rates are stale or outdated.
- The API will also attempt to auto-refresh if the data is older than 2 hours, but you can run this manually for immediate updates.

## Project Structure

```
TITO/
├── src/
│   ├── app/           # Next.js app directory (pages, API routes, dashboard, etc.)
│   ├── components/    # Reusable React components
│   ├── contexts/      # React context providers (e.g., PortfolioContext)
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions (data, finance, tickers, etc.)
│
├── data/              # User data, market data, fundamentals, technicals, etc. (JSON files)
├── scripts/           # Data update and ETL scripts (Node/TypeScript)
├── public/            # Static assets (SVGs, images)
├── README.md          # Project documentation
├── package.json       # Project dependencies and scripts
├── ...
```

### Key Modules
- **Contexts**: State management for portfolio, scoop, etc. (see `src/contexts/`)
- **API Routes**: All backend endpoints are in `src/app/api/`. Each resource (e.g., `/portfolio`, `/login`) has its own folder and `route.ts` file.
- **Utility Functions**: Shared helpers for data access, calculations, and formatting (see `src/utils/`).
- **Execution Flow**: User interacts with the UI (`src/app`), which calls API routes (`src/app/api/**`). API routes read/write data from `data/` using utilities in `src/utils/`.

## Adding New Pages or API Endpoints
- **Pages**: Add a new folder with a `page.tsx` file under `src/app/` (e.g., `src/app/new-feature/page.tsx`).
- **API Endpoints**: Add a new folder with a `route.ts` file under `src/app/api/` (e.g., `src/app/api/new-endpoint/route.ts`).
- Use TypeScript for all new files. Follow the existing folder and naming conventions.

## Running Unit Tests
Before running tests, make sure to install all dependencies (including dev dependencies) by running:

```
npm install
```

The test suite depends on [Jest](https://jestjs.io/) being available. You can then run the tests with:

```
npm test
```

## Environment Variables

### NEXT_PUBLIC_USE_MOCK_INDICATORS

Controls whether the Economic Indicators component uses mock data or real API data.

- **`true`**: Uses mock data for development/testing purposes
- **`false`** or **undefined**: Uses real API data from external sources

**Usage:**
```bash
# For development with mock data
NEXT_PUBLIC_USE_MOCK_INDICATORS=true npm run dev

# For production with real data
NEXT_PUBLIC_USE_MOCK_INDICATORS=false npm run dev
```

**Note:** This variable affects the `/api/indicators` endpoint behavior. When set to `true`, the endpoint will return mock data regardless of the `?mock=true` query parameter.

## Contributing
- Use TypeScript for all code.
- Follow the existing code style; ESLint is used for linting (run `npx eslint .` to check).
- Propose changes via pull requests. Include a clear description and reference related issues if applicable.
- Run `npm test` before submitting to ensure all tests pass.
