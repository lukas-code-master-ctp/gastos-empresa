"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clearSession, requireUser, setSession } from "@/lib/auth";
import { canApprove, firstStep, missingFields, nextStep, reportTotal } from "@/lib/workflow";
import { registerInErp } from "@/lib/erp";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const int = (f: FormData, k: string) => {
  const v = str(f, k);
  if (!v) return null;
  const n = parseInt(v.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

// ---------- Sesión ----------

export async function login(formData: FormData) {
  await setSession(String(formData.get("userId")));
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

// ---------- Gastos ----------

export async function createBlankExpense() {
  const user = await requireUser();
  const e = await db.expense.create({ data: { userId: user.id } });
  redirect(`/gastos/${e.id}`);
}

export async function updateExpense(id: string, formData: FormData) {
  const user = await requireUser();
  const e = await db.expense.findUniqueOrThrow({ where: { id }, include: { report: true } });
  if (e.userId !== user.id) throw new Error("No autorizado");
  if (e.report && !["BORRADOR", "OBSERVADO"].includes(e.report.status)) throw new Error("El gasto ya está en aprobación");
  const date = str(formData, "date");
  await db.expense.update({
    where: { id },
    data: {
      merchant: str(formData, "merchant"),
      rutProvider: str(formData, "rutProvider"),
      docType: str(formData, "docType"),
      docNumber: str(formData, "docNumber"),
      date: date ? new Date(`${date}T12:00:00`) : null,
      amount: int(formData, "amount"),
      iva: int(formData, "iva"),
      categoryId: str(formData, "categoryId"),
      projectId: str(formData, "projectId"),
      note: str(formData, "note"),
      observation: null, // al guardar se da por corregido
    },
  });
  revalidatePath("/gastos");
  redirect(e.reportId ? `/informes/${e.reportId}` : "/gastos");
}

export async function deleteExpense(id: string) {
  const user = await requireUser();
  const e = await db.expense.findUniqueOrThrow({ where: { id } });
  if (e.userId !== user.id || e.reportId) throw new Error("No se puede eliminar");
  await db.expense.delete({ where: { id } });
  redirect("/gastos");
}

// ---------- Informes ----------

export async function createReport(formData: FormData) {
  const user = await requireUser();
  const type = String(formData.get("type"));
  const ids = formData.getAll("expenseIds").map(String);
  let fundId: string | null = null;
  if (type !== "REEMBOLSO") {
    const fund = await db.fund.findFirst({ where: { userId: user.id, type, status: "ACTIVO" } });
    if (!fund) throw new Error("No tienes un fondo activo de este tipo. Solicítalo primero.");
    fundId = fund.id;
  }
  const report = await db.report.create({
    data: {
      type,
      title: str(formData, "title") ?? "Informe de gastos",
      userId: user.id,
      fundId,
      expenses: { connect: ids.map((id) => ({ id })) },
    },
  });
  redirect(`/informes/${report.id}`);
}

export async function setReportExpenses(id: string, formData: FormData) {
  const user = await requireUser();
  const r = await db.report.findUniqueOrThrow({ where: { id } });
  if (r.userId !== user.id || !["BORRADOR", "OBSERVADO"].includes(r.status)) throw new Error("No editable");
  const ids = formData.getAll("expenseIds").map(String);
  await db.expense.updateMany({ where: { reportId: id }, data: { reportId: null } });
  await db.expense.updateMany({ where: { id: { in: ids }, userId: user.id, reportId: null }, data: { reportId: id } });
  revalidatePath(`/informes/${id}`);
}

export async function submitReport(id: string) {
  const user = await requireUser();
  const r = await db.report.findUniqueOrThrow({ where: { id }, include: { expenses: true, fund: true } });
  if (r.userId !== user.id || !["BORRADOR", "OBSERVADO"].includes(r.status)) throw new Error("No se puede enviar");
  if (r.expenses.length === 0) throw new Error("El informe no tiene gastos");
  const incompletos = r.expenses.filter((e) => missingFields(e).length > 0);
  if (incompletos.length) throw new Error("Hay gastos con datos faltantes");
  if (r.type === "CAJA_CHICA" && r.fund && reportTotal(r.expenses) > r.fund.balance)
    throw new Error("El total supera el saldo de la caja chica");
  await db.report.update({
    where: { id },
    data: { status: "EN_APROBACION", currentStep: firstStep(user), rejectReason: null, submittedAt: new Date() },
  });
  await db.expense.updateMany({ where: { reportId: id }, data: { observation: null } });
  await db.approval.create({ data: { reportId: id, step: "ENVIO", decision: "ENVIADO", userId: user.id } });
  revalidatePath(`/informes/${id}`);
}

export async function deleteReport(id: string) {
  const user = await requireUser();
  const r = await db.report.findUniqueOrThrow({ where: { id } });
  if (r.userId !== user.id || r.status !== "BORRADOR") throw new Error("No se puede eliminar");
  await db.expense.updateMany({ where: { reportId: id }, data: { reportId: null } });
  await db.report.delete({ where: { id } });
  redirect("/informes");
}

// ---------- Aprobación (informes y solicitudes de fondo) ----------

export async function decide(kind: "report" | "fund", id: string, formData: FormData) {
  const user = await requireUser();
  // APROBADO avanza la cadena · MODIFICAR devuelve al usuario · RECHAZADO cierra la solicitud
  const decision = String(formData.get("decision"));
  if (!["APROBADO", "MODIFICAR", "RECHAZADO"].includes(decision)) throw new Error("Decisión inválida");
  const approve = decision === "APROBADO";
  const comment = str(formData, "comment");
  if (!approve && !comment) throw new Error("Debes indicar el motivo");

  const item =
    kind === "report"
      ? await db.report.findUniqueOrThrow({ where: { id }, include: { user: true } })
      : await db.fund.findUniqueOrThrow({ where: { id }, include: { user: true } });
  if (item.status !== "EN_APROBACION" || !canApprove(user, item.currentStep, item.user))
    throw new Error("No te corresponde aprobar este paso");

  const step = item.currentStep!;
  const next = approve ? nextStep(step) : null;
  const data = approve
    ? next
      ? { currentStep: next }
      : { currentStep: null, status: "APROBADO" }
    : { currentStep: null, status: decision === "MODIFICAR" ? "OBSERVADO" : "RECHAZADO", rejectReason: comment };

  if (kind === "report") await db.report.update({ where: { id }, data });
  else await db.fund.update({ where: { id }, data });
  // Al pedir modificar, se marcan los gastos que el aprobador indicó con el motivo
  if (kind === "report" && decision === "MODIFICAR") {
    const flagged = formData.getAll("flaggedIds").map(String);
    await db.expense.updateMany({ where: { reportId: id }, data: { observation: null } });
    if (flagged.length) await db.expense.updateMany({ where: { reportId: id, id: { in: flagged } }, data: { observation: comment } });
  }
  await db.approval.create({
    data: { [kind === "report" ? "reportId" : "fundId"]: id, step, decision, comment, userId: user.id },
  });

  // Gasto aprobado → se registra en el ERP
  if (kind === "report" && approve && !next) {
    try {
      await registerInErp(id);
    } catch (err) {
      console.error("Error integrando con ERP", err);
    }
  }
  revalidatePath("/aprobaciones");
  redirect("/aprobaciones");
}

// ---------- Fondos ----------

export async function createFund(formData: FormData) {
  const user = await requireUser();
  const amount = int(formData, "amount");
  const reason = str(formData, "reason");
  if (!amount || amount <= 0 || !reason) throw new Error("Monto y motivo son obligatorios");
  const fund = await db.fund.create({
    data: { type: String(formData.get("type")), userId: user.id, amount, reason, currentStep: firstStep(user) },
  });
  await db.approval.create({ data: { fundId: fund.id, step: "ENVIO", decision: "ENVIADO", userId: user.id } });
  redirect(`/fondos/${fund.id}`);
}

export async function resubmitFund(id: string, formData: FormData) {
  const user = await requireUser();
  const f = await db.fund.findUniqueOrThrow({ where: { id } });
  if (f.userId !== user.id || f.status !== "OBSERVADO") throw new Error("No editable");
  await db.fund.update({
    where: { id },
    data: {
      amount: int(formData, "amount") ?? f.amount,
      reason: str(formData, "reason") ?? f.reason,
      status: "EN_APROBACION",
      currentStep: firstStep(user),
      rejectReason: null,
    },
  });
  await db.approval.create({ data: { fundId: id, step: "ENVIO", decision: "ENVIADO", userId: user.id } });
  revalidatePath(`/fondos/${id}`);
}

// ---------- Tesorería ----------

async function requireTreasury() {
  const user = await requireUser();
  if (!["TESORERIA", "ADMIN"].includes(user.role)) throw new Error("Solo tesorería");
  return user;
}

export async function deliverFund(id: string) {
  const user = await requireTreasury();
  const f = await db.fund.findUniqueOrThrow({ where: { id } });
  if (f.status !== "APROBADO") throw new Error("El fondo no está aprobado");
  await db.fund.update({ where: { id }, data: { status: "ACTIVO", balance: f.amount } });
  await db.approval.create({ data: { fundId: id, step: "TESORERIA", decision: "TESORERIA", comment: "ENTREGA_FONDO", userId: user.id } });
  revalidatePath("/tesoreria");
}

// Rama de tesorería del diagrama: ¿Es reembolso? / Caja chica / Fondo fijo → ¿Calzó? → ¿Sobró?
export async function settleReport(id: string, formData: FormData) {
  const user = await requireTreasury();
  const r = await db.report.findUniqueOrThrow({ where: { id }, include: { expenses: true, fund: true } });
  if (r.status !== "APROBADO" || r.treasuryAction) throw new Error("El informe no está pendiente en tesorería");
  const total = reportTotal(r.expenses);
  const note = str(formData, "note");
  let action: string;
  let amount = total;
  let closeReport = true;

  if (r.type === "REEMBOLSO") {
    action = "DEPOSITO_REEMBOLSO";
  } else if (r.type === "CAJA_CHICA") {
    action = "DESCUENTO_CAJA";
    await db.fund.update({ where: { id: r.fundId! }, data: { balance: { decrement: total } } });
  } else {
    const diff = r.fund!.amount - total;
    if (diff === 0) {
      action = "CIERRE_CUADRADO";
      amount = 0;
    } else if (diff > 0) {
      action = "DEVOLUCION_SOLICITADA";
      amount = diff;
      closeReport = false; // se cierra al confirmar la devolución
    } else {
      action = "DEPOSITO_DIFERENCIA";
      amount = -diff;
    }
    if (closeReport) await db.fund.update({ where: { id: r.fundId! }, data: { status: "CERRADO", balance: 0, closedAt: new Date() } });
  }

  await db.report.update({
    where: { id },
    data: {
      treasuryAction: action,
      treasuryAmount: amount,
      treasuryNote: note,
      ...(closeReport ? { status: "CERRADO", closedAt: new Date() } : {}),
    },
  });
  await db.approval.create({ data: { reportId: id, step: "TESORERIA", decision: "TESORERIA", comment: action, userId: user.id } });
  revalidatePath("/tesoreria");
}

export async function confirmReturn(id: string) {
  const user = await requireTreasury();
  const r = await db.report.findUniqueOrThrow({ where: { id } });
  if (r.treasuryAction !== "DEVOLUCION_SOLICITADA" || r.status === "CERRADO") throw new Error("Nada que confirmar");
  await db.report.update({ where: { id }, data: { status: "CERRADO", closedAt: new Date() } });
  if (r.fundId) await db.fund.update({ where: { id: r.fundId }, data: { status: "CERRADO", balance: 0, closedAt: new Date() } });
  await db.approval.create({ data: { reportId: id, step: "TESORERIA", decision: "TESORERIA", comment: "DEVOLUCION_RECIBIDA", userId: user.id } });
  revalidatePath("/tesoreria");
}

export async function closeCajaChica(id: string) {
  const user = await requireTreasury();
  const f = await db.fund.findUniqueOrThrow({ where: { id } });
  if (f.type !== "CAJA_CHICA" || f.status !== "ACTIVO") throw new Error("No aplica");
  await db.fund.update({ where: { id }, data: { status: "CERRADO", closedAt: new Date() } });
  await db.approval.create({ data: { fundId: id, step: "TESORERIA", decision: "TESORERIA", comment: `CIERRE_CAJA saldo ${f.balance}`, userId: user.id } });
  revalidatePath("/tesoreria");
}
