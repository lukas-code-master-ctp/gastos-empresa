import { db } from "./db";
import { approverLabel, parseSteps, STANDARD_STEPS, type FlowStep, type StepDef } from "./flows";

type Approver = { id: string; role: string };
type Owner = { id: string; managerId: string | null };
// Informe o solicitud de fondo en el flujo
type InFlow = { currentStep: string | null; flowSteps: string | null; user: Owner };

// Pasos que aplican a quien rinde y al monto. El jefe directo se salta si no tiene jefe,
// y nadie aprueba lo propio.
function resolveSteps(defs: StepDef[], owner: Owner, amount: number, names: Map<string, string>): FlowStep[] {
  return defs
    .filter((s) => (s.kind === "JEFE" ? Boolean(owner.managerId) : true))
    .filter((s) => !(s.kind === "USER" && (!s.userId || s.userId === owner.id || !names.has(s.userId))))
    .filter((s) => !s.minAmount || amount >= s.minAmount)
    .map((s) => ({ id: s.id, kind: s.kind, role: s.role, userId: s.userId, label: approverLabel(s, (id) => names.get(id)) }));
}

// Pasos del informe o fondo: los que se guardaron al enviarlo, o el estándar si se envió antes
export function flowOf(item: { flowSteps: string | null; user: Owner }): FlowStep[] {
  if (item.flowSteps) {
    try {
      return JSON.parse(item.flowSteps) as FlowStep[];
    } catch {}
  }
  return resolveSteps(STANDARD_STEPS, item.user, 0, new Map());
}

export function stepLabel(item: { flowSteps: string | null; user: Owner }, stepId: string | null) {
  if (!stepId) return "";
  return flowOf(item).find((s) => s.id === stepId)?.label ?? stepId;
}

// Al enviar: elige el flujo de la empresa para ese tipo, lo resuelve y lo deja guardado
export async function startFlow(companyId: string, kind: string, owner: Owner, amount: number) {
  const flows = await db.approvalFlow.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } });
  const flow = flows.find((f) => f.appliesTo.split(",").includes(kind));
  const defs = flow ? parseSteps(flow.steps) : STANDARD_STEPS;
  const userIds = defs.flatMap((s) => (s.kind === "USER" && s.userId ? [s.userId] : []));
  const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds }, companyId } }) : [];
  let steps = resolveSteps(defs, owner, amount, new Map(users.map((u) => [u.id, u.name])));
  // Si ningún paso aplica, igual lo revisa alguien: el admin
  if (steps.length === 0) steps = [{ id: "ADMIN", kind: "ROLE", role: "ADMIN", label: "Administrador" }];
  return { currentStep: steps[0].id, flowSteps: JSON.stringify(steps) };
}

export function nextStep(item: { flowSteps: string | null; user: Owner }, step: string): string | null {
  const steps = flowOf(item);
  const i = steps.findIndex((s) => s.id === step);
  return i >= 0 && i < steps.length - 1 ? steps[i + 1].id : null;
}

export function canApprove(user: Approver, item: InFlow) {
  const step = item.currentStep && flowOf(item).find((s) => s.id === item.currentStep);
  if (!step || user.id === item.user.id) return false;
  if (user.role === "ADMIN") return true;
  if (step.kind === "JEFE") return item.user.managerId === user.id;
  if (step.kind === "USER") return step.userId === user.id;
  return user.role === step.role;
}

// ¿Aparece esta persona en algún paso? (para dejarla ver el informe)
export const inFlow = (user: Approver, item: InFlow) =>
  flowOf(item).some((s) => (s.kind === "USER" ? s.userId === user.id : s.kind === "ROLE" ? s.role === user.role : item.user.managerId === user.id));

// Solo cuentan los gastos que no fueron rechazados
export const reportTotal = (expenses: { amount: number | null; rejectedAt?: Date | null }[]) =>
  expenses.reduce((s, e) => s + (e.rejectedAt ? 0 : (e.amount ?? 0)), 0);

export const rejectedTotal = (expenses: { amount: number | null; rejectedAt?: Date | null }[]) =>
  expenses.reduce((s, e) => s + (e.rejectedAt ? (e.amount ?? 0) : 0), 0);

// Contabilidad, controller y tesorería pueden editar gastos de informes en curso
export const REVIEWER_ROLES = ["CONTABILIDAD", "CONTROLLER", "TESORERIA", "ADMIN"];

export function expenseEditMode(
  user: { id: string; role: string; companyId: string },
  e: { userId: string; rejectedAt: Date | null; user: { companyId: string }; report: { status: string; treasuryAction: string | null } | null },
): "owner" | "reviewer" | null {
  if (e.rejectedAt) return null;
  if (e.userId === user.id) return !e.report || e.report.status === "BORRADOR" ? "owner" : null;
  if (
    REVIEWER_ROLES.includes(user.role) &&
    e.user.companyId === user.companyId &&
    e.report &&
    ["EN_APROBACION", "APROBADO"].includes(e.report.status) &&
    !e.report.treasuryAction
  )
    return "reviewer";
  return null;
}

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

// Lo que el usuario tiene pendiente de aprobar, según el paso en que va cada informe o fondo.
export async function pendingApprovals(user: Approver & { companyId: string }) {
  const base = { status: "EN_APROBACION", user: { companyId: user.companyId }, NOT: { userId: user.id } };
  const [reports, funds] = await Promise.all([
    db.report.findMany({ where: base, include: { user: true, expenses: true }, orderBy: { submittedAt: "asc" } }),
    db.fund.findMany({ where: base, include: { user: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return { reports: reports.filter((r) => canApprove(user, r)), funds: funds.filter((f) => canApprove(user, f)) };
}
