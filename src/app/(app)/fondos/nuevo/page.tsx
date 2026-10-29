import { createFund } from "@/app/actions";

export default async function NuevoFondo({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="h1">Solicitar fondo</h1>
      <form action={createFund} className="card space-y-4">
        <div>
          <label className="label">Tipo</label>
          <select name="type" defaultValue={tipo === "caja" ? "CAJA_CHICA" : "FONDO_FIJO"} className="input">
            <option value="FONDO_FIJO">Fondo fijo (se rinde y se cierra)</option>
            <option value="CAJA_CHICA">Caja chica (se descuenta por cada rendición)</option>
          </select>
        </div>
        <div>
          <label className="label">Monto</label>
          <input name="amount" inputMode="numeric" className="input" placeholder="200000" required />
        </div>
        <div>
          <label className="label">Motivo</label>
          <textarea name="reason" rows={3} className="input" placeholder="Ej: Gastos de terreno semana del 3 al 7 de noviembre" required />
        </div>
        <p className="text-xs text-slate-500">La solicitud pasa por el flujo de aprobación de tu empresa y luego tesorería entrega el fondo.</p>
        <button className="btn">Enviar solicitud</button>
      </form>
    </div>
  );
}
