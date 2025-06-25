'use client';

export default function HowItWorksPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-xl shadow mb-4">
        <h2 className="text-xl font-bold text-blue-800 mb-2">¿Cómo empezar?</h2>
        <ol className="list-decimal list-inside text-blue-900 space-y-2 ml-4">
          <li className="flex items-center gap-2"><span className="text-2xl">👤</span><span><b>Completa tu perfil</b> para personalizar tu experiencia.</span></li>
          <li className="flex items-center gap-2"><span className="text-2xl">💰</span><span><b>Deposita capital</b> para comenzar a invertir.</span></li>
          <li className="flex items-center gap-2"><span className="text-2xl">📈</span><span><b>Revisa oportunidades</b> en la sección <span className="font-semibold">Acciones</span>.</span></li>
          <li className="flex items-center gap-2"><span className="text-2xl">🛒</span><span><b>Ejecuta compras/ventas</b> según tus objetivos.</span></li>
          <li className="flex items-center gap-2"><span className="text-2xl">🎯</span><span><b>Actualiza tus metas</b> y sigue tu progreso.</span></li>
        </ol>
        <div className="mt-4 bg-blue-100 border-l-4 border-blue-400 p-3 rounded">
          <span className="font-semibold text-blue-700">Tip:</span> Puedes editar tu perfil y tus metas en cualquier momento para ajustar tu estrategia.
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">¿Cómo funciona <span className="text-blue-700">TITO</span>?</h1>
        <p className="text-lg text-gray-700 mb-2">
          <b>TITO</b> es tu asistente digital para invertir de manera <span className="font-semibold">simple</span> y <span className="font-semibold">educativa</span>.
        </p>
        <p className="text-gray-700 mb-2">
          Analiza los datos que ingresas en tu perfil de inversor y genera una estrategia de asignación de activos personalizada. <b>No operamos tu dinero</b>: tú decides cuándo depositar fondos y qué recomendaciones seguir.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mb-2">
          <span className="font-semibold text-blue-700">¿Sabías?</span> Todas las decisiones de inversión son tuyas. TITO solo te sugiere caminos posibles.
        </div>
        <p className="text-lg text-gray-700 mb-2 font-semibold">Características principales:</p>
        <ul className="list-disc list-inside text-gray-700 mb-2 ml-4 space-y-1">
          <li><b>Asignación sugerida:</b> Recibe una propuesta de distribución entre <span className="font-semibold">acciones</span>, <span className="font-semibold">bonos</span>, <span className="font-semibold">plazos fijos</span> y <span className="font-semibold">efectivo</span> según tu perfil.</li>
          <li><b>Recomendaciones de acciones:</b> En la sección <span className="font-semibold">Acciones</span> encontrarás oportunidades seleccionadas para vos.</li>
          <li><b>Gestión de portafolio:</b> Visualiza tu efectivo y posiciones en <span className="font-semibold">Portfolio</span>, y sigue tu progreso hacia tus metas.</li>
          <li><b>Simulador de impuestos:</b> Calcula el impacto fiscal de tus inversiones.</li>
          <li><b>Educativo y seguro:</b> TITO nunca opera ni transfiere tu dinero. Todas las decisiones son tuyas.</li>
        </ul>
        <p className="text-gray-700 mb-2">
          Usa estas herramientas para comprar, vender o invertir en bonos y plazos fijos cuando lo creas conveniente. <span className="font-semibold">TITO te acompaña, pero la última palabra es tuya.</span>
        </p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-xl shadow">
        <h2 className="text-2xl font-bold text-blue-800 mb-2">¿Por dónde empiezo?</h2>
        <ol className="list-decimal list-inside text-blue-900 space-y-2 ml-4">
          <li className="flex items-center gap-2"><span className="text-2xl">👤</span><span>Completa tu perfil inicial en <span className="font-semibold">Profile</span>.</span></li>
          <li className="flex items-center gap-2"><span className="text-2xl">💰</span><span>Deposita capital desde <span className="font-semibold">Portfolio</span>.</span></li>
          <li className="flex items-center gap-2"><span className="text-2xl">📈</span><span>Revisa las oportunidades del apartado <span className="font-semibold">Acciones</span>.</span></li>
          <li className="flex items-center gap-2"><span className="text-2xl">🛒</span><span>Ejecuta las compras o ventas manualmente según tus objetivos.</span></li>
          <li className="flex items-center gap-2"><span className="text-2xl">🎯</span><span>Actualiza tus metas y sigue tu progreso en <span className="font-semibold">Metas</span>.</span></li>
        </ol>
        <div className="mt-4 bg-blue-100 border-l-4 border-blue-400 p-3 rounded">
          <span className="font-semibold text-blue-700">Consejo:</span> ¡No dudes en volver a esta guía cuando quieras repasar los pasos!
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Importante</h3>
        <p className="text-sm text-gray-500">
          Recuerda que <span className="font-semibold">TITO</span> es una herramienta educativa. Toda decisión de inversión corre por tu cuenta. Consulta siempre con un profesional antes de tomar decisiones importantes.
        </p>
      </div>
    </div>
  );
} 