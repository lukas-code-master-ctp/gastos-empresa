import { db } from "@/lib/db";
import { login } from "@/app/actions";
import { ROLES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const users = await db.user.findMany({ include: { company: true }, orderBy: { name: "asc" } });
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <h1 className="h1">Rendiciones de gastos</h1>
        <p className="mt-1 text-sm text-slate-500">Modo demostración: elige un usuario para entrar con su rol.</p>
        <form action={login} className="mt-6 space-y-2">
          {users.map((u) => (
            <button key={u.id} name="userId" value={u.id} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-emerald-600 hover:bg-emerald-50">
              <span>
                <span className="block font-medium">{u.name}</span>
                <span className="text-xs text-slate-500">{u.email}</span>
              </span>
              <span className="text-xs text-slate-600">{ROLES[u.role]}</span>
            </button>
          ))}
        </form>
      </div>
    </div>
  );
}
