import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteExpense, updateExpense } from "@/app/actions";
import { DOC_TYPES } from "@/lib/format";

export default async function GastoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ocr?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { ocr } = await searchParams;
  const e = await db.expense.findUnique({ where: { id }, include: { report: true } });
  if (!e || e.userId !== user.id) notFound();
  const [categories, projects] = await Promise.all([
    db.category.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } }),
    db.project.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } }),
  ]);
  const doubts: string[] = e.ocrRaw ? JSON.parse(e.ocrRaw).doubts ?? [] : [];
  const editable = !e.report || ["BORRADOR", "OBSERVADO"].includes(e.report.status);
  const d = (k: string) => (doubts.includes(k) ? "border-amber-400 bg-amber-50" : "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">{e.merchant ?? "Nuevo gasto"}</h1>
        <Link href="/gastos" className="text-sm text-emerald-700 hover:underline">← Mis gastos</Link>
      </div>
      {e.observation && editable && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <b>El aprobador pidió corregir este gasto:</b> {e.observation}
        </p>
      )}
      {ocr === "1" && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">La IA leyó la boleta. Revisa y corrige o completa los datos{doubts.length ? "; los campos en amarillo quedaron dudosos" : ""}.</p>}
      {ocr === "0" && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No se pudo leer la boleta automáticamente. Completa los datos a mano.</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          {e.receiptPath ? (
            e.receiptMime === "application/pdf" ? (
              <iframe src={`/api/files/${e.receiptPath}`} className="h-[600px] w-full rounded" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${e.receiptPath}`} alt="Boleta" className="mx-auto max-h-[600px] rounded" />
            )
          ) : (
            <div className="py-20 text-center text-sm text-slate-400">Gasto sin boleta adjunta</div>
          )}
        </div>
        <form action={updateExpense.bind(null, e.id)} className="card grid grid-cols-2 gap-4">
          <fieldset disabled={!editable} className="contents">
            <div className="col-span-2">
              <label className="label">Nombre del comercio</label>
              <input name="merchant" defaultValue={e.merchant ?? ""} className={`input ${d("merchant")}`} required />
            </div>
            <div>
              <label className="label">RUT proveedor</label>
              <input name="rutProvider" defaultValue={e.rutProvider ?? ""} className={`input ${d("rutProvider")}`} placeholder="12.345.678-9" />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input type="date" name="date" defaultValue={e.date?.toISOString().slice(0, 10) ?? ""} className={`input ${d("date")}`} required />
            </div>
            <div>
              <label className="label">Tipo de documento</label>
              <select name="docType" defaultValue={e.docType ?? ""} className={`input ${d("docType")}`} required>
                <option value="">Selecciona…</option>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Número de documento</label>
              <input name="docNumber" defaultValue={e.docNumber ?? ""} className={`input ${d("docNumber")}`} />
            </div>
            <div>
              <label className="label">Monto total (con IVA)</label>
              <input name="amount" inputMode="numeric" defaultValue={e.amount ?? ""} className={`input ${d("amount")}`} required />
            </div>
            <div>
              <label className="label">IVA</label>
              <input name="iva" inputMode="numeric" defaultValue={e.iva ?? ""} className={`input ${d("iva")}`} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select name="categoryId" defaultValue={e.categoryId ?? ""} className={`input ${d("categoryId")}`} required>
                <option value="">Selecciona…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Proyecto</label>
              <select name="projectId" defaultValue={e.projectId ?? ""} className="input">
                <option value="">Sin proyecto</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Nota</label>
              <textarea name="note" defaultValue={e.note ?? ""} rows={2} className="input" />
            </div>
            {editable && (
              <div className="col-span-2 flex justify-end gap-2">
                <button className="btn">Guardar gasto</button>
              </div>
            )}
          </fieldset>
        </form>
      </div>
      {!e.reportId && (
        <form action={deleteExpense.bind(null, e.id)}>
          <button className="text-sm text-red-600 hover:underline">Eliminar gasto</button>
        </form>
      )}
    </div>
  );
}
