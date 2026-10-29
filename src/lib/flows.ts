import { z } from "zod";
import { ROLES, STEPS } from "./format";

// Flujos de aprobación configurables por empresa. Sin dependencias de servidor:
// también lo usa el editor del admin en el navegador.

// A qué se aplica un flujo: las tres rendiciones y las solicitudes de fondo
export const FLOW_KINDS: Record<string, string> = {
  REEMBOLSO: "Reembolsos",
  FONDO_FIJO: "Rendición de fondo fijo",
  CAJA_CHICA: "Rendición de caja chica",
  SOLICITUD_FONDO: "Solicitud de fondo o caja chica",
};

// Quién puede aprobar un paso además del admin (que siempre puede)
export const APPROVER_ROLES = ["CONTABILIDAD", "CONTROLLER", "TESORERIA", "JEFE", "ADMIN"];

export const stepDefSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(["JEFE", "ROLE", "USER"]),
  role: z.string().optional(),
  userId: z.string().optional(),
  // El paso solo se agrega si el monto es igual o mayor
  minAmount: z.number().int().positive().nullable().optional(),
});
export type StepDef = z.infer<typeof stepDefSchema>;

// Paso tal como queda guardado en el informe o fondo al enviarse
export type FlowStep = { id: string; kind: StepDef["kind"]; role?: string; userId?: string; label: string };

// Flujo estándar (el que venía fijo): jefe directo → contabilidad → controller.
// Los ids coinciden con los currentStep de informes enviados antes de los flujos configurables.
export const STANDARD_STEPS: StepDef[] = [
  { id: "JEFE", kind: "JEFE" },
  { id: "CONTABILIDAD", kind: "ROLE", role: "CONTABILIDAD" },
  { id: "CONTROLLER", kind: "ROLE", role: "CONTROLLER" },
];

export function approverLabel(s: Pick<StepDef, "kind" | "role" | "userId">, userName?: (id: string) => string | undefined) {
  if (s.kind === "JEFE") return "Jefe directo";
  if (s.kind === "ROLE") return STEPS[s.role ?? ""] ?? ROLES[s.role ?? ""] ?? s.role ?? "Rol";
  return (s.userId && userName?.(s.userId)) || "Persona";
}

export function parseSteps(json: string | null | undefined): StepDef[] {
  try {
    return z.array(stepDefSchema).parse(JSON.parse(json ?? "[]"));
  } catch {
    return [];
  }
}

export const kindsOf = (appliesTo: string) => appliesTo.split(",").filter((k) => k in FLOW_KINDS);
