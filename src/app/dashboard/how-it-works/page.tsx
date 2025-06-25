'use client';

export default function HowItWorksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">¿Cómo funciona TITO?</h1>
      <p className="text-lg text-gray-700">
        TITO analiza los datos que ingresas en tu perfil de inversor y genera una
        estrategia de asignación de activos simple. No operamos tu dinero: tú
        decides cuándo depositar fondos y qué recomendaciones seguir.
      </p>
      <p className="text-lg text-gray-700">
        En la sección <span className="font-semibold">Scoop</span> encontrarás
        acciones sugeridas según tu perfil y en
        <span className="font-semibold"> Portfolio</span> verás tu efectivo y
        posiciones. Usa estas herramientas para comprar, vender o invertir en
        bonos y plazos fijos cuando lo creas conveniente.
      </p>
      <h2 className="text-2xl font-bold text-gray-900">Tareas que debes realizar</h2>
      <ul className="list-disc list-inside text-gray-700 space-y-1">
        <li>Completar tu perfil inicial en la sección <span className="font-semibold">Profile</span>.</li>
        <li>Depositar capital desde <span className="font-semibold">Portfolio</span>.</li>
        <li>Revisar las oportunidades del apartado <span className="font-semibold">Scoop</span>.</li>
        <li>Ejecutar las compras o ventas manualmente según tus objetivos.</li>
        <li>Actualizar tus metas y seguir tu progreso en <span className="font-semibold">Metas</span>.</li>
      </ul>
      <p className="text-sm text-gray-500">
        Recuerda que TITO es una herramienta educativa. Toda decisión de
        inversión corre por tu cuenta.
      </p>
    </div>
  );
} 