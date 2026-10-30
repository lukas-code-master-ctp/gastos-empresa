import { logout } from "@/app/actions";
import { ROLES } from "@/lib/format";
import { demoEnabled, requireUser } from "@/lib/auth";
import { pendingApprovals } from "@/lib/workflow";
import { Logo } from "./Brand";
import { Icon } from "./Icons";
import { NavLinks, type NavItem } from "./NavLinks";

export default async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Con flujos configurables cualquiera puede ser aprobador de un paso
  const pending = await pendingApprovals(user);
  const pendingCount = pending.reports.length + pending.funds.length;
  const approver = ["JEFE", "CONTABILIDAD", "CONTROLLER", "ADMIN"].includes(user.role) || pendingCount > 0;
  const treasury = ["TESORERIA", "ADMIN"].includes(user.role);
  const links: NavItem[] = [
    { href: "/", label: "Inicio", icon: "home" },
    { href: "/gastos", label: "Mis gastos", icon: "receipt" },
    { href: "/informes", label: "Mis informes", icon: "folder" },
    { href: "/fondos", label: "Fondos y caja chica", icon: "wallet" },
    { href: "/whatsapp", label: "WhatsApp (simulador)", icon: "chat" },
    ...(approver ? [{ href: "/aprobaciones", label: "Aprobaciones", icon: "check" as const, badge: pendingCount }] : []),
    ...(treasury ? [{ href: "/tesoreria", label: "Tesorería", icon: "bank" as const }] : []),
    ...(user.role === "ADMIN"
      ? [
          { href: "/admin/usuarios", label: "Usuarios", icon: "users" as const },
          { href: "/admin/flujos", label: "Flujos de aprobación", icon: "flow" as const },
        ]
      : []),
  ];
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <div className="min-h-dvh md:flex">
      <aside className="relative z-10 overflow-hidden bg-slate-900 text-slate-300 md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-mandarina-500/20 blur-3xl" />
        <div className="relative px-5 pb-4 pt-6 md:pb-8">
          <Logo className="text-[30px]" />
          <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">{user.company.name}</div>
        </div>
        <NavLinks links={links} />
        <div className="relative mt-auto hidden border-t border-white/10 p-4 md:block">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600 font-display text-sm font-bold text-white">{initials}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{user.name}</div>
              <div className="text-xs text-slate-400">{ROLES[user.role]}</div>
            </div>
          </div>
          <form action={logout}>
            <button className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-xs text-slate-300 transition-colors hover:text-mandarina-400">
              <Icon name="logout" className="size-4" /> {demoEnabled() ? "Cambiar de usuario" : "Cerrar sesión"}
            </button>
          </form>
        </div>
      </aside>
      <main className="relative mx-auto w-full max-w-6xl flex-1 p-4 md:p-10">{children}</main>
    </div>
  );
}
