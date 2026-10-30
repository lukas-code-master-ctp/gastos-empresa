import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { saveUser } from "@/app/actions";
import { ROLES } from "@/lib/format";
import { Icon } from "@/components/Icons";

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
  const users = await db.user.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } });
  const people = users.map((u) => ({ id: u.id, name: u.name }));

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
            <button className="btn-secondary">Guardar</button>
          </form>
        ))}
      </section>
    </div>
  );
}
