import { confirmReturn, settleReport } from "@/app/actions";
import { clp } from "@/lib/format";

type R = { id: string; type: string; total: number; treasuryAction: string | null; fund: { amount: number; balance: number } | null; user: { name: string; bankInfo: string | null } };

// Explica qué hará tesorería según la rama del diagrama, antes de confirmar.
export function treasuryPreview(r: R) {
  if (r.type === "REEMBOLSO") return { text: `Depositar reembolso a ${r.user.name}`, amount: r.total };
  if (r.type === "CAJA_CHICA") return { text: `Descontar del monto de caja (saldo ${clp(r.fund!.balance)} → ${clp(r.fund!.balance - r.total)})`, amount: r.total };
  const diff = r.fund!.amount - r.total;
  if (diff === 0) return { text: "Calzó: se cierra el fondo", amount: 0 };
  if (diff > 0) return { text: `Sobró: pedir devolución a ${r.user.name}`, amount: diff };
  return { text: `Faltó: depositar la diferencia a ${r.user.name}`, amount: -diff };
}

export function TreasuryReportPanel({ report }: { report: R }) {
  if (report.treasuryAction === "DEVOLUCION_SOLICITADA")
    return (
      <form action={confirmReturn.bind(null, report.id)} className="card flex flex-wrap items-center justify-between gap-3 border-blue-300">
        <span className="text-sm">Se pidió devolución a {report.user.name}. Confirma cuando la recibas para cerrar el fondo.</span>
        <button className="btn">Devolución recibida</button>
      </form>
    );
  const p = treasuryPreview(report);
  return (
    <form action={settleReport.bind(null, report.id)} className="card space-y-3 border-blue-300">
      <h2 className="font-semibold">Tesorería</h2>
      <p className="text-sm">{p.text}{p.amount ? `: ${clp(p.amount)}` : ""}</p>
      {report.user.bankInfo && <p className="text-xs text-slate-500">Datos bancarios: {report.user.bankInfo}</p>}
      <input name="note" className="input" placeholder="Nota (ej: N° de transferencia)" />
      <button className="btn">Confirmar</button>
    </form>
  );
}
