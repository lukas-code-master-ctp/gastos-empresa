import { decide } from "@/app/actions";
import { fecha, STEPS, TREASURY } from "@/lib/format";

type ApprovalRow = { id: string; step: string; decision: string; comment: string | null; createdAt: Date; user: { name: string } };

// Barra de progreso de la cadena: Envío → Jefe directo → Contabilidad → Controller → Tesorería
export function ChainProgress({ status, currentStep, hasManager }: { status: string; currentStep: string | null; hasManager: boolean }) {
  const steps = [...(hasManager ? ["JEFE"] : []), "CONTABILIDAD", "CONTROLLER"];
  const idx = currentStep ? steps.indexOf(currentStep) : status === "EN_APROBACION" ? 0 : -1;
  const done = (i: number) => ["APROBADO", "ACTIVO", "CERRADO"].includes(status) || (status === "EN_APROBACION" && i < idx);
  const items = [...steps.map((s) => STEPS[s]), "Tesorería"];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((label, i) => {
        const isTreasury = i === steps.length;
        const ok = isTreasury ? ["ACTIVO", "CERRADO"].includes(status) : done(i);
        const current = isTreasury ? status === "APROBADO" : status === "EN_APROBACION" && i === idx;
        return (
          <li key={label} className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 font-medium ${ok ? "bg-emerald-600 text-white" : current ? "bg-amber-400 text-amber-950" : ["OBSERVADO", "RECHAZADO"].includes(status) && i === 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
              {ok ? "✓ " : ""}{label}
            </span>
            {i < items.length - 1 && <span className="text-slate-300">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function History({ items }: { items: ApprovalRow[] }) {
  const text = (a: ApprovalRow) =>
    a.decision === "ENVIADO" ? "Envió a aprobación"
    : a.decision === "APROBADO" ? `Aprobó (${STEPS[a.step]})`
    : a.decision === "MODIFICAR" ? `Pidió modificar (${STEPS[a.step]})`
    : a.decision === "RECHAZADO" ? `Rechazó (${STEPS[a.step]})`
    : TREASURY[a.comment ?? ""] ?? (a.comment === "DEVOLUCION_RECIBIDA" ? "Confirmó devolución recibida: se cerró el fondo" : `Tesorería: ${a.comment}`);
  return (
    <div className="card">
      <h2 className="font-semibold">Historial</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Sin movimientos aún.</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm">
          {items.map((a) => (
            <li key={a.id} className="border-l-2 border-slate-200 pl-3">
              <div><span className="font-medium">{a.user.name}</span> · {text(a)}</div>
              {["MODIFICAR", "RECHAZADO"].includes(a.decision) && a.comment && <div className="text-red-700">Motivo: {a.comment}</div>}
              <div className="text-xs text-slate-400">{fecha(a.createdAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DecisionForm({ kind, id, step }: { kind: "report" | "fund"; id: string; step: string }) {
  return (
    <form action={decide.bind(null, kind, id)} className="card space-y-3 border-amber-300">
      <h2 className="font-semibold">Te toca revisar: {STEPS[step]}</h2>
      <div>
        <label className="label">Motivo (obligatorio si pides modificar o rechazas)</label>
        <textarea name="comment" rows={2} className="input" placeholder="Ej: falta la boleta del almuerzo del 12/10" />
      </div>
      <div className="flex gap-2">
        <button name="decision" value="APROBADO" className="btn">Aprobar</button>
        <button name="decision" value="MODIFICAR" className="btn-warning">Pedir modificar</button>
        <button name="decision" value="RECHAZADO" className="btn-danger">Rechazar</button>
      </div>
    </form>
  );
}
