"use client";

import { useCallback, useEffect, useRef } from "react";
import { R_PATH, RECEIPT_PATH } from "@/lib/brand";

const MANDARINA = "#FF5A1F";

// Boleta cortada con la línea del medio en mandarina. `inner` es el color de las otras líneas (el fondo).
export function Receipt({ className, fill = "currentColor", inner }: { className?: string; fill?: string; inner: string }) {
  return (
    <svg viewBox="0 0 30 44" className={className} aria-hidden="true">
      <path fill={fill} d={RECEIPT_PATH} />
      <rect x="7" y="9" width="11" height="3.6" rx="1.8" fill={inner} />
      <rect x="7" y="17" width="16" height="3.6" rx="1.8" fill={MANDARINA} />
      <rect x="7" y="25" width="8" height="3.6" rx="1.8" fill={inner} />
    </svg>
  );
}

// Ícono reducido: {boleta}R.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Rindefi">
      <rect width="64" height="64" rx="14" fill="#5B1A4F" />
      <path fill="#FBE9F0" d="M5 14h17v31l-2.125 3-2.125-3-2.125 3-2.125-3-2.125 3-2.125-3-2.125 3-2.125-3z" />
      <rect x="8.5" y="19" width="7" height="2.8" rx="1.4" fill="#5B1A4F" />
      <rect x="8.5" y="25" width="10" height="2.8" rx="1.4" fill={MANDARINA} />
      <rect x="8.5" y="31" width="5" height="2.8" rx="1.4" fill="#5B1A4F" />
      <path fill="#FBE9F0" transform="translate(25.5 46) scale(0.035 -0.035) translate(-69 0)" d={R_PATH} />
      <circle cx="51.5" cy="42" r="4" fill={MANDARINA} />
    </svg>
  );
}

const LETTERS = [..."Rindefi"];

// La bolita cae sobre la última i, la i se hunde, y rebota hasta quedar como punto final
function bounce(word: HTMLElement) {
  const ball = word.querySelector<HTMLElement>("[data-ball]");
  const letters = [...word.querySelectorAll<HTMLElement>("[data-letter]")];
  const ib = letters[letters.length - 1];
  if (!ball || !ib || !ball.animate) return;
  ball.getAnimations().forEach((a) => a.cancel());
  letters.forEach((l, i) =>
    l.animate([{ transform: "translateY(.45em)", opacity: 0 }, { transform: "none", opacity: 1 }], {
      duration: 600, delay: i * 50, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards",
    }),
  );
  const cs = getComputedStyle(word);
  const em = parseFloat(cs.fontSize);
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return;
  ctx.font = `${cs.fontWeight} ${em}px ${cs.fontFamily}`;
  const m = ctx.measureText("i");
  const br = ball.getBoundingClientRect();
  const ir = ib.getBoundingClientRect();
  const r = br.height / 2;
  const dx = ir.left + m.width / 2 - (br.left + r);
  const dy = br.bottom - m.actualBoundingBoxAscent - r - (br.top + r);
  const T = (x: number, y: number, s = "") => `translate(${x}px, ${y}px) ${s}`;
  const fall = "cubic-bezier(.55,0,1,.45)";
  const up = "cubic-bezier(0,.55,.45,1)";
  const dur = 1400;
  const delay = letters.length * 50 + 150;
  ball.animate(
    [
      { transform: T(dx, dy - 1.7 * em), opacity: 0, offset: 0, easing: fall },
      { transform: T(dx, dy - 1.6 * em), opacity: 1, offset: 0.06, easing: fall },
      { transform: T(dx, dy + 0.07 * em, "scale(1.35,.65)"), offset: 0.36, easing: up },
      { transform: T(dx * 0.45, dy - 0.38 * em, "scale(.94,1.08)"), offset: 0.62, easing: fall },
      { transform: T(0, 0, "scale(1.3,.7)"), offset: 0.86, easing: up },
      { transform: T(0, -0.13 * em), offset: 0.93, easing: fall },
      { transform: T(0, 0), offset: 1 },
    ],
    { duration: dur, delay, fill: "backwards" },
  );
  ib.animate([{ transform: "none" }, { transform: `translateY(${0.08 * em}px)` }, { transform: "none" }], {
    duration: 300, delay: delay + dur * 0.36 - 60, easing: "ease-out",
  });
}

// Logo completo: boleta + "Rindefi." con la bolita. `tone` según el fondo donde va.
export function Logo({ tone = "light", className = "", animate = true }: { tone?: "light" | "dark"; className?: string; animate?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const play = useCallback(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    (document.fonts?.ready ?? Promise.resolve()).then(() => bounce(el));
  }, []);
  useEffect(() => { if (animate) play(); }, [animate, play]);
  const ink = tone === "light" ? "#FBE9F0" : "#2B1028";
  const bg = tone === "light" ? "#2B1028" : "#FBF3EE";
  return (
    <span className={`inline-flex items-end gap-[.2em] ${className}`} onMouseEnter={animate ? play : undefined} aria-label="Rindefi" role="img">
      <Receipt className="h-[.82em] w-auto shrink-0 mb-[.02em]" fill={ink} inner={bg} />
      <span ref={ref} className="whitespace-nowrap font-display font-extrabold leading-[.95] tracking-[-0.045em]" style={{ color: ink }} aria-hidden="true">
        {LETTERS.map((c, i) => (
          <span key={i} data-letter className="inline-block" style={i === LETTERS.length - 1 ? { marginLeft: ".035em" } : undefined}>{c}</span>
        ))}
        <span data-ball className="ml-[.06em] inline-block size-[.19em] rounded-full bg-mandarina-500" style={{ transformOrigin: "50% 100%" }} />
      </span>
    </span>
  );
}
