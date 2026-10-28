"use client";

import { useEffect, useRef } from "react";
import { animate, motion, MotionConfig as Base, useReducedMotion } from "motion/react";

// Curvas compartidas: todo en la app se mueve con el mismo ritmo
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const SPRING = { type: "spring", stiffness: 380, damping: 30, mass: 0.8 } as const;

export function MotionConfig({ children }: { children: React.ReactNode }) {
  return <Base reducedMotion="user" transition={{ duration: 0.5, ease: EASE_OUT }}>{children}</Base>;
}

// Entrada de cada pantalla: sube y aparece
export function PageIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE_OUT }}>
      {children}
    </motion.div>
  );
}

// Lista o grilla que entra escalonada (40 ms por elemento)
export function Stagger({ children, className, delay = 0.08 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: delay } } }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={{ hidden: { opacity: 0, y: 16, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } } }}>
      {children}
    </motion.div>
  );
}

// Número que cuenta hasta su valor (montos en CLP o cantidades)
export function CountUp({ value, format = "int", className }: { value: number; format?: "int" | "clp"; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const fmt = (n: number) =>
    format === "clp"
      ? new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(n))
      : String(Math.round(n));
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const controls = animate(0, value, { duration: 1.1, ease: EASE_OUT, onUpdate: (v) => { el.textContent = fmt(v); } });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);
  return <span ref={ref} className={className}>{fmt(value)}</span>;
}
