"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card max-w-xl space-y-3 border-red-200">
      <h1 className="text-lg font-semibold text-red-700">No se pudo completar la acción</h1>
      <p className="text-sm text-slate-600">{process.env.NODE_ENV === "development" ? error.message : "Revisa los datos e inténtalo de nuevo."}</p>
      <button onClick={reset} className="btn-secondary">Volver a intentar</button>
    </div>
  );
}
