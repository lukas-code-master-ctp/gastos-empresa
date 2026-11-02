import Link from "next/link";
import { Icon, type IconName } from "./Icons";

const TABS: { key: string; href: string; label: string; icon: IconName }[] = [
  { key: "flujos", href: "/admin/flujos", label: "Flujos de aprobación", icon: "flow" },
  { key: "categorias", href: "/admin/categorias", label: "Categorías y proyectos", icon: "tag" },
];

// Encabezado de la pantalla Configuraciones: título y pestañas a cada sección
export function ConfigHeader({ company, current }: { company: string; current: "flujos" | "categorias" }) {
  return (
    <header className="space-y-6">
      <div>
        <div className="eyebrow">Administración · {company}</div>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.04em] md:text-5xl">
          Configuraciones<span className="text-mandarina-500">.</span>
        </h1>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Configuraciones">
        {TABS.map((t) => {
          const on = t.key === current;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={`-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
                on ? "border-mandarina-500 font-semibold text-ink" : "border-transparent text-slate-500 hover:text-ink"
              }`}
            >
              <Icon name={t.icon} className="size-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
