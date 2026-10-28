import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clp, fecha, FUND_TYPES, STEPS } from "@/lib/format";
import { StatusBadge } from "@/components/Badge";

export default async function FondosPage() {
  const user = await requireUser();
  const funds = await db.fund.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Fondos fijos y caja chica</h1>
        <Link href="/fondos/nuevo" className="btn">Solicitar fondo</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Tipo</th><th>Motivo</th><th>Solicitado</th><th className="text-right">Monto</th><th className="text-right">Saldo</th><th>Estado</th></tr></thead>
          <tbody>
            {funds.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No has solicitado fondos.</td></tr>}
            {funds.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <td>{FUND_TYPES[f.type]}</td>
                <td><Link href={`/fondos/${f.id}`} className="font-medium text-emerald-700 hover:underline">{f.reason}</Link></td>
                <td>{fecha(f.createdAt)}</td>
                <td className="text-right tabular-nums">{clp(f.amount)}</td>
                <td className="text-right tabular-nums">{f.status === "ACTIVO" ? clp(f.balance) : "—"}</td>
                <td><StatusBadge status={f.status} />{f.currentStep && f.status === "EN_APROBACION" && <div className="text-xs text-slate-500">{STEPS[f.currentStep]}</div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
