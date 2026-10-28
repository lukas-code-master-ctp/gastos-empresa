"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Icon, type IconName } from "./Icons";
import { SPRING } from "./motion";

export type NavItem = { href: string; label: string; icon: IconName; badge?: number };

// Navegación lateral: la píldora del ítem activo se desliza entre ítems (layoutId)
export function NavLinks({ links }: { links: NavItem[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0" aria-label="Principal">
      {links.map((l) => {
        const on = active(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-colors ${on ? "font-semibold text-white" : "text-slate-300 hover:text-white"}`}
          >
            {on && (
              <motion.span layoutId="nav-pill" transition={SPRING} className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-white/10" />
            )}
            <span className="relative"><Icon name={l.icon} /></span>
            <span className="relative">{l.label}</span>
            {on && <motion.span layoutId="nav-dot" transition={SPRING} className="relative ml-auto hidden size-1.5 rounded-full bg-mandarina-500 md:block" />}
            {!on && l.badge ? (
              <span className="relative ml-auto rounded-full bg-mandarina-500 px-1.5 py-px font-mono text-[10px] font-semibold text-ink">{l.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
