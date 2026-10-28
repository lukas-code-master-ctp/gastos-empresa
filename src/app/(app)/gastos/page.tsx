import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clp, fecha } from "@/lib/format";
import { missingFields } from "@/lib/workflow";
import { StatusBadge } from "@/components/Badge";

export default async function GastosPage() {
  const user = await requireUser();
  const expenses = await db.expense.findMany({
    where: { userId: user.id },
    include: { category: true, report: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Mis gastos</h1>
        <Link href="/gastos/nuevo" className="btn">Subir boleta</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr><th>Fecha</th><th>Comercio</th><th>Categoría</th><th>Origen</th><th className="text-right">Monto</th><th>Informe</th></tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-500">Aún no tienes gastos. Sube tu primera boleta.</td></tr>
            )}
            {expenses.map((e) => {
              const missing = missingFields(e);
              return (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td>{fecha(e.date)}</td>
                  <td>
                    <Link href={`/gastos/${e.id}`} className="font-medium text-emerald-700 hover:underline">{e.merchant ?? "Sin comercio"}</Link>
                    {missing.length > 0 && <div className="text-xs text-amber-700">Falta: {missing.join(", ")}</div>}
                    {e.rejectedAt && <div className="text-xs font-medium text-red-700">✕ Rechazado: {e.rejectedReason}</div>}
                  </td>
                  <td>{e.category?.name ?? "—"}</td>
                  <td className="text-xs">{e.source === "WHATSAPP" ? "WhatsApp" : "Web"}</td>
                  <td className="text-right tabular-nums">{clp(e.amount)}</td>
                  <td>{e.report ? <Link href={`/informes/${e.report.id}`}><StatusBadge status={e.report.status} /></Link> : <span className="text-xs text-slate-400">Sin informe</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
