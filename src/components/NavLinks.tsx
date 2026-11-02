"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Icon, type IconName } from "./Icons";
import { SPRING } from "./motion";

type Leaf = { href: string; label: string; icon: IconName; badge?: number };
// Un ítem con children es un grupo (p. ej. Configuraciones): se despliega y sus submenús son los links
export type NavItem = Leaf & { children?: Leaf[] };

const base = "relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-colors";

// Navegación lateral: la píldora del ítem activo se desliza entre ítems (layoutId)
export function NavLinks({ links }: { links: NavItem[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  const leaf = (l: Leaf, sub = false) => {
    const on = active(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={on ? "page" : undefined}
        className={`${base} ${sub ? "md:py-2 md:pl-10" : ""} ${on ? "font-semibold text-white" : "text-slate-300 hover:text-white"}`}
      >
        {on && <motion.span layoutId="nav-pill" transition={SPRING} className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-white/10" />}
        <span className={`relative ${sub ? "md:hidden" : ""}`}><Icon name={l.icon} /></span>
        <span className="relative">{l.label}</span>
        {on && <motion.span layoutId="nav-dot" transition={SPRING} className="relative ml-auto hidden size-1.5 rounded-full bg-mandarina-500 md:block" />}
        {!on && l.badge ? (
          <span className="relative ml-auto rounded-full bg-mandarina-500 px-1.5 py-px font-mono text-[10px] font-semibold text-ink">{l.badge}</span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0" aria-label="Principal">
      {links.map((l) => (l.children ? <Group key={l.label} item={l} inside={l.children.some((c) => active(c.href))} leaf={leaf} /> : leaf(l)))}
    </nav>
  );
}

function Group({ item, inside, leaf }: { item: NavItem; inside: boolean; leaf: (l: Leaf, sub?: boolean) => React.ReactNode }) {
  const [open, setOpen] = useState(inside);
  const shown = open || inside;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!shown)}
        aria-expanded={shown}
        className={`${base} cursor-pointer ${inside ? "text-white" : "text-slate-300 hover:text-white"}`}
      >
        <span className="relative"><Icon name={item.icon} /></span>
        <span className="relative">{item.label}</span>
        <span className={`relative ml-auto transition-transform duration-200 ${shown ? "rotate-180" : ""}`}><Icon name="down" className="size-4" /></span>
      </button>
      <AnimatePresence initial={false}>
        {shown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-1 md:flex-col md:overflow-hidden"
          >
            {item.children!.map((c) => leaf(c, true))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
