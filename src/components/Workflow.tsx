import { decide } from "@/app/actions";
import { clp, fecha, ROLES, STEPS, TREASURY } from "@/lib/format";
import { RejectButton } from "./RejectButton";
import { Icon } from "./Icons";

type ApprovalRow = { id: string; step: string; decision: string; comment: string | null; attachmentPath?: string | null; createdAt: Date; user: { name: string } };

// Barra de progreso de la cadena: Envío → Jefe directo → Contabilidad → Controller → Tesorería
export function ChainProgress({ status, currentStep, hasManager, approvals }: { status: string; currentStep: string | null; hasManager: boolean; approvals: { step: string; decision: string }[] }) {
  const steps = [...(hasManager ? ["JEFE"] : []), "CONTABILIDAD", "CONTROLLER"];
  // Si se rechazó, se marca en rojo el paso de quien lo hizo
  const stopped = status === "RECHAZADO";
  const stop = stopped ? approvals.findLast((a) => a.decision === "RECHAZADO") : undefined;
  const stopIdx = stop ? steps.indexOf(stop.step) : -1;
  const idx = currentStep ? steps.indexOf(currentStep) : status === "EN_APROBACION" ? 0 : -1;
  const done = (i: number) => ["APROBADO", "ACTIVO", "CERRADO", "DEVOLUCION_PENDIENTE"].includes(status) || (status === "EN_APROBACION" && i < idx) || (stopped && i < stopIdx);
  const items = [...steps.map((s) => STEPS[s]), "Tesorería"];
  return (
    <ol className="card flex flex-wrap items-start gap-y-4 px-5 py-4 sm:flex-nowrap" aria-label="Flujo de aprobación">
      {items.map((label, i) => {
        const isTreasury = i === steps.length;
        const ok = isTreasury ? ["ACTIVO", "CERRADO", "DEVOLUCION_PENDIENTE"].includes(status) : done(i);
        const current = isTreasury ? status === "APROBADO" : status === "EN_APROBACION" && i === idx;
        const stoppedHere = i === stopIdx;
        const state = ok ? "Listo" : current ? "En curso" : stoppedHere ? "Rechazado" : "Pendiente";
        return (
          <li key={label} className="flex min-w-0 flex-1 basis-1/2 items-start gap-3 sm:basis-0" aria-current={current ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors duration-500 ${
                  ok ? "border-emerald-700 bg-emerald-700 text-white"
                  : current ? "pulse-ring border-mandarina-500 bg-white text-mandarina-600"
                  : stoppedHere ? "border-red-700 bg-red-50 text-red-700"
                  : "border-slate-200 bg-white text-slate-400"}`}
              >
                {ok ? <Icon name="ok" className="size-4" /> : stoppedHere ? <Icon name="x" className="size-4" /> : <span className="font-mono text-[11px] font-semibold">{i + 1}</span>}
              </span>
            </div>
            <div className="min-w-0 pt-0.5">
              <div className={`text-sm leading-tight ${current ? "font-semibold text-ink" : ok ? "font-medium text-ink" : "text-slate-500"}`}>{label}</div>
              <div className={`mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${current ? "text-mandarina-700" : stoppedHere ? "text-red-700" : "text-slate-400"}`}>{state}</div>
            </div>
            {i < items.length - 1 && <span aria-hidden="true" className={`mt-4 hidden h-0.5 flex-1 rounded-full sm:block ${ok ? "bg-emerald-700" : "bg-slate-200"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

// Los movimientos de tesorería se guardan como "ACCION" o "ACCION:monto"
function treasuryText(comment: string) {
  if (comment === "DEVOLUCION_RECIBIDA") return "Confirmó devolución recibida: se cerró el fondo";
  if (comment.startsWith("CIERRE_CAJA saldo ")) return `Cerró la caja chica (saldo ${clp(Number(comment.slice(18)))})`;
  const [key, amount] = comment.split(":");
  const label = TREASURY[key] ?? `Tesorería: ${comment}`;
  return amount ? `${label} (${clp(Number(amount))})` : label;
}

export function History({ items }: { items: ApprovalRow[] }) {
  const text = (a: ApprovalRow) =>
    a.decision === "ENVIADO" ? "Envió a aprobación"
    : a.decision === "APROBADO" ? `Aprobó (${STEPS[a.step]})`
    : a.decision === "RECHAZADO" ? `Rechazó (${STEPS[a.step]})`
    : a.decision === "GASTO_RECHAZADO" ? `Rechazó un gasto (${STEPS[a.step]})`
    : a.decision === "GASTO_RESTAURADO" ? `Deshizo el rechazo de ${a.comment}`
    : a.decision === "EDITADO" ? `Editó un gasto (${ROLES[a.step] ?? a.step})`
    : treasuryText(a.comment ?? "");
  return (
    <div className="card">
      <h2 className="font-semibold">Historial</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Sin movimientos aún.</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm">
          {items.map((a) => (
            <li key={a.id} className="relative border-l-2 border-slate-200 pl-4 before:absolute before:-left-[5px] before:top-1.5 before:size-2 before:rounded-full before:bg-mandarina-500">
              <div><span className="font-medium">{a.user.name}</span> · {text(a)}</div>
              {a.decision === "RECHAZADO" && a.comment && <div className="text-red-700">Motivo: {a.comment}</div>}
              {a.decision === "GASTO_RECHAZADO" && <div className="text-red-700">{a.comment}</div>}
              {a.decision === "EDITADO" && <div className="text-slate-600">{a.comment}</div>}
              {a.attachmentPath && <a href={`/api/files/${a.attachmentPath}`} target="_blank" className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><Icon name="clip" className="size-3.5" /> Ver comprobante</a>}
              <div className="text-xs text-slate-400">{fecha(a.createdAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DecisionForm({ kind, id, step }: { kind: "report" | "fund"; id: string; step: string }) {
  const action = decide.bind(null, kind, id);
  return (
    <div className="card space-y-3 border-amber-300">
      <h2 className="font-semibold">Te toca revisar: {STEPS[step]}</h2>
      {kind === "report" && (
        <p className="text-sm text-slate-600">Puedes rechazar gastos puntuales desde su fila. Al aprobar, el informe sigue con los gastos no rechazados.</p>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <form action={action}>
          <button name="decision" value="APROBADO" className="btn">Aprobar</button>
        </form>
        <RejectButton
          action={action}
          hidden={{ decision: "RECHAZADO" }}
          label={kind === "report" ? "Rechazar informe" : "Rechazar"}
          title={kind === "report" ? "Rechazar el informe completo" : "Rechazar la solicitud"}
        />
      </div>
    </div>
  );
}
