'use client';

export default function HowItWorksPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">¿Cómo funciona TITO?</h1>
        <p className="text-lg text-gray-700 mb-2">
          TITO es tu asistente digital para invertir de manera simple y educativa. Analiza los datos que ingresas en tu perfil de inversor y genera una estrategia de asignación de activos personalizada. <b>No operamos tu dinero</b>: tú decides cuándo depositar fondos y qué recomendaciones seguir.
        </p>
        <p className="text-lg text-gray-700 mb-2">
          <b>Características principales:</b>
        </p>
        <ul className="list-disc list-inside text-gray-700 mb-2 ml-4">
          <li><b>Asignación sugerida:</b> Recibe una propuesta de distribución entre acciones, bonos, plazos fijos y efectivo según tu perfil.</li>
          <li><b>Recomendaciones de acciones:</b> En la sección <span className="font-semibold">Acciones</span> encontrarás oportunidades seleccionadas para vos.</li>
          <li><b>Gestión de portafolio:</b> Visualiza tu efectivo y posiciones en <span className="font-semibold">Portfolio</span>, y sigue tu progreso hacia tus metas.</li>
          <li><b>Simulador de impuestos:</b> Calcula el impacto fiscal de tus inversiones.</li>
          <li><b>Educativo y seguro:</b> TITO nunca opera ni transfiere tu dinero. Todas las decisiones son tuyas.</li>
        </ul>
        <p className="text-lg text-gray-700">
          Usa estas herramientas para comprar, vender o invertir en bonos y plazos fijos cuando lo creas conveniente. TITO te acompaña, pero la última palabra es tuya.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Por dónde empiezo?</h2>
        <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
          <li>Completa tu perfil inicial en la sección <span className="font-semibold">Profile</span> <span className="inline-block">👤</span>.</li>
          <li>Deposita capital desde <span className="font-semibold">Portfolio</span> <span className="inline-block">💰</span>.</li>
          <li>Revisa las oportunidades del apartado <span className="font-semibold">Acciones</span> <span className="inline-block">📈</span>.</li>
          <li>Ejecuta las compras o ventas manualmente según tus objetivos <span className="inline-block">🛒</span>.</li>
          <li>Actualiza tus metas y sigue tu progreso en <span className="font-semibold">Metas</span> <span className="inline-block">🎯</span>.</li>
        </ol>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Importante</h3>
        <p className="text-sm text-gray-500">
          Recuerda que TITO es una herramienta educativa. Toda decisión de inversión corre por tu cuenta. Consulta siempre con un profesional antes de tomar decisiones importantes.
        </p>
      </div>
    </div>
  );
} 