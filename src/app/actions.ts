"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clearSession, demoEnabled, requireUser, setSession } from "@/lib/auth";
import { canApprove, expenseEditMode, missingFields, nextStep, reportTotal, startFlow } from "@/lib/workflow";
import { kindsOf, stepDefSchema } from "@/lib/flows";
import { z } from "zod";
import { clp, fecha } from "@/lib/format";
import { registerInErp } from "@/lib/erp";
import { saveFile } from "@/lib/storage";

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

// Selector de demo: solo funciona si el modo demo está activo (sin Google o con DEMO_LOGIN=1)
export async function login(formData: FormData) {
  if (!demoEnabled()) throw new Error("El ingreso de demo está desactivado");
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
  const e = await db.expense.findUniqueOrThrow({ where: { id }, include: { report: true, user: true, category: true, project: true } });
  const mode = expenseEditMode(user, e);
  if (!mode) throw new Error("No puedes editar este gasto");
  const date = str(formData, "date");
  const data = {
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
  };
  const updated = await db.expense.update({ where: { id }, data, include: { category: true, project: true } });

  // Edición de un revisor: queda en el historial del informe qué cambió
  if (mode === "reviewer" && e.reportId) {
    const changes = describeChanges(e, updated);
    if (changes.length) {
      await db.approval.create({
        data: { reportId: e.reportId, step: user.role, decision: "EDITADO", comment: `${e.merchant ?? "gasto"}: ${changes.join("; ")}`, userId: user.id },
      });
      if (e.report?.erpSyncedAt) await registerInErp(e.reportId).catch((err) => console.error("Error integrando con ERP", err));
    }
  }
  revalidatePath("/gastos");
  redirect(e.reportId ? `/informes/${e.reportId}` : "/gastos");
}

type ExpenseView = {
  merchant: string | null; rutProvider: string | null; docType: string | null; docNumber: string | null; date: Date | null;
  amount: number | null; iva: number | null; note: string | null; category: { name: string } | null; project: { name: string } | null;
};

function describeChanges(before: ExpenseView, after: ExpenseView) {
  const fields: [string, (e: ExpenseView) => string][] = [
    ["Comercio", (e) => e.merchant ?? "—"],
    ["RUT proveedor", (e) => e.rutProvider ?? "—"],
    ["Tipo de documento", (e) => e.docType ?? "—"],
    ["N° documento", (e) => e.docNumber ?? "—"],
    ["Fecha", (e) => fecha(e.date)],
    ["Monto", (e) => clp(e.amount)],
    ["IVA", (e) => clp(e.iva)],
    ["Categoría", (e) => e.category?.name ?? "—"],
    ["Proyecto", (e) => e.project?.name ?? "—"],
    ["Nota", (e) => e.note ?? "—"],
  ];
  return fields.filter(([, f]) => f(before) !== f(after)).map(([label, f]) => `${label} ${f(before)} → ${f(after)}`);
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
  if (r.userId !== user.id || r.status !== "BORRADOR") throw new Error("No editable");
  const ids = formData.getAll("expenseIds").map(String);
  await db.report.update({ where: { id }, data: { title: str(formData, "title") ?? r.title } });
  await db.expense.updateMany({ where: { reportId: id }, data: { reportId: null } });
  await db.expense.updateMany({ where: { id: { in: ids }, userId: user.id, reportId: null }, data: { reportId: id } });
  redirect(`/informes/${id}`);
}

export async function submitReport(id: string) {
  const user = await requireUser();
  const r = await db.report.findUniqueOrThrow({ where: { id }, include: { expenses: true, fund: true } });
  if (r.userId !== user.id || r.status !== "BORRADOR") throw new Error("No se puede enviar");
  if (r.expenses.length === 0) throw new Error("El informe no tiene gastos");
  const incompletos = r.expenses.filter((e) => missingFields(e).length > 0);
  if (incompletos.length) throw new Error("Hay gastos con datos faltantes");
  if (r.type === "CAJA_CHICA" && r.fund && reportTotal(r.expenses) > r.fund.balance)
    throw new Error("El total supera el saldo de la caja chica");
  await db.report.update({
    where: { id },
    data: { status: "EN_APROBACION", ...(await startFlow(user.companyId, r.type, user, reportTotal(r.expenses))), rejectReason: null, submittedAt: new Date() },
  });
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
  // APROBADO avanza la cadena con los gastos no rechazados · RECHAZADO cierra todo
  const decision = String(formData.get("decision"));
  if (!["APROBADO", "RECHAZADO"].includes(decision)) throw new Error("Decisión inválida");
  const comment = str(formData, "comment");
  if (decision === "RECHAZADO" && !comment) throw new Error("Debes indicar el motivo del rechazo");

  const item =
    kind === "report"
      ? await db.report.findUniqueOrThrow({ where: { id }, include: { user: true } })
      : await db.fund.findUniqueOrThrow({ where: { id }, include: { user: true } });
  if (item.status !== "EN_APROBACION" || !canApprove(user, item))
    throw new Error("No te corresponde aprobar este paso");
  const step = item.currentStep!;

  const approve = decision === "APROBADO";
  if (kind === "report" && !approve) {
    // Rechazar el informe completo deja rechazados todos sus gastos pendientes
    await db.expense.updateMany({
      where: { reportId: id, rejectedAt: null },
      data: { rejectedAt: new Date(), rejectedReason: comment, rejectedStep: step, rejectedBy: user.name },
    });
  }

  const next = approve ? nextStep(item, step) : null;
  const data = approve
    ? next
      ? { currentStep: next }
      : { currentStep: null, status: "APROBADO" }
    : { currentStep: null, status: "RECHAZADO", rejectReason: comment };
  if (kind === "report") await db.report.update({ where: { id }, data });
  else await db.fund.update({ where: { id }, data });
  await db.approval.create({
    data: {
      [kind === "report" ? "reportId" : "fundId"]: id,
      step,
      decision: approve ? "APROBADO" : "RECHAZADO",
      comment: approve ? null : comment,
      userId: user.id,
    },
  });

  // Gasto aprobado → se registra en el ERP (solo los gastos no rechazados)
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

// Rechazo de un gasto puntual desde su fila. Si era el último pendiente, se rechaza el informe.
export async function rejectExpense(reportId: string, expenseId: string, formData: FormData) {
  const user = await requireUser();
  const comment = str(formData, "comment");
  if (!comment) throw new Error("Debes indicar el motivo del rechazo");
  const r = await db.report.findUniqueOrThrow({ where: { id: reportId }, include: { user: true } });
  if (r.status !== "EN_APROBACION" || !canApprove(user, r)) throw new Error("No te corresponde revisar este paso");
  const e = await db.expense.findFirstOrThrow({ where: { id: expenseId, reportId, rejectedAt: null } });
  const step = r.currentStep!;
  await db.expense.update({
    where: { id: e.id },
    data: { rejectedAt: new Date(), rejectedReason: comment, rejectedStep: step, rejectedBy: user.name },
  });
  await db.approval.create({
    data: { reportId, step, decision: "GASTO_RECHAZADO", comment: `${e.merchant ?? "gasto"} (${clp(e.amount)}): ${comment}`, userId: user.id },
  });
  const pending = await db.expense.count({ where: { reportId, rejectedAt: null } });
  if (pending === 0) {
    await db.report.update({ where: { id: reportId }, data: { currentStep: null, status: "RECHAZADO", rejectReason: "Todos los gastos fueron rechazados" } });
    await db.approval.create({ data: { reportId, step, decision: "RECHAZADO", comment: "Todos los gastos fueron rechazados", userId: user.id } });
    redirect("/aprobaciones");
  }
  revalidatePath(`/informes/${reportId}`);
}

// Deshacer el rechazo de un gasto mientras el informe sigue en el mismo paso
export async function restoreExpense(reportId: string, expenseId: string) {
  const user = await requireUser();
  const r = await db.report.findUniqueOrThrow({ where: { id: reportId }, include: { user: true } });
  if (r.status !== "EN_APROBACION" || !canApprove(user, r)) throw new Error("No te corresponde revisar este paso");
  const e = await db.expense.findFirstOrThrow({ where: { id: expenseId, reportId, rejectedStep: r.currentStep } });
  await db.expense.update({ where: { id: e.id }, data: { rejectedAt: null, rejectedReason: null, rejectedStep: null, rejectedBy: null } });
  await db.approval.create({ data: { reportId, step: r.currentStep!, decision: "GASTO_RESTAURADO", comment: e.merchant ?? "gasto", userId: user.id } });
  revalidatePath(`/informes/${reportId}`);
}

// ---------- Fondos ----------

export async function createFund(formData: FormData) {
  const user = await requireUser();
  const amount = int(formData, "amount");
  const reason = str(formData, "reason");
  if (!amount || amount <= 0 || !reason) throw new Error("Monto y motivo son obligatorios");
  const fund = await db.fund.create({
    data: { type: String(formData.get("type")), userId: user.id, amount, reason, ...(await startFlow(user.companyId, "SOLICITUD_FONDO", user, amount)) },
  });
  await db.approval.create({ data: { fundId: fund.id, step: "ENVIO", decision: "ENVIADO", userId: user.id } });
  redirect(`/fondos/${fund.id}`);
}

// ---------- Flujos de aprobación (admin) ----------

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Solo el administrador");
  return user;
}

// ---------- Usuarios (admin) ----------

const ROLE_KEYS = ["EMPLEADO", "JEFE", "CONTABILIDAD", "CONTROLLER", "TESORERIA", "ADMIN"];

// Crea (id null) o edita un usuario de la empresa. Entra con Google usando ese correo.
export async function saveUser(id: string | null, formData: FormData) {
  const admin = await requireAdmin();
  const name = str(formData, "name");
  const email = str(formData, "email")?.toLowerCase();
  const role = str(formData, "role") ?? "EMPLEADO";
  const managerId = str(formData, "managerId");
  if (!name) throw new Error("Falta el nombre");
  if (!email || !z.email().safeParse(email).success) throw new Error("Correo inválido");
  if (!ROLE_KEYS.includes(role)) throw new Error("Rol inválido");
  if (managerId && (managerId === id || !(await db.user.count({ where: { id: managerId, companyId: admin.companyId } }))))
    throw new Error("Jefe directo inválido");
  const taken = await db.user.findUnique({ where: { email } });
  if (taken && taken.id !== id) throw new Error(`Ya existe un usuario con ${email}`);
  if (id === admin.id && role !== "ADMIN") throw new Error("No puedes quitarte el rol de administrador");
  const data = { name, email, role, managerId };
  if (id) {
    const u = await db.user.findFirstOrThrow({ where: { id, companyId: admin.companyId } });
    await db.user.update({ where: { id: u.id }, data });
  } else {
    await db.user.create({ data: { ...data, companyId: admin.companyId } });
  }
  revalidatePath("/admin/usuarios");
}

// Guarda un flujo nuevo (id null) o editado. Los informes ya enviados conservan el flujo con que partieron.
export async function saveFlow(id: string | null, formData: FormData) {
  const user = await requireAdmin();
  const name = str(formData, "name");
  if (!name) throw new Error("Ponle un nombre al flujo");
  const kinds = kindsOf(formData.getAll("appliesTo").map(String).join(","));
  if (kinds.length === 0) throw new Error("Elige al menos un tipo");
  const steps = z.array(stepDefSchema).min(1, "Agrega al menos un paso").max(12).parse(JSON.parse(String(formData.get("steps") ?? "[]")));
  for (const s of steps) {
    if (s.kind === "ROLE" && !s.role) throw new Error("Falta elegir el rol de un paso");
    if (s.kind === "USER" && !s.userId) throw new Error("Falta elegir la persona de un paso");
  }
  const userIds = steps.flatMap((s) => (s.kind === "USER" ? [s.userId!] : []));
  if (userIds.length && (await db.user.count({ where: { id: { in: userIds }, companyId: user.companyId } })) !== new Set(userIds).size)
    throw new Error("Hay una persona que no es de la empresa");

  // Cada tipo usa un solo flujo: si otro flujo lo tenía, se le quita
  const others = await db.approvalFlow.findMany({ where: { companyId: user.companyId, ...(id ? { NOT: { id } } : {}) } });
  for (const o of others) {
    const left = kindsOf(o.appliesTo).filter((k) => !kinds.includes(k));
    if (left.length !== kindsOf(o.appliesTo).length) await db.approvalFlow.update({ where: { id: o.id }, data: { appliesTo: left.join(",") } });
  }
  const data = { name, appliesTo: kinds.join(","), steps: JSON.stringify(steps) };
  if (id) {
    const f = await db.approvalFlow.findFirstOrThrow({ where: { id, companyId: user.companyId } });
    await db.approvalFlow.update({ where: { id: f.id }, data });
  } else {
    await db.approvalFlow.create({ data: { ...data, companyId: user.companyId } });
  }
  revalidatePath("/admin/flujos");
  redirect("/admin/flujos");
}

// Borrar un flujo: sus tipos vuelven al flujo estándar
export async function deleteFlow(id: string) {
  const user = await requireAdmin();
  await db.approvalFlow.deleteMany({ where: { id, companyId: user.companyId } });
  revalidatePath("/admin/flujos");
  redirect("/admin/flujos");
}

// ---------- Tesorería ----------

async function requireTreasury() {
  const user = await requireUser();
  if (!["TESORERIA", "ADMIN"].includes(user.role)) throw new Error("Solo tesorería");
  return user;
}

// Comprobante opcional de tesorería (imagen o PDF)
async function treasuryAttachment(formData?: FormData) {
  const file = formData?.get("receipt");
  if (!(file instanceof File) || file.size === 0) return {};
  if (file.size > 10 * 1024 * 1024) throw new Error("El comprobante supera 10 MB");
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") throw new Error("El comprobante debe ser imagen o PDF");
  const attachmentPath = await saveFile(Buffer.from(await file.arrayBuffer()), file.type);
  return { attachmentPath, attachmentMime: file.type };
}

export async function deliverFund(id: string, formData?: FormData) {
  const user = await requireTreasury();
  const f = await db.fund.findUniqueOrThrow({ where: { id } });
  if (f.status !== "APROBADO") throw new Error("El fondo no está aprobado");
  const att = await treasuryAttachment(formData);
  await db.fund.update({ where: { id }, data: { status: "ACTIVO", balance: f.amount } });
  await db.approval.create({ data: { fundId: id, step: "TESORERIA", decision: "TESORERIA", comment: "ENTREGA_FONDO", userId: user.id, ...att } });
  revalidatePath("/tesoreria");
}

// Rama de tesorería del diagrama: ¿Es reembolso? / Caja chica / Fondo fijo → ¿Calzó? → ¿Sobró?
export async function settleReport(id: string, formData: FormData) {
  const user = await requireTreasury();
  const r = await db.report.findUniqueOrThrow({ where: { id }, include: { expenses: true, fund: true } });
  if (r.status !== "APROBADO" || r.treasuryAction) throw new Error("El informe no está pendiente en tesorería");
  const total = reportTotal(r.expenses);
  const note = str(formData, "note");
  const att = await treasuryAttachment(formData);
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
  await db.approval.create({ data: { reportId: id, step: "TESORERIA", decision: "TESORERIA", comment: action, userId: user.id, ...att } });
  revalidatePath("/tesoreria");
}

export async function confirmReturn(id: string, formData?: FormData) {
  const user = await requireTreasury();
  const r = await db.report.findUniqueOrThrow({ where: { id } });
  if (r.treasuryAction !== "DEVOLUCION_SOLICITADA" || r.status === "CERRADO") throw new Error("Nada que confirmar");
  const att = await treasuryAttachment(formData);
  await db.report.update({ where: { id }, data: { status: "CERRADO", closedAt: new Date() } });
  if (r.fundId) await db.fund.update({ where: { id: r.fundId }, data: { status: "CERRADO", balance: 0, closedAt: new Date() } });
  await db.approval.create({ data: { reportId: id, step: "TESORERIA", decision: "TESORERIA", comment: "DEVOLUCION_RECIBIDA", userId: user.id, ...att } });
  revalidatePath("/tesoreria");
}

// Cierre de caja chica: si queda saldo se pide devolución y se cierra al recibirla
export async function closeCajaChica(id: string) {
  const user = await requireTreasury();
  const f = await db.fund.findUniqueOrThrow({ where: { id }, include: { reports: true } });
  if (f.type !== "CAJA_CHICA" || f.status !== "ACTIVO") throw new Error("No aplica");
  if (f.reports.some((r) => ["EN_APROBACION", "APROBADO"].includes(r.status)))
    throw new Error("Hay rendiciones de esta caja en curso. Ciérralas antes de cerrar la caja.");
  if (f.balance > 0) {
    await db.fund.update({ where: { id }, data: { status: "DEVOLUCION_PENDIENTE" } });
    await db.approval.create({ data: { fundId: id, step: "TESORERIA", decision: "TESORERIA", comment: `DEVOLUCION_CAJA_SOLICITADA:${f.balance}`, userId: user.id } });
  } else {
    await db.fund.update({ where: { id }, data: { status: "CERRADO", closedAt: new Date() } });
    await db.approval.create({ data: { fundId: id, step: "TESORERIA", decision: "TESORERIA", comment: "CIERRE_CAJA", userId: user.id } });
  }
  revalidatePath(`/fondos/${id}`);
  revalidatePath("/tesoreria");
}

export async function confirmCajaReturn(id: string, formData?: FormData) {
  const user = await requireTreasury();
  const f = await db.fund.findUniqueOrThrow({ where: { id } });
  if (f.status !== "DEVOLUCION_PENDIENTE") throw new Error("Nada que confirmar");
  const att = await treasuryAttachment(formData);
  await db.fund.update({ where: { id }, data: { status: "CERRADO", balance: 0, closedAt: new Date() } });
  await db.approval.create({ data: { fundId: id, step: "TESORERIA", decision: "TESORERIA", comment: `DEVOLUCION_CAJA_RECIBIDA:${f.balance}`, userId: user.id, ...att } });
  revalidatePath(`/fondos/${id}`);
  revalidatePath("/tesoreria");
}
