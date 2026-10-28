import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { reportTotal } from "@/lib/workflow";
import { clp, FUND_TYPES, REPORT_TYPES } from "@/lib/format";
import { treasuryPreview } from "@/components/Treasury";

export default async function TesoreriaPage() {
  const user = await requireUser();
  if (!["TESORERIA", "ADMIN"].includes(user.role)) notFound();
  const company = { user: { companyId: user.companyId } };
  const [reports, funds, cajas] = await Promise.all([
    db.report.findMany({ where: { status: "APROBADO", ...company }, include: { user: true, fund: true, expenses: true } }),
    db.fund.findMany({ where: { status: "APROBADO", ...company }, include: { user: true } }),
    db.fund.findMany({ where: { status: { in: ["ACTIVO", "DEVOLUCION_PENDIENTE"] }, ...company }, include: { user: true } }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="h1">Tesorería</h1>
      <section className="card overflow-x-auto p-0">
        <h2 className="px-5 pt-4 font-semibold">Informes aprobados por pagar o cerrar</h2>
        <table className="table mt-2">
          <thead><tr><th>Informe</th><th>Rendidor</th><th>Acción</th><th className="text-right">Monto</th></tr></thead>
          <tbody>
            {reports.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">Nada pendiente.</td></tr>}
            {reports.map((r) => {
              const p = treasuryPreview({ ...r, total: reportTotal(r.expenses) });
              return (
                <tr key={r.id}>
                  <td><Link href={`/informes/${r.id}`} className="font-medium text-emerald-700 hover:underline">{r.title}</Link><div className="text-xs text-slate-500">{REPORT_TYPES[r.type]}</div></td>
                  <td>{r.user.name}</td>
                  <td>{r.treasuryAction === "DEVOLUCION_SOLICITADA" ? "Esperando devolución" : p.text}</td>
                  <td className="text-right tabular-nums">{clp(r.treasuryAmount ?? p.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="card overflow-x-auto p-0">
        <h2 className="px-5 pt-4 font-semibold">Fondos aprobados por entregar</h2>
        <table className="table mt-2">
          <thead><tr><th>Fondo</th><th>Solicitante</th><th className="text-right">Monto</th></tr></thead>
          <tbody>
            {funds.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-500">Nada pendiente.</td></tr>}
            {funds.map((f) => (
              <tr key={f.id}>
                <td><Link href={`/fondos/${f.id}`} className="font-medium text-emerald-700 hover:underline">{f.reason}</Link><div className="text-xs text-slate-500">{FUND_TYPES[f.type]}</div></td>
                <td>{f.user.name}</td>
                <td className="text-right tabular-nums">{clp(f.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card overflow-x-auto p-0">
        <h2 className="px-5 pt-4 font-semibold">Fondos activos</h2>
        <table className="table mt-2">
          <thead><tr><th>Fondo</th><th>Responsable</th><th className="text-right">Entregado</th><th className="text-right">Saldo</th></tr></thead>
          <tbody>
            {cajas.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">Sin fondos activos.</td></tr>}
            {cajas.map((f) => (
              <tr key={f.id}>
                <td><Link href={`/fondos/${f.id}`} className="text-emerald-700 hover:underline">{f.reason}</Link><div className="text-xs text-slate-500">{FUND_TYPES[f.type]}{f.status === "DEVOLUCION_PENDIENTE" && " · esperando devolución"}</div></td>
                <td>{f.user.name}</td>
                <td className="text-right tabular-nums">{clp(f.amount)}</td>
                <td className="text-right tabular-nums">{f.type === "CAJA_CHICA" ? clp(f.balance) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
