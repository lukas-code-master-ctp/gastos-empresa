import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteCatalogItem, loadDefaultCatalog, saveCatalogItem, toggleCatalogItem } from "@/app/actions";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { Icon } from "@/components/Icons";
import { ConfigHeader } from "@/components/ConfigTabs";

type Kind = "category" | "project";
type Item = { id: string; name: string; code: string | null; active: boolean; used: number };

const TEXT = {
  category: {
    title: "Categorías",
    help: "Clasifican cada gasto. La cuenta contable viaja al ERP junto con el gasto.",
    code: "Cuenta contable",
    codePh: "5101",
    namePh: "Alimentación",
    empty: "Tu empresa todavía no tiene categorías.",
    defaults: "Cargar categorías sugeridas",
  },
  project: {
    title: "Proyectos",
    help: "Opcionales al registrar un gasto. El código se envía al ERP como centro de costo.",
    code: "Código / centro de costo",
    codePh: "PN-01",
    namePh: "Proyecto Norte",
    empty: "Tu empresa todavía no tiene proyectos. Sin proyectos, el campo no se pide en los gastos.",
    defaults: "Cargar proyectos sugeridos",
  },
} as const;

function Section({ kind, items }: { kind: Kind; items: Item[] }) {
  const t = TEXT[kind];
  const active = items.filter((i) => i.active).length;
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">{t.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{t.help}</p>
      </div>

      <form action={saveCatalogItem.bind(null, kind, null)} className="card grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
        <div className="min-w-0">
          <label className="label">Nombre</label>
          <input name="name" className="input" placeholder={t.namePh} required />
        </div>
        <div className="min-w-0">
          <label className="label">{t.code}</label>
          <input name="code" className="input" placeholder={t.codePh} required={kind === "project"} />
        </div>
        <button className="btn"><Icon name="plus" /> Agregar</button>
      </form>

      {items.length === 0 ? (
        <div className="card border-dashed bg-slate-50/60 text-sm text-slate-500">
          <p>{t.empty}</p>
          <form action={loadDefaultCatalog.bind(null, kind)} className="mt-3">
            <button className="btn-secondary">{t.defaults}</button>
          </form>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="eyebrow">{active} activos{items.length > active ? ` · ${items.length - active} desactivados` : ""}</div>
          {items.map((i) => (
            <div key={i.id} className={`card flex flex-wrap items-end gap-3 !py-3 ${i.active ? "" : "bg-slate-50/60 opacity-70"}`}>
              <form action={saveCatalogItem.bind(null, kind, i.id)} className="grid min-w-0 flex-1 items-end gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
                <div className="min-w-0">
                  <label className="label">Nombre</label>
                  <input name="name" defaultValue={i.name} className="input" required />
                </div>
                <div className="min-w-0">
                  <label className="label">{t.code}</label>
                  <input name="code" defaultValue={i.code ?? ""} className="input" required={kind === "project"} />
                </div>
                <button className="btn-secondary">Guardar</button>
              </form>
              <div className="flex items-center gap-2">
                <form action={toggleCatalogItem.bind(null, kind, i.id)}>
                  <button className="btn-secondary" title={i.active ? "Deja de aparecer al registrar gastos nuevos" : "Vuelve a aparecer al registrar gastos"}>
                    {i.active ? "Desactivar" : "Activar"}
                  </button>
                </form>
                {i.used === 0 ? (
                  <form action={deleteCatalogItem.bind(null, kind, i.id)}>
                    <ConfirmSubmit className="btn-secondary !px-3 hover:!border-red-700 hover:text-red-700" message={`¿Eliminar "${i.name}"?`}>
                      <Icon name="trash" className="size-4" /><span className="sr-only">Eliminar</span>
                    </ConfirmSubmit>
                  </form>
                ) : (
                  <span className="whitespace-nowrap text-xs text-slate-400" title="Con gastos asociados no se puede borrar; desactívalo">
                    {i.used} {i.used === 1 ? "gasto" : "gastos"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function CategoriasPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  const count = { _count: { select: { expenses: true } } } as const;
  const [categories, projects] = await Promise.all([
    db.category.findMany({ where: { companyId: user.companyId }, orderBy: [{ active: "desc" }, { name: "asc" }], include: count }),
    db.project.findMany({ where: { companyId: user.companyId }, orderBy: [{ active: "desc" }, { name: "asc" }], include: count }),
  ]);

  return (
    <div className="space-y-10">
      <ConfigHeader company={user.company.name} current="categorias" />
      <p className="max-w-prose text-slate-500">
        Son las opciones que ve tu equipo al registrar un gasto, en la web y por WhatsApp. Desactivar algo lo saca de la lista para gastos nuevos sin tocar los gastos que ya lo usan.
      </p>
      <Section kind="category" items={categories.map((c) => ({ id: c.id, name: c.name, code: c.erpAccount, active: c.active, used: c._count.expenses }))} />
      <Section kind="project" items={projects.map((p) => ({ id: p.id, name: p.name, code: p.code, active: p.active, used: p._count.expenses }))} />
    </div>
  );
}
