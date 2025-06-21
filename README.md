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

## Descargo de Responsabilidad

TITO es un proyecto con fines exclusivamente educativos y de demostración. La información y las recomendaciones proporcionadas por esta aplicación no deben considerarse como asesoramiento financiero profesional. Realiza tu propia investigación y/o consulta a un asesor financiero calificado antes de tomar cualquier decisión de inversión.
