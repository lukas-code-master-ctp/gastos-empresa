import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteFlow } from "@/app/actions";
import { approverLabel, FLOW_KINDS, kindsOf, parseSteps, STANDARD_STEPS, type StepDef } from "@/lib/flows";
import { fecha } from "@/lib/format";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { FlowChain } from "@/components/FlowChain";
import { Icon } from "@/components/Icons";
import { Stagger, StaggerItem } from "@/components/motion";

export default async function FlujosPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  const [flows, users] = await Promise.all([
    db.approvalFlow.findMany({ where: { companyId: user.companyId }, orderBy: { createdAt: "asc" } }),
    db.user.findMany({ where: { companyId: user.companyId }, select: { id: true, name: true } }),
  ]);
  const names = new Map(users.map((u) => [u.id, u.name]));
  const chain = (steps: StepDef[]) => steps.map((s) => ({ label: approverLabel(s, (id) => names.get(id)), minAmount: s.minAmount }));
  const byKind = (kind: string) => flows.find((f) => kindsOf(f.appliesTo).includes(kind));
  const standardKinds = Object.keys(FLOW_KINDS).filter((k) => !byKind(k));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="eyebrow">Administración · {user.company.name}</div>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.04em] md:text-5xl">
            Flujos de aprobación<span className="text-mandarina-500">.</span>
          </h1>
          <p className="mt-2 max-w-prose text-slate-500">
            Define quién aprueba cada tipo de rendición y en qué orden. Los cambios aplican a lo que se envíe desde ahora; lo que ya está en aprobación sigue con su flujo.
          </p>
        </div>
        <Link href="/admin/flujos/nuevo" className="btn"><Icon name="plus" /> Nuevo flujo</Link>
      </header>

      <section>
        <h2 className="eyebrow">Qué flujo usa cada tipo</h2>
        <Stagger className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(FLOW_KINDS).map(([kind, label]) => {
            const f = byKind(kind);
            return (
              <StaggerItem key={kind}>
                <div className={`card h-full ${f ? "border-emerald-200" : ""}`}>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className={`mt-1 font-mono text-[11px] uppercase tracking-[0.1em] ${f ? "text-emerald-700" : "text-slate-400"}`}>{f ? f.name : "Flujo estándar"}</div>
                  <div className="mt-3 text-xs text-slate-500">{(f ? chain(parseSteps(f.steps)) : chain(STANDARD_STEPS)).map((s) => s.label).join(" → ")} → Tesorería</div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow">Flujos de la empresa</h2>
        {flows.map((f) => (
          <article key={f.id} className="card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold tracking-[-0.02em]">{f.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {kindsOf(f.appliesTo).length === 0 ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">Sin tipos asignados: no se está usando</span>
                  ) : (
                    kindsOf(f.appliesTo).map((k) => <span key={k} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">{FLOW_KINDS[k]}</span>)
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/flujos/${f.id}`} className="btn-secondary">Editar</Link>
                <form action={deleteFlow.bind(null, f.id)}>
                  <ConfirmSubmit className="btn-secondary !px-3 hover:!border-red-700 hover:text-red-700" message={`¿Eliminar "${f.name}"? Sus tipos vuelven al flujo estándar.`}>
                    <Icon name="trash" className="size-4" /><span className="sr-only">Eliminar</span>
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
            <FlowChain steps={chain(parseSteps(f.steps))} />
            <div className="text-xs text-slate-400">Actualizado {fecha(f.updatedAt)}</div>
          </article>
        ))}

        <article className="card space-y-4 border-dashed bg-slate-50/60">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold tracking-[-0.02em]">Flujo estándar</h3>
              <p className="mt-1 text-sm text-slate-500">
                {standardKinds.length ? `Lo usan: ${standardKinds.map((k) => FLOW_KINDS[k].toLowerCase()).join(", ")}.` : "Ningún tipo lo usa: todos tienen flujo propio."} Si quien rinde no tiene jefe directo, parte en contabilidad.
              </p>
            </div>
            <Link href="/admin/flujos/nuevo" className="btn-secondary">Usarlo como base</Link>
          </div>
          <FlowChain steps={chain(STANDARD_STEPS)} />
        </article>
      </section>
    </div>
  );
}
