import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { saveFlow } from "@/app/actions";
import { FLOW_KINDS, STANDARD_STEPS } from "@/lib/flows";
import { FlowEditor } from "../FlowEditor";
import { editorData } from "../editor-data";

export default async function NuevoFlujo() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  const { users, takenBy } = await editorData(user.companyId);
  // Parte desde el flujo estándar, para los tipos que aún no tienen flujo propio
  const free = Object.keys(FLOW_KINDS).filter((k) => !takenBy[k]);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/flujos" className="eyebrow hover:text-ink">← Flujos de aprobación</Link>
        <h1 className="h1 mt-2">Nuevo flujo</h1>
      </div>
      <FlowEditor
        action={saveFlow.bind(null, null)}
        initial={{ name: "", appliesTo: free, steps: STANDARD_STEPS.map((s) => ({ ...s, id: `${s.id}-${Math.random().toString(36).slice(2, 6)}` })) }}
        users={users}
        takenBy={takenBy}
      />
    </div>
  );
}
