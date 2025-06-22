# TITO - Tu Asistente de Inversiones

TITO es una aplicación web construida con Next.js diseñada para ayudarte a gestionar tu portafolio de inversiones, analizar nuevas oportunidades y mantenerte alineado con tus metas financieras.

## Características Principales

- **Gestión de Portafolio**: Visualiza tus posiciones, su valor actual y su rendimiento histórico.
- **Análisis "Scoop"**: Recibe recomendaciones de acciones personalizadas según tu perfil de riesgo.
- **Metas Financieras**: Define metas de inversión y sigue tu progreso para alcanzarlas.
- **Simulador de Impuestos**: Estima el impacto fiscal de tus ganancias de capital.
- **Manejo de Efectivo**: Deposita fondos y úsalos para comprar activos.

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
- **Acción**: Ingresa un monto en el campo de depósito y haz clic en "Deposit". Tu saldo de `availableCash` se actualizará.

### 4. Revisar Recomendaciones "Scoop"

La sección "Scoop" analiza acciones y te sugiere las que mejor se alinean con tu perfil y tus metas financieras.
- **Ruta**: `/dashboard/scoop`
- **Funcionalidad**: Puedes comprar acciones directamente desde las tarjetas de recomendación. El botón de compra se desactivará si no tienes suficiente efectivo (`availableCash`) para la operación.

### 5. Monitorear Metas e Impuestos

- **Metas**: En `/dashboard/goals`, puedes crear metas de inversión (ej. "Comprar un auto") y visualizar cómo tu portafolio actual te ayuda a progresar hacia ellas.
- **Impuestos**: En `/dashboard/taxes`, puedes simular la venta de tus posiciones para estimar el impuesto a las ganancias de capital que tendrías que pagar.

## Ejecutar Tests

El proyecto incluye tests unitarios para verificar la lógica de negocio crítica, como el manejo de depósitos, compras y ventas.

Para ejecutar los tests, usa el siguiente comando:

```bash
npm test
```

## Actualización de Datos

La aplicación utiliza datos de mercado (precios históricos, fundamentales y técnicos) que se guardan localmente en el directorio `/data`. Para mantener esta información actualizada, se incluye un script que se puede ejecutar manualmente.

```bash
npm run update-data
```

Este comando iterará sobre la lista de acciones definida en `data/stocks-list.json` y descargará los últimos datos para cada una.

### Automatización (Ejemplo con Cron)

Para mantener los datos actualizados de forma automática, puedes configurar una tarea programada (cron job) en tu servidor. Por ejemplo, para ejecutar el script todos los días a medianoche, puedes añadir la siguiente línea a tu crontab:

```cron
0 0 * * * cd /ruta/completa/hacia/el/proyecto/TITO && npm run update-data >> /var/log/tito-updates.log 2>&1
```

Asegúrate de reemplazar `/ruta/completa/hacia/el/proyecto/TITO` con la ruta real a tu proyecto.

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
*   `GET /api/goals?username={username}`: Obtiene las metas financieras de un usuario.
*   `POST /api/goals`: Crea o actualiza una meta financiera.
*   `DELETE /api/goals`: Elimina una meta financiera.
