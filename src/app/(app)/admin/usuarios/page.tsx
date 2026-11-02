import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteUser, reactivateUser, saveUser } from "@/app/actions";
import { ROLES } from "@/lib/format";
import { Icon } from "@/components/Icons";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

type Person = { id: string; name: string };

function UserFields({ people, selfId, defaults }: { people: Person[]; selfId?: string; defaults?: { name: string; email: string; role: string; managerId: string | null } }) {
  return (
    <>
      <div className="min-w-0">
        <label className="label">Nombre</label>
        <input name="name" defaultValue={defaults?.name} className="input" placeholder="Ana Pérez" required />
      </div>
      <div className="min-w-0">
        <label className="label">Correo Google</label>
        <input name="email" type="email" defaultValue={defaults?.email} className="input" placeholder="ana@empresa.cl" required />
      </div>
      <div className="min-w-0">
        <label className="label">Rol</label>
        <select name="role" defaultValue={defaults?.role ?? "EMPLEADO"} className="input">
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="min-w-0">
        <label className="label">Jefe directo</label>
        <select name="managerId" defaultValue={defaults?.managerId ?? ""} className="input">
          <option value="">Sin jefe directo</option>
          {people.filter((p) => p.id !== selfId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
    </>
  );
}

export default async function UsuariosPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  const all = await db.user.findMany({
    where: { companyId: user.companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { expenses: true, informes: true, funds: true, approvals: true, reports: { where: { active: true } } } } },
  });
  const users = all.filter((u) => u.active);
  const inactive = all.filter((u) => !u.active);
  const people = users.map((u) => ({ id: u.id, name: u.name }));

  // Mensaje de confirmación: explica qué pasará con su historial y con quienes lo tienen de jefe
  const confirmText = (u: (typeof all)[number]) => {
    const { reports, ...rest } = u._count;
    const history = Object.values(rest).some((n) => n > 0);
    return [
      `¿Eliminar a ${u.name}?`,
      history
        ? "Tiene gastos o informes registrados: quedará desactivado (no podrá entrar ni aparecerá en las listas) y su historial se conserva."
        : "Ya no podrá entrar a Rindefi.",
      reports > 0 ? `Es jefe directo de ${reports} ${reports === 1 ? "persona" : "personas"}: pasarán a ${u.managerId ? "su jefe directo" : "no tener jefe directo"}.` : "",
    ].filter(Boolean).join("\n\n");
  };

  return (
    <div className="space-y-10">
      <header>
        <div className="eyebrow">Administración · {user.company.name}</div>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.04em] md:text-5xl">
          Usuarios<span className="text-mandarina-500">.</span>
        </h1>
        <p className="mt-2 max-w-prose text-slate-500">
          Cada persona entra con la cuenta Google de su correo. Solo pueden entrar los correos que estén en esta lista; el rol y el jefe directo definen por dónde pasan sus rendiciones.
        </p>
      </header>

      <section className="card space-y-4">
        <h2>Agregar usuario</h2>
        <form action={saveUser.bind(null, null)} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_0.8fr_1fr_auto]">
          <UserFields people={people} />
          <button className="btn"><Icon name="plus" /> Agregar</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">{users.length} usuarios</h2>
        {users.map((u) => (
          <form key={u.id} action={saveUser.bind(null, u.id)} className="card grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_0.8fr_1fr_auto]">
            <UserFields people={people} selfId={u.id} defaults={u} />
            <div className="flex items-center gap-2">
              <button className="btn-secondary flex-1">Guardar</button>
              {u.id === user.id ? (
                <span className="btn-secondary !px-3 cursor-not-allowed opacity-40" title="No puedes eliminarte a ti mismo">
                  <Icon name="trash" className="size-4" /><span className="sr-only">Eliminar</span>
                </span>
              ) : (
                <ConfirmSubmit
                  formAction={deleteUser.bind(null, u.id)}
                  className="btn-secondary !px-3 hover:!border-red-700 hover:text-red-700"
                  title={`Eliminar a ${u.name}`}
                  message={confirmText(u)}
                >
                  <Icon name="trash" className="size-4" /><span className="sr-only">Eliminar</span>
                </ConfirmSubmit>
              )}
            </div>
          </form>
        ))}
      </section>

      {inactive.length > 0 && (
        <section className="space-y-3">
          <h2 className="eyebrow">{inactive.length} {inactive.length === 1 ? "usuario eliminado" : "usuarios eliminados"}</h2>
          <p className="max-w-prose text-sm text-slate-500">Tenían gastos o informes, así que se conservan para el historial. No pueden entrar ni aparecen al elegir jefes o aprobadores.</p>
          {inactive.map((u) => (
            <form key={u.id} action={reactivateUser.bind(null, u.id)} className="card flex flex-wrap items-center justify-between gap-3 opacity-80">
              <div className="min-w-0">
                <div className="font-semibold">{u.name}</div>
                <div className="truncate text-sm text-slate-500">{u.email} · {ROLES[u.role] ?? u.role}</div>
              </div>
              <button className="btn-secondary">Reactivar</button>
            </form>
          ))}
        </section>
      )}
    </div>
  );
}
