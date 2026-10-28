import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { pendingApprovals, reportTotal } from "@/lib/workflow";
import { clp, fecha, FUND_TYPES, REPORT_TYPES, STEPS } from "@/lib/format";

export default async function AprobacionesPage() {
  const user = await requireUser();
  const { reports, funds } = await pendingApprovals(user);
  return (
    <div className="space-y-6">
      <h1 className="h1">Aprobaciones pendientes</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Qué</th><th>Solicitante</th><th>Enviado</th><th>Paso</th><th className="text-right">Monto</th></tr></thead>
          <tbody>
            {reports.length + funds.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No tienes nada pendiente. 🎉</td></tr>}
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td><Link href={`/informes/${r.id}`} className="font-medium text-emerald-700 hover:underline">{r.title}</Link><div className="text-xs text-slate-500">{REPORT_TYPES[r.type]} · {r.expenses.length} gastos</div></td>
                <td>{r.user.name}</td>
                <td>{fecha(r.submittedAt)}</td>
                <td>{STEPS[r.currentStep!]}</td>
                <td className="text-right tabular-nums">{clp(reportTotal(r.expenses))}</td>
              </tr>
            ))}
            {funds.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <td><Link href={`/fondos/${f.id}`} className="font-medium text-emerald-700 hover:underline">{f.reason}</Link><div className="text-xs text-slate-500">Solicitud de {FUND_TYPES[f.type].toLowerCase()}</div></td>
                <td>{f.user.name}</td>
                <td>{fecha(f.createdAt)}</td>
                <td>{STEPS[f.currentStep!]}</td>
                <td className="text-right tabular-nums">{clp(f.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
