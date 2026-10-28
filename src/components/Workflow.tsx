import { decide } from "@/app/actions";
import { clp, fecha, ROLES, STEPS, TREASURY } from "@/lib/format";

type ApprovalRow = { id: string; step: string; decision: string; comment: string | null; createdAt: Date; user: { name: string } };

// Barra de progreso de la cadena: Envío → Jefe directo → Contabilidad → Controller → Tesorería
export function ChainProgress({ status, currentStep, hasManager, approvals }: { status: string; currentStep: string | null; hasManager: boolean; approvals: { step: string; decision: string }[] }) {
  const steps = [...(hasManager ? ["JEFE"] : []), "CONTABILIDAD", "CONTROLLER"];
  // Si se rechazó, se marca en rojo el paso de quien lo hizo
  const stopped = status === "RECHAZADO";
  const stop = stopped ? approvals.findLast((a) => a.decision === "RECHAZADO") : undefined;
  const stopIdx = stop ? steps.indexOf(stop.step) : -1;
  const idx = currentStep ? steps.indexOf(currentStep) : status === "EN_APROBACION" ? 0 : -1;
  const done = (i: number) => ["APROBADO", "ACTIVO", "CERRADO"].includes(status) || (status === "EN_APROBACION" && i < idx) || (stopped && i < stopIdx);
  const items = [...steps.map((s) => STEPS[s]), "Tesorería"];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((label, i) => {
        const isTreasury = i === steps.length;
        const ok = isTreasury ? ["ACTIVO", "CERRADO"].includes(status) : done(i);
        const current = isTreasury ? status === "APROBADO" : status === "EN_APROBACION" && i === idx;
        return (
          <li key={label} className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 font-medium ${ok ? "bg-emerald-600 text-white" : current ? "bg-amber-400 text-amber-950" : i === stopIdx ? "bg-red-100 text-red-700 ring-1 ring-red-300" : "bg-slate-100 text-slate-500"}`}>
              {ok ? "✓ " : i === stopIdx ? "✕ " : ""}{label}
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
    : a.decision === "RECHAZADO" ? `Rechazó (${STEPS[a.step]})`
    : a.decision === "GASTO_RECHAZADO" ? `Rechazó un gasto (${STEPS[a.step]})`
    : a.decision === "EDITADO" ? `Editó un gasto (${ROLES[a.step] ?? a.step})`
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
              {a.decision === "RECHAZADO" && a.comment && <div className="text-red-700">Motivo: {a.comment}</div>}
              {a.decision === "GASTO_RECHAZADO" && <div className="text-red-700">{a.comment}</div>}
              {a.decision === "EDITADO" && <div className="text-slate-600">{a.comment}</div>}
              <div className="text-xs text-slate-400">{fecha(a.createdAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type DecisionExpense = { id: string; merchant: string | null; amount: number | null; date: Date | null; rejectedAt: Date | null };

export function DecisionForm({ kind, id, step, expenses = [] }: { kind: "report" | "fund"; id: string; step: string; expenses?: DecisionExpense[] }) {
  const pending = expenses.filter((e) => !e.rejectedAt);
  return (
    <form action={decide.bind(null, kind, id)} className="card space-y-3 border-amber-300">
      <h2 className="font-semibold">Te toca revisar: {STEPS[step]}</h2>
      {pending.length > 1 && (
        <div>
          <label className="label">Rechazar gastos puntuales (opcional)</label>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {pending.map((e) => (
              <li key={e.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-red-50 has-[:checked]:bg-red-50">
                  <input type="checkbox" name="rejectIds" value={e.id} />
                  <span className="flex-1">{e.merchant ?? "Sin comercio"} <span className="text-slate-400">· {fecha(e.date)}</span></span>
                  <span className="tabular-nums">{clp(e.amount)}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-slate-500">Los gastos marcados quedan rechazados y bloqueados; el resto sigue aprobándose.</p>
        </div>
      )}
      <div>
        <label className="label">Motivo del rechazo</label>
        <textarea name="comment" rows={2} className="input" placeholder="Obligatorio si rechazas el informe o algún gasto" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button name="decision" value="APROBADO" className="btn">{kind === "report" && pending.length > 1 ? "Aprobar (sin los marcados)" : "Aprobar"}</button>
        <button name="decision" value="RECHAZADO" className="btn-danger">{kind === "report" ? "Rechazar informe completo" : "Rechazar"}</button>
      </div>
    </form>
  );
}
