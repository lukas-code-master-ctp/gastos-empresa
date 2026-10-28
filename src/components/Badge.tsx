import { STATUS } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
