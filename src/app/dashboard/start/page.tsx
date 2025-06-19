import React from 'react';

const BrokerCard = ({ name, benefits, fees, debitCard, usability }: {
  name: string;
  benefits: string[];
  fees: string;
  debitCard: boolean;
  usability: string;
}) => (
  <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    <h3 className="text-xl font-semibold mb-3 text-blue-600">{name}</h3>
    <div className="space-y-2">
      <div>
        <span className="font-medium">Beneficios:</span>
        <ul className="list-disc list-inside ml-2">
          {benefits.map((benefit, idx) => (
            <li key={idx} className="text-gray-600">{benefit}</li>
          ))}
        </ul>
      </div>
      <div>
        <span className="font-medium">Comisiones:</span>
        <p className="text-gray-600">{fees}</p>
      </div>
      <div>
        <span className="font-medium">Tarjeta de débito:</span>
        <p className="text-gray-600">{debitCard ? "Sí" : "No"}</p>
      </div>
      <div>
        <span className="font-medium">Facilidad de uso:</span>
        <p className="text-gray-600">{usability}</p>
      </div>
    </div>
  </div>
);

export default function StartPage() {
  const brokers = [
    {
      name: "Bullmarket",
      benefits: [
        "Plataforma robusta y confiable",
        "Amplia trayectoria en el mercado",
        "Soporte técnico personalizado"
      ],
      fees: "0.5% en operaciones de acciones, bonos y CEDEARs",
      debitCard: true,
      usability: "Interfaz completa con todas las herramientas necesarias"
    },
    {
      name: "Matriz App",
      benefits: [
        "App móvil moderna e intuitiva",
        "Proceso de apertura 100% digital",
        "Educación financiera integrada"
      ],
      fees: "0.6% en operaciones bursátiles",
      debitCard: true,
      usability: "Muy fácil de usar, ideal para principiantes"
    },
    {
      name: "Coco's Capital",
      benefits: [
        "Atención personalizada",
        "Análisis de mercado diario",
        "Comunidad activa de inversores"
      ],
      fees: "0.4% - 0.6% según el tipo de operación",
      debitCard: false,
      usability: "Interfaz simple y directa"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        ¿Cómo empezar a invertir?
      </h1>

      {/* Sección 1: Dónde abrir una cuenta */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          🏦 ¿Dónde abrir una cuenta comitente?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brokers.map((broker, idx) => (
            <BrokerCard key={idx} {...broker} />
          ))}
        </div>
      </section>

      {/* Sección 2: Comparación con bono americano */}
      <section className="mb-12 bg-blue-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          📈 Elegí siempre inversiones con más rendimiento que el bono americano
        </h2>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-4xl font-bold text-blue-600 mb-4">4.3%</div>
          <p className="text-gray-600">
            Rendimiento actual del bono del Tesoro de EE.UU. a 10 años
          </p>
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <p className="text-gray-700">
              <strong>Consejo importante:</strong> Este es tu piso de rendimiento. 
              Si invertís en acciones que rinden menos que el bono americano, 
              estás asumiendo más riesgo por menor retorno. El bono del tesoro 
              americano es considerado "libre de riesgo" y debería ser tu punto 
              de referencia mínimo.
            </p>
          </div>
        </div>
      </section>

      {/* Sección 3: Impuestos */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          🧾 Tené en cuenta los impuestos
        </h2>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                En Argentina:
              </h3>
              <p className="text-gray-600">
                Las ganancias por venta de acciones pagan impuesto si no cotizan 
                en mercados locales. Las acciones que cotizan en BYMA están exentas 
                del impuesto a las ganancias.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                En Estados Unidos:
              </h3>
              <p className="text-gray-600">
                Existen dos tipos principales de impuestos:
              </p>
              <ul className="list-disc list-inside mt-2 text-gray-600">
                <li>Impuesto sobre dividendos (generalmente 30% para no residentes)</li>
                <li>Impuesto sobre ganancias de capital (aplicable en la venta)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Extra: Mini guía */}
      <section className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          ❓ ¿Qué es una cuenta comitente?
        </h2>
        <p className="text-gray-600 mb-4">
          Una cuenta comitente es una cuenta especial que te permite operar en el 
          mercado de valores. Es diferente de una cuenta bancaria tradicional y es 
          necesaria para comprar y vender acciones, bonos y otros instrumentos 
          financieros.
        </p>
        <p className="text-gray-600">
          Esta cuenta es administrada por un agente de bolsa (broker) que actúa 
          como intermediario entre vos y el mercado. Tus activos están siempre a 
          tu nombre y protegidos por la regulación vigente.
        </p>
      </section>
    </div>
  );
} 