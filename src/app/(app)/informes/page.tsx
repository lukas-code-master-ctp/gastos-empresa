import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clp, fecha, REPORT_TYPES } from "@/lib/format";
import { reportTotal, stepLabel } from "@/lib/workflow";
import { StatusBadge } from "@/components/Badge";

export default async function InformesPage() {
  const user = await requireUser();
  const reports = await db.report.findMany({ where: { userId: user.id }, include: { expenses: true, user: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Mis informes</h1>
        <Link href="/informes/nuevo" className="btn">Crear informe</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Informe</th><th>Tipo</th><th>Creado</th><th className="text-right">Gastos</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
          <tbody>
            {reports.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Sin informes todavía.</td></tr>}
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td><Link href={`/informes/${r.id}`} className="font-medium text-emerald-700 hover:underline">{r.title}</Link></td>
                <td>{REPORT_TYPES[r.type]}</td>
                <td>{fecha(r.createdAt)}</td>
                <td className="text-right">{r.expenses.length}</td>
                <td className="text-right tabular-nums">{clp(reportTotal(r.expenses))}</td>
                <td><StatusBadge status={r.status} />{r.currentStep && <div className="text-xs text-slate-500">{stepLabel(r, r.currentStep)}</div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
