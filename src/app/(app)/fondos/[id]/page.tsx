import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { closeCajaChica, deliverFund, resubmitFund } from "@/app/actions";
import { clp, fecha, FUND_TYPES } from "@/lib/format";
import { canApprove, reportTotal } from "@/lib/workflow";
import { StatusBadge } from "@/components/Badge";
import { ChainProgress, DecisionForm, History } from "@/components/Workflow";

export default async function FondoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const f = await db.fund.findUnique({
    where: { id },
    include: { user: true, reports: { include: { expenses: true } }, approvals: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!f || f.user.companyId !== user.companyId) notFound();
  const mine = f.userId === user.id;
  const isApprover = canApprove(user, f.currentStep, f.user);
  const isTreasury = ["TESORERIA", "ADMIN"].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Solicitud de {FUND_TYPES[f.type].toLowerCase()}</div>
          <h1 className="h1">{f.reason}</h1>
          <div className="mt-1 text-sm text-slate-500">{f.user.name} · {fecha(f.createdAt)}</div>
        </div>
        <div className="text-right">
          <StatusBadge status={f.status} />
          <div className="mt-2 text-2xl font-semibold tabular-nums">{clp(f.amount)}</div>
          {f.status === "ACTIVO" && f.type === "CAJA_CHICA" && <div className="text-sm text-slate-500">Saldo {clp(f.balance)}</div>}
        </div>
      </div>
      <ChainProgress status={f.status} currentStep={f.currentStep} hasManager={Boolean(f.user.managerId)} />

      {f.status === "OBSERVADO" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <b>Se pidió modificar:</b> {f.rejectReason}
          {mine && (
            <form action={resubmitFund.bind(null, f.id)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <input name="amount" defaultValue={f.amount} className="input" />
              <input name="reason" defaultValue={f.reason} className="input" />
              <button className="btn">Reenviar</button>
            </form>
          )}
        </div>
      )}

      {isApprover && f.status === "EN_APROBACION" && <DecisionForm kind="fund" id={f.id} step={f.currentStep!} />}

      {isTreasury && f.status === "APROBADO" && (
        <form action={deliverFund.bind(null, f.id)} className="card flex flex-wrap items-center justify-between gap-3 border-blue-300">
          <span className="text-sm">Tesorería: entregar {clp(f.amount)} a {f.user.name}{f.user.bankInfo ? ` (${f.user.bankInfo})` : ""}</span>
          <button className="btn">Marcar como entregado</button>
        </form>
      )}
      {isTreasury && f.status === "ACTIVO" && f.type === "CAJA_CHICA" && (
        <form action={closeCajaChica.bind(null, f.id)} className="flex justify-end">
          <button className="btn-secondary">Cerrar caja chica (saldo {clp(f.balance)})</button>
        </form>
      )}

      {mine && f.status === "ACTIVO" && (
        <Link href="/informes/nuevo" className="btn">Rendir gastos de este fondo</Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold">Rendiciones</h2>
          {f.reports.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Aún no hay informes asociados.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {f.reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <Link href={`/informes/${r.id}`} className="text-emerald-700 hover:underline">{r.title}</Link>
                  <span className="flex items-center gap-3"><span className="tabular-nums">{clp(reportTotal(r.expenses))}</span><StatusBadge status={r.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <History items={f.approvals} />
      </div>
    </div>
  );
}
