import { clp, fecha } from "@/lib/format";
import { missingFields } from "@/lib/workflow";

type E = { id: string; merchant: string | null; amount: number | null; date: Date | null; docType: string | null; categoryId: string | null; reportId: string | null };

export function ExpensePicker({ expenses }: { expenses: E[] }) {
  if (expenses.length === 0) return <p className="text-sm text-slate-500">No tienes gastos disponibles. Sube boletas primero.</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {expenses.map((e) => {
        const missing = missingFields(e);
        return (
          <li key={e.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
              <input type="checkbox" name="expenseIds" value={e.id} defaultChecked={Boolean(e.reportId)} />
              <span className="flex-1">
                {e.merchant ?? "Sin comercio"} <span className="text-slate-400">· {fecha(e.date)}</span>
                {missing.length > 0 && <span className="block text-xs text-amber-700">Falta: {missing.join(", ")}</span>}
              </span>
              <span className="tabular-nums">{clp(e.amount)}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
