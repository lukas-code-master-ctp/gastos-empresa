import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createReport } from "@/app/actions";
import { clp, FUND_TYPES } from "@/lib/format";
import { ExpensePicker } from "@/components/ExpensePicker";

export default async function NuevoInforme() {
  const user = await requireUser();
  const [expenses, funds] = await Promise.all([
    db.expense.findMany({ where: { userId: user.id, reportId: null }, orderBy: { date: "desc" } }),
    db.fund.findMany({ where: { userId: user.id, status: "ACTIVO" } }),
  ]);
  const has = (t: string) => funds.some((f) => f.type === t);
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="h1">Crear informe</h1>
      <form action={createReport} className="card space-y-5">
        <div>
          <label className="label">Tipo de informe</label>
          <select name="type" className="input" required>
            <option value="REEMBOLSO">Reembolso (pagué con mi dinero)</option>
            <option value="FONDO_FIJO" disabled={!has("FONDO_FIJO")}>Rendición de fondo fijo{has("FONDO_FIJO") ? "" : " (sin fondo activo)"}</option>
            <option value="CAJA_CHICA" disabled={!has("CAJA_CHICA")}>Rendición de caja chica{has("CAJA_CHICA") ? "" : " (sin caja activa)"}</option>
          </select>
          {funds.length > 0 && (
            <ul className="mt-2 text-xs text-slate-500">
              {funds.map((f) => <li key={f.id}>{FUND_TYPES[f.type]} activo: {clp(f.amount)}{f.type === "CAJA_CHICA" ? ` (saldo ${clp(f.balance)})` : ""}</li>)}
            </ul>
          )}
        </div>
        <div>
          <label className="label">Nombre del informe</label>
          <input name="title" className="input" placeholder="Ej: Visita a obra Proyecto Norte, octubre" required />
        </div>
        <div>
          <label className="label">Gastos a incluir</label>
          <ExpensePicker expenses={expenses} />
        </div>
        <button className="btn">Crear informe</button>
      </form>
    </div>
  );
}
