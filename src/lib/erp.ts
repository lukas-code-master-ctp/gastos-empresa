import { db } from "./db";

// Integración ERP: registra los gastos de un informe aprobado.
// Si ERP_WEBHOOK_URL está definido se envía un POST con el asiento; si no, se simula.
export async function registerInErp(reportId: string) {
  const report = await db.report.findUniqueOrThrow({
    where: { id: reportId },
    include: { user: { include: { company: true } }, expenses: { include: { category: true, project: true } } },
  });

  const payload = {
    empresa: { nombre: report.user.company.name, rut: report.user.company.rut },
    informe: { id: report.id, tipo: report.type, titulo: report.title },
    rendidor: { nombre: report.user.name, email: report.user.email },
    lineas: report.expenses.map((e) => ({
      fecha: e.date,
      proveedor: e.merchant,
      rutProveedor: e.rutProvider,
      tipoDocumento: e.docType,
      numeroDocumento: e.docNumber,
      neto: (e.amount ?? 0) - (e.iva ?? 0),
      iva: e.iva ?? 0,
      total: e.amount ?? 0,
      cuenta: e.category?.erpAccount ?? null,
      centroCosto: e.project?.code ?? null,
      glosa: e.note,
    })),
  };

  let ref = `SIM-${Date.now()}`;
  const url = process.env.ERP_WEBHOOK_URL;
  if (url) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`ERP respondió ${res.status}`);
    const body = await res.json().catch(() => ({}));
    ref = body.id ?? body.ref ?? ref;
  }
  await db.report.update({ where: { id: reportId }, data: { erpRef: String(ref), erpSyncedAt: new Date() } });
  return ref;
}
