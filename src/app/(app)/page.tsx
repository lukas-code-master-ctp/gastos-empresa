import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { pendingApprovals, reportTotal } from "@/lib/workflow";
import { clp, FUND_TYPES } from "@/lib/format";

export default async function Home() {
  const user = await requireUser();
  const [drafts, reports, funds, pending, treasury] = await Promise.all([
    db.expense.count({ where: { userId: user.id, reportId: null } }),
    db.report.findMany({ where: { userId: user.id, status: { notIn: ["CERRADO", "RECHAZADO"] } }, include: { expenses: true } }),
    db.fund.findMany({ where: { userId: user.id, status: "ACTIVO" } }),
    pendingApprovals(user),
    ["TESORERIA", "ADMIN"].includes(user.role)
      ? db.report.count({ where: { status: "APROBADO", user: { companyId: user.companyId } } }).then(
          async (n) => n + (await db.fund.count({ where: { status: "APROBADO", user: { companyId: user.companyId } } })),
        )
      : Promise.resolve(null),
  ]);
  const inFlow = reports.filter((r) => r.status === "EN_APROBACION");
  const observed = reports.filter((r) => r.status === "OBSERVADO");

  const tiles = [
    { label: "Gastos sin informe", value: drafts, href: "/gastos" },
    { label: "Informes en aprobación", value: `${inFlow.length} · ${clp(inFlow.reduce((s, r) => s + reportTotal(r.expenses), 0))}`, href: "/informes" },
    { label: "Informes observados", value: observed.length, href: "/informes", alert: observed.length > 0 },
    ...(pending.reports.length + pending.funds.length > 0 || user.role !== "EMPLEADO"
      ? [{ label: "Por aprobar", value: pending.reports.length + pending.funds.length, href: "/aprobaciones", alert: pending.reports.length + pending.funds.length > 0 }]
      : []),
    ...(treasury != null ? [{ label: "Pendientes en tesorería", value: treasury, href: "/tesoreria", alert: treasury > 0 }] : []),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">Hola, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500">¿Tienes una boleta por rendir? Súbela y la IA captura los datos.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/gastos/nuevo" className="btn">Subir boleta</Link>
        <Link href="/informes/nuevo" className="btn-secondary">Crear informe</Link>
        <Link href="/fondos/nuevo" className="btn-secondary">Solicitar fondo fijo o caja chica</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`card hover:border-emerald-600 ${"alert" in t && t.alert ? "border-amber-400" : ""}`}>
            <div className="text-xs uppercase tracking-wide text-slate-500">{t.label}</div>
            <div className="mt-2 text-2xl font-semibold">{t.value}</div>
          </Link>
        ))}
      </div>
      {funds.length > 0 && (
        <div className="card">
          <h2 className="font-semibold">Mis fondos activos</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {funds.map((f) => (
              <li key={f.id} className="flex justify-between py-2">
                <Link href={`/fondos/${f.id}`} className="text-emerald-700 hover:underline">{FUND_TYPES[f.type]} · {f.reason}</Link>
                <span>{f.type === "CAJA_CHICA" ? `Saldo ${clp(f.balance)} de ${clp(f.amount)}` : clp(f.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
