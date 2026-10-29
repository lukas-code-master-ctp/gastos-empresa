import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { saveFlow } from "@/app/actions";
import { kindsOf, parseSteps } from "@/lib/flows";
import { FlowEditor } from "../FlowEditor";
import { editorData } from "../editor-data";

export default async function EditarFlujo({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  const { id } = await params;
  const flow = await db.approvalFlow.findFirst({ where: { id, companyId: user.companyId } });
  if (!flow) notFound();
  const { users, takenBy } = await editorData(user.companyId, flow.id);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/flujos" className="eyebrow hover:text-ink">← Flujos de aprobación</Link>
        <h1 className="h1 mt-2">{flow.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Lo que ya está en aprobación sigue con el flujo con que se envió.</p>
      </div>
      <FlowEditor
        action={saveFlow.bind(null, flow.id)}
        initial={{ name: flow.name, appliesTo: kindsOf(flow.appliesTo), steps: parseSteps(flow.steps) }}
        users={users}
        takenBy={takenBy}
      />
    </div>
  );
}
