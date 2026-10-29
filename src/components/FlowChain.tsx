import { clp } from "@/lib/format";

// Cadena compacta de pasos de un flujo: círculos numerados unidos por una línea, y Tesorería al final
export function FlowChain({ steps }: { steps: { label: string; minAmount?: number | null; off?: boolean }[] }) {
  const items = [...steps, { label: "Tesorería", minAmount: null, off: false, end: true }];
  return (
    <ol className="flex flex-wrap items-start gap-y-3" aria-label="Pasos del flujo">
      {items.map((s, i) => (
        <li key={i} className={`flex items-start transition-opacity duration-300 ${s.off ? "opacity-35" : ""}`}>
          <div className="flex w-24 flex-col items-center text-center">
            <span
              className={`grid size-7 place-items-center rounded-full font-mono text-[11px] font-semibold ${
                "end" in s ? "border-2 border-dashed border-slate-300 text-slate-400" : s.off ? "border-2 border-slate-200 text-slate-400" : "bg-emerald-700 text-white"
              }`}
            >
              {"end" in s ? "$" : i + 1}
            </span>
            <span className={`mt-1.5 text-xs leading-tight ${"end" in s ? "text-slate-400" : "font-medium text-ink"}`}>{s.label}</span>
            {s.minAmount ? <span className="mt-1 rounded-full bg-mandarina-50 px-1.5 py-px font-mono text-[10px] text-mandarina-700">desde {clp(s.minAmount)}</span> : null}
          </div>
          {i < items.length - 1 && <span aria-hidden="true" className="mt-3.5 h-0.5 w-4 shrink-0 rounded-full bg-slate-200 sm:w-6" />}
        </li>
      ))}
    </ol>
  );
}
