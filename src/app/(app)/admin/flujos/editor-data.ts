import { db } from "@/lib/db";
import { kindsOf } from "@/lib/flows";

// Datos que necesita el editor: personas de la empresa y qué tipos ya usa otro flujo
export async function editorData(companyId: string, flowId?: string) {
  const [users, flows] = await Promise.all([
    db.user.findMany({ where: { companyId }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
    db.approvalFlow.findMany({ where: { companyId, ...(flowId ? { NOT: { id: flowId } } : {}) } }),
  ]);
  const takenBy: Record<string, string> = {};
  for (const f of flows) for (const k of kindsOf(f.appliesTo)) takenBy[k] = f.name;
  return { users, takenBy };
}
