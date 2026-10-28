import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteReport, rejectExpense, restoreExpense, submitReport } from "@/app/actions";
import { RejectButton } from "@/components/RejectButton";
import { clp, fecha, FUND_TYPES, REPORT_TYPES, STEPS, TREASURY } from "@/lib/format";
import { canApprove, expenseEditMode, missingFields, rejectedTotal, reportTotal } from "@/lib/workflow";
import { StatusBadge } from "@/components/Badge";
import { ChainProgress, DecisionForm, History } from "@/components/Workflow";
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

  const editable = mine && r.status === "BORRADOR";
  const reviewing = isApprover && r.status === "EN_APROBACION";
  // Contabilidad, controller o tesorería pueden editar los gastos mientras el informe está en curso
  const reviewerEdit = expenseEditMode(user, { userId: r.userId, rejectedAt: null, user: r.user, report: r }) === "reviewer";
  const total = reportTotal(r.expenses);
  const rejected = rejectedTotal(r.expenses);
  const rejectedCount = r.expenses.filter((e) => e.rejectedAt).length;
  const incomplete = r.expenses.some((e) => missingFields(e).length > 0);

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
          {rejectedCount > 0 && <div className="text-xs text-red-700">{rejectedCount} {rejectedCount === 1 ? "gasto rechazado" : "gastos rechazados"} ({clp(rejected)}) no se contabiliza{rejectedCount === 1 ? "" : "n"}</div>}
        </div>
      </div>

      <ChainProgress status={r.status} currentStep={r.currentStep} hasManager={Boolean(r.user.managerId)} approvals={r.approvals} />

      {r.status === "RECHAZADO" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <b>Informe rechazado:</b> {r.rejectReason}
          {mine && <div className="mt-1 text-red-700">El informe quedó cerrado y no se pagará.</div>}
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

      {isTreasury && r.status === "APROBADO" && <TreasuryReportPanel report={{ ...r, total }} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Comercio / documento</th><th>Categoría / proyecto</th><th className="text-right">IVA</th><th className="text-right">Total</th>{reviewing && <th />}</tr></thead>
              <tbody>
                {r.expenses.map((e) => {
                  const missing = missingFields(e);
                  return (
                    <Fragment key={e.id}>
                    <tr className={e.rejectedAt ? "bg-slate-50 text-slate-400 line-through [&>td]:border-b-0" : undefined}>
                      <td className="whitespace-nowrap">{fecha(e.date)}</td>
                      <td>
                        {mine || e.receiptPath ? (
                          <Link href={mine ? `/gastos/${e.id}` : `/api/files/${e.receiptPath}`} target={mine ? undefined : "_blank"} className={e.rejectedAt ? "" : "text-emerald-700 hover:underline"}>{e.merchant ?? "Sin comercio"}</Link>
                        ) : (e.merchant)}
                        <div className="text-xs text-slate-400">{[e.docType, e.docNumber, e.rutProvider].filter(Boolean).join(" · ")}</div>
                        {!e.rejectedAt && missing.length > 0 && <div className="text-xs text-amber-700 no-underline">Falta: {missing.join(", ")}</div>}
                        {!e.rejectedAt && (editable || reviewerEdit) && (
                          <Link href={`/gastos/${e.id}`} className="block text-xs text-slate-500 underline hover:text-emerald-700">Editar</Link>
                        )}
                      </td>
                      <td>
                        {e.category?.name ?? "—"}
                        {e.project && <div className="text-xs text-slate-400">{e.project.name}</div>}
                      </td>
                      <td className="text-right tabular-nums">{clp(e.iva)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{clp(e.amount)}</td>
                      {reviewing && (
                        <td className="text-right no-underline">
                          {!e.rejectedAt && <RejectButton action={rejectExpense.bind(null, r.id, e.id)} label="Rechazar" title={`Rechazar gasto: ${e.merchant ?? "sin comercio"} (${clp(e.amount)})`} small />}
                        </td>
                      )}
                    </tr>
                    {e.rejectedAt && (
                      <tr className="bg-slate-50">
                        <td colSpan={reviewing ? 6 : 5} className="text-sm text-red-700">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>✕ Rechazado por {e.rejectedBy}{e.rejectedStep ? ` (${STEPS[e.rejectedStep] ?? e.rejectedStep})` : ""}: {e.rejectedReason}</span>
                            {reviewing && e.rejectedStep === r.currentStep && (
                              <form action={restoreExpense.bind(null, r.id, e.id)}>
                                <button className="text-xs text-slate-600 underline hover:text-slate-900">Deshacer</button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
                <tr className="font-semibold"><td colSpan={4}>{rejectedCount > 0 ? "Total aprobado" : "Total"}</td><td className="text-right tabular-nums">{clp(total)}</td>{reviewing && <td />}</tr>
              </tbody>
            </table>
          </div>

          {reviewing && <DecisionForm kind="report" id={r.id} step={r.currentStep!} />}

          {editable && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/informes/${r.id}/editar`} className="btn-secondary">← Volver a elegir gastos</Link>
                <form action={submitReport.bind(null, r.id)}>
                  <button className="btn" disabled={r.expenses.length === 0 || incomplete}>
                    Enviar informe
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
