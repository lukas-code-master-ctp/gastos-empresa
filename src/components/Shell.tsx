import Link from "next/link";
import { logout } from "@/app/actions";
import { ROLES } from "@/lib/format";
import { requireUser } from "@/lib/auth";

export default async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const approver = ["JEFE", "CONTABILIDAD", "CONTROLLER", "ADMIN"].includes(user.role);
  const treasury = ["TESORERIA", "ADMIN"].includes(user.role);
  const links = [
    { href: "/", label: "Inicio" },
    { href: "/gastos", label: "Mis gastos" },
    { href: "/informes", label: "Mis informes" },
    { href: "/fondos", label: "Fondos y caja chica" },
    { href: "/whatsapp", label: "WhatsApp (simulador)" },
    ...(approver ? [{ href: "/aprobaciones", label: "Aprobaciones" }] : []),
    ...(treasury ? [{ href: "/tesoreria", label: "Tesorería" }] : []),
  ];
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="p-5">
          <div className="text-lg font-semibold text-emerald-800">Rendiciones</div>
          <div className="text-xs text-slate-500">{user.company.name}</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-slate-200 p-4 text-sm md:block">
          <div className="font-medium">{user.name}</div>
          <div className="text-xs text-slate-500">{ROLES[user.role]}</div>
          <form action={logout}>
            <button className="mt-2 text-xs text-emerald-700 hover:underline">Cambiar de usuario</button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
