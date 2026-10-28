import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setReportExpenses } from "@/app/actions";
import { REPORT_TYPES } from "@/lib/format";
import { ExpensePicker } from "@/components/ExpensePicker";

// Volver a la selección de gastos de un informe en borrador
export default async function EditarInforme({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const r = await db.report.findUnique({ where: { id } });
  if (!r || r.userId !== user.id || r.status !== "BORRADOR") notFound();
  const expenses = await db.expense.findMany({
    where: { userId: user.id, OR: [{ reportId: null }, { reportId: r.id }] },
    orderBy: { date: "desc" },
  });
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">Elegir gastos</h1>
        <Link href={`/informes/${r.id}`} className="text-sm text-emerald-700 hover:underline">Cancelar</Link>
      </div>
      <form action={setReportExpenses.bind(null, r.id)} className="card space-y-5">
        <div>
          <label className="label">Tipo de informe</label>
          <div className="text-sm">{REPORT_TYPES[r.type]}</div>
        </div>
        <div>
          <label className="label">Nombre del informe</label>
          <input name="title" defaultValue={r.title} className="input" required />
        </div>
        <div>
          <label className="label">Gastos a incluir</label>
          <ExpensePicker expenses={expenses} />
        </div>
        <button className="btn">Guardar y continuar</button>
      </form>
    </div>
  );
}
