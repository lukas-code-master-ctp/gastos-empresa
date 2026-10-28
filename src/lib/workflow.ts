import { db } from "./db";

// Cadena de aprobación del diagrama: Jefe directo → Contabilidad → Controller.
export const CHAIN = ["JEFE", "CONTABILIDAD", "CONTROLLER"] as const;
export type Step = (typeof CHAIN)[number];

type Approver = { id: string; role: string };
type Owner = { managerId: string | null };

export function firstStep(owner: Owner): Step {
  // Si quien rinde no tiene jefe directo, parte en contabilidad.
  return owner.managerId ? "JEFE" : "CONTABILIDAD";
}

export function nextStep(step: string): Step | null {
  const i = CHAIN.indexOf(step as Step);
  return i >= 0 && i < CHAIN.length - 1 ? CHAIN[i + 1] : null;
}

export function canApprove(user: Approver, step: string | null, owner: Owner & { id: string }) {
  if (!step || user.id === owner.id) return false;
  if (user.role === "ADMIN") return true;
  if (step === "JEFE") return owner.managerId === user.id;
  return user.role === step;
}

export const reportTotal = (expenses: { amount: number | null }[]) =>
  expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

// Campos mínimos para que un gasto pueda ir en un informe.
export function missingFields(e: {
  merchant: string | null;
  amount: number | null;
  date: Date | null;
  docType: string | null;
  categoryId: string | null;
}) {
  const m: string[] = [];
  if (!e.merchant) m.push("comercio");
  if (!e.amount) m.push("monto");
  if (!e.date) m.push("fecha");
  if (!e.docType) m.push("tipo de documento");
  if (!e.categoryId) m.push("categoría");
  return m;
}

// Lo que el usuario tiene pendiente de aprobar, según su rol.
export async function pendingApprovals(user: Approver & { companyId: string }) {
  const stepFilter =
    user.role === "ADMIN"
      ? {}
      : {
          OR: [
            { currentStep: "JEFE", user: { managerId: user.id } },
            ...(["CONTABILIDAD", "CONTROLLER"].includes(user.role) ? [{ currentStep: user.role }] : []),
          ],
        };
  const base = { status: "EN_APROBACION", user: { companyId: user.companyId }, NOT: { userId: user.id } };
  const [reports, funds] = await Promise.all([
    db.report.findMany({ where: { ...base, ...stepFilter }, include: { user: true, expenses: true }, orderBy: { submittedAt: "asc" } }),
    db.fund.findMany({ where: { ...base, ...stepFilter }, include: { user: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return { reports, funds };
}
