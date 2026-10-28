import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteReport, setReportExpenses, submitReport } from "@/app/actions";
import { clp, fecha, FUND_TYPES, REPORT_TYPES, TREASURY } from "@/lib/format";
import { canApprove, missingFields, reportTotal } from "@/lib/workflow";
import { StatusBadge } from "@/components/Badge";
import { ChainProgress, DecisionForm, History } from "@/components/Workflow";
import { ExpensePicker } from "@/components/ExpensePicker";
import { TreasuryReportPanel } from "@/components/Treasury";

export default async function InformePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const r = await db.report.findUnique({
    where: { id },
    include: {
      user: true,
      fund: true,
      expenses: { include: { category: true, project: true }, orderBy: { date: "asc" } },
      approvals: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!r || r.user.companyId !== user.companyId) notFound();
  const mine = r.userId === user.id;
  const isApprover = canApprove(user, r.currentStep, r.user);
  const isTreasury = ["TESORERIA", "ADMIN"].includes(user.role);
  if (!mine && !isApprover && !isTreasury && !["CONTABILIDAD", "CONTROLLER", "ADMIN"].includes(user.role) && r.user.managerId !== user.id) notFound();

  const editable = mine && ["BORRADOR", "OBSERVADO"].includes(r.status);
  const total = reportTotal(r.expenses);
  const incomplete = r.expenses.some((e) => missingFields(e).length > 0);
  const available = editable ? await db.expense.findMany({ where: { userId: user.id, OR: [{ reportId: null }, { reportId: r.id }] }, orderBy: { date: "desc" } }) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{REPORT_TYPES[r.type]}</div>
          <h1 className="h1">{r.title}</h1>
          <div className="mt-1 text-sm text-slate-500">{r.user.name} · creado {fecha(r.createdAt)}</div>
        </div>
        <div className="text-right">
          <StatusBadge status={r.status} />
          <div className="mt-2 text-2xl font-semibold tabular-nums">{clp(total)}</div>
        </div>
      </div>

      <ChainProgress status={r.status} currentStep={r.currentStep} hasManager={Boolean(r.user.managerId)} />

      {r.status === "OBSERVADO" && r.rejectReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <b>Se pidió modificar o arreglar:</b> {r.rejectReason}
          {mine && <div className="mt-1 text-red-700">Corrige los gastos y vuelve a enviar. La cadena de aprobación parte de nuevo.</div>}
        </div>
      )}

      {r.fund && (
        <div className="card text-sm">
          {FUND_TYPES[r.fund.type]}: <Link href={`/fondos/${r.fund.id}`} className="text-emerald-700 hover:underline">{r.fund.reason}</Link> · entregado {clp(r.fund.amount)}
          {r.fund.type === "CAJA_CHICA" && <> · saldo actual {clp(r.fund.balance)}</>}
          {r.fund.type === "FONDO_FIJO" && <> · diferencia {clp(r.fund.amount - total)}</>}
        </div>
      )}

      {r.treasuryAction && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <b>Tesorería:</b> {TREASURY[r.treasuryAction]} {r.treasuryAmount ? `por ${clp(r.treasuryAmount)}` : ""}
          {r.treasuryAction === "DEVOLUCION_SOLICITADA" && r.status !== "CERRADO" && <> · esperando que devuelvas el saldo</>}
          {r.treasuryNote && <div className="text-emerald-800">{r.treasuryNote}</div>}
        </div>
      )}
      {r.erpRef && <div className="text-xs text-slate-500">Registrado en ERP: {r.erpRef} ({fecha(r.erpSyncedAt)})</div>}

      {isApprover && r.status === "EN_APROBACION" && <DecisionForm kind="report" id={r.id} step={r.currentStep!} />}
      {isTreasury && r.status === "APROBADO" && <TreasuryReportPanel report={{ ...r, total }} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Comercio</th><th>Documento</th><th>Categoría</th><th>Proyecto</th><th className="text-right">IVA</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {r.expenses.map((e) => {
                  const missing = missingFields(e);
                  return (
                    <tr key={e.id}>
                      <td>{fecha(e.date)}</td>
                      <td>
                        {mine || e.receiptPath ? (
                          <Link href={mine ? `/gastos/${e.id}` : `/api/files/${e.receiptPath}`} target={mine ? undefined : "_blank"} className="text-emerald-700 hover:underline">{e.merchant ?? "Sin comercio"}</Link>
                        ) : (e.merchant)}
                        {e.rutProvider && <div className="text-xs text-slate-400">{e.rutProvider}</div>}
                        {missing.length > 0 && <div className="text-xs text-amber-700">Falta: {missing.join(", ")}</div>}
                      </td>
                      <td className="text-xs">{e.docType} {e.docNumber}</td>
                      <td>{e.category?.name ?? "—"}</td>
                      <td>{e.project?.name ?? "—"}</td>
                      <td className="text-right tabular-nums">{clp(e.iva)}</td>
                      <td className="text-right tabular-nums">{clp(e.amount)}</td>
                    </tr>
                  );
                })}
                <tr className="font-semibold"><td colSpan={6}>Total</td><td className="text-right tabular-nums">{clp(total)}</td></tr>
              </tbody>
            </table>
          </div>

          {editable && (
            <>
              <form action={setReportExpenses.bind(null, r.id)} className="card space-y-3">
                <h2 className="font-semibold">Gastos del informe</h2>
                <ExpensePicker expenses={available} />
                <button className="btn-secondary">Actualizar gastos</button>
              </form>
              <div className="flex flex-wrap items-center gap-3">
                <form action={submitReport.bind(null, r.id)}>
                  <button className="btn" disabled={r.expenses.length === 0 || incomplete}>
                    {r.status === "OBSERVADO" ? "Reenviar a aprobación" : "Enviar informe"}
                  </button>
                </form>
                {incomplete && <span className="text-sm text-amber-700">Completa los datos faltantes antes de enviar.</span>}
                {r.status === "BORRADOR" && (
                  <form action={deleteReport.bind(null, r.id)}><button className="text-sm text-red-600 hover:underline">Eliminar borrador</button></form>
                )}
              </div>
            </>
          )}
        </div>
        <History items={r.approvals} />
      </div>
    </div>
  );
}
