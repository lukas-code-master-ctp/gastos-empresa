import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { pendingApprovals, reportTotal } from "@/lib/workflow";
import { clp, FUND_TYPES } from "@/lib/format";
import { Icon, type IconName } from "@/components/Icons";
import { CountUp, Stagger, StaggerItem } from "@/components/motion";

type Tile = { label: string; value: number; format?: "int" | "clp"; sub?: string; href: string; icon: IconName; alert?: boolean; hero?: boolean };

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
  const toApprove = pending.reports.length + pending.funds.length;

  const tiles: Tile[] = [
    { label: "En aprobación", value: inFlow.reduce((s, r) => s + reportTotal(r.expenses), 0), format: "clp", sub: `${inFlow.length} ${inFlow.length === 1 ? "informe" : "informes"} en camino`, href: "/informes", icon: "folder", hero: true },
    { label: "Gastos sin informe", value: drafts, sub: drafts ? "Júntalos en un informe" : "Todo rendido", href: "/gastos", icon: "receipt" },
    ...(toApprove > 0 || user.role !== "EMPLEADO"
      ? [{ label: "Por aprobar", value: toApprove, sub: toApprove ? "Te están esperando" : "Nada pendiente", href: "/aprobaciones", icon: "check" as const, alert: toApprove > 0 }]
      : []),
    ...(treasury != null ? [{ label: "En tesorería", value: treasury, sub: treasury ? "Por pagar o cerrar" : "Al día", href: "/tesoreria", icon: "bank" as const, alert: treasury > 0 }] : []),
  ];
  const today = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="eyebrow">{today}</div>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.04em] md:text-6xl">
            Hola, {user.name.split(" ")[0]}<span className="text-mandarina-500">.</span>
          </h1>
          <p className="mt-2 max-w-prose text-slate-500">¿Tienes una boleta por rendir? Súbela y la IA captura los datos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/gastos/nuevo" className="btn"><Icon name="upload" /> Subir boleta</Link>
          <Link href="/informes/nuevo" className="btn-secondary">Crear informe</Link>
          <Link href="/fondos/nuevo" className="btn-secondary">Pedir fondo o caja chica</Link>
        </div>
      </header>

      <Stagger className={`grid gap-4 sm:grid-cols-2 ${tiles.length + 1 <= 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {tiles.map((t) => (
          <StaggerItem key={t.label} className={t.hero ? "sm:col-span-2" : undefined}>
            <Link
              href={t.href}
              className={`card group relative h-full overflow-hidden ${t.hero ? "border-transparent bg-emerald-700 text-white" : ""} ${t.alert ? "border-mandarina-400" : ""}`}
            >
              {t.hero && <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-mandarina-500/35 blur-2xl transition-transform duration-700 group-hover:scale-125" />}
              <div className="relative flex items-center justify-between">
                <span className={`font-mono text-[11px] font-medium uppercase tracking-[0.1em] ${t.hero ? "text-white/75" : "text-slate-500"}`}>{t.label}</span>
                <span className={`grid size-8 place-items-center rounded-lg transition-transform duration-300 group-hover:-rotate-6 ${t.hero ? "bg-white/15" : t.alert ? "bg-mandarina-500 text-ink" : "bg-slate-100 text-emerald-700"}`}>
                  <Icon name={t.icon} className="size-4" />
                </span>
              </div>
              <CountUp value={t.value} format={t.format} className={`relative mt-4 block font-display font-extrabold tabular-nums tracking-[-0.03em] ${t.hero ? "text-4xl md:text-5xl" : "text-4xl"}`} />
              {t.sub && (
                <div className={`relative mt-1 flex items-center gap-1 text-sm ${t.hero ? "text-white/80" : "text-slate-500"}`}>
                  {t.sub}
                  <Icon name="arrow" className="size-3.5 -translate-x-1 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
              )}
            </Link>
          </StaggerItem>
        ))}
      </Stagger>

      {funds.length > 0 && (
        <section className="card">
          <h2>Mis fondos activos</h2>
          <ul className="mt-4 space-y-4">
            {funds.map((f) => {
              const pct = f.type === "CAJA_CHICA" && f.amount > 0 ? Math.max(0, Math.min(100, (f.balance / f.amount) * 100)) : null;
              return (
                <li key={f.id} className="text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/fondos/${f.id}`} className="font-medium text-emerald-700 hover:underline">{FUND_TYPES[f.type]} · {f.reason}</Link>
                    <span className="tabular-nums text-slate-600">{f.type === "CAJA_CHICA" ? `Saldo ${clp(f.balance)} de ${clp(f.amount)}` : clp(f.amount)}</span>
                  </div>
                  {pct != null && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Saldo disponible">
                      <div className="h-full origin-left animate-[grow_1.1s_var(--ease-out-expo)_both] rounded-full bg-mandarina-500" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
