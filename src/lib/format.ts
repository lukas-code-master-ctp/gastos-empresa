export const clp = (n?: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);

export const fecha = (d?: Date | string | null) =>
  d ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(d)) : "—";

export const ROLES: Record<string, string> = {
  EMPLEADO: "Empleado",
  JEFE: "Jefe directo",
  CONTABILIDAD: "Contabilidad",
  CONTROLLER: "Controller",
  TESORERIA: "Tesorería",
  ADMIN: "Administrador",
};

export const REPORT_TYPES: Record<string, string> = {
  REEMBOLSO: "Reembolso",
  FONDO_FIJO: "Rendición fondo fijo",
  CAJA_CHICA: "Rendición caja chica",
};

export const FUND_TYPES: Record<string, string> = {
  FONDO_FIJO: "Fondo fijo",
  CAJA_CHICA: "Caja chica",
};

export const STEPS: Record<string, string> = {
  JEFE: "Jefe directo",
  CONTABILIDAD: "Revisión de contabilidad",
  CONTROLLER: "Controller",
};

export const STATUS: Record<string, { label: string; cls: string }> = {
  BORRADOR: { label: "Borrador", cls: "bg-slate-100 text-slate-700" },
  EN_APROBACION: { label: "En aprobación", cls: "bg-amber-100 text-amber-800" },
  OBSERVADO: { label: "Por modificar", cls: "bg-orange-100 text-orange-800" },
  RECHAZADO: { label: "Rechazado", cls: "bg-red-100 text-red-700" },
  APROBADO: { label: "Aprobado · en tesorería", cls: "bg-blue-100 text-blue-800" },
  ACTIVO: { label: "Activo", cls: "bg-emerald-100 text-emerald-800" },
  CERRADO: { label: "Cerrado", cls: "bg-emerald-100 text-emerald-800" },
};

export const TREASURY: Record<string, string> = {
  DEPOSITO_REEMBOLSO: "Se depositó el reembolso",
  DESCUENTO_CAJA: "Se descontó del monto de caja",
  CIERRE_CUADRADO: "Calzó: se cerró el fondo",
  DEVOLUCION_SOLICITADA: "Sobró: se pidió devolución",
  DEPOSITO_DIFERENCIA: "Faltó: se depositó la diferencia",
  ENTREGA_FONDO: "Se entregó el fondo",
};

export const DOC_TYPES = ["BOLETA", "FACTURA", "OTRO"];
