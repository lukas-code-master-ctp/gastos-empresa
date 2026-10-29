"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { approverLabel, APPROVER_ROLES, FLOW_KINDS, type StepDef } from "@/lib/flows";
import { clp, ROLES } from "@/lib/format";
import { FlowChain } from "@/components/FlowChain";
import { Icon } from "@/components/Icons";
import { SPRING } from "@/components/motion";

type Person = { id: string; name: string; role: string };

const newId = () => Math.random().toString(36).slice(2, 10);
const digits = (v: string) => {
  const n = parseInt(v.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Editor de un flujo: nombre, tipos a los que aplica y pasos en orden, con vista previa por monto
export function FlowEditor({
  action,
  initial,
  users,
  takenBy,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial: { name: string; appliesTo: string[]; steps: StepDef[] };
  users: Person[];
  takenBy: Record<string, string>; // tipo → nombre del otro flujo que lo usa
}) {
  const [steps, setSteps] = useState<StepDef[]>(initial.steps);
  const [kinds, setKinds] = useState<string[]>(initial.appliesTo);
  const [sample, setSample] = useState<number | null>(null);
  const name = (id: string) => users.find((u) => u.id === id)?.name;

  const update = (i: number, patch: Partial<StepDef>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setSteps((s) => {
      const t = [...s];
      [t[i], t[i + d]] = [t[i + d], t[i]];
      return t;
    });
  const incomplete = steps.some((s) => (s.kind === "ROLE" && !s.role) || (s.kind === "USER" && !s.userId));
  const ready = steps.length > 0 && kinds.length > 0 && !incomplete;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-5">
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />
      <div className="space-y-6 lg:col-span-3">
        <div className="card space-y-5">
          <div>
            <label className="label" htmlFor="name">Nombre del flujo</label>
            <input id="name" name="name" defaultValue={initial.name} required className="input" placeholder="Ej: Reembolsos con gerencia" />
          </div>
          <fieldset>
            <legend className="label">Se usa para</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(FLOW_KINDS).map(([k, label]) => {
                const on = kinds.includes(k);
                return (
                  <label
                    key={k}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition ${on ? "border-emerald-700 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <input
                      type="checkbox"
                      name="appliesTo"
                      value={k}
                      checked={on}
                      onChange={(e) => setKinds((ks) => (e.target.checked ? [...ks, k] : ks.filter((x) => x !== k)))}
                      className="mt-0.5 size-4 accent-emerald-700"
                    />
                    <span>
                      <span className="font-medium">{label}</span>
                      {takenBy[k] && <span className="block text-xs text-slate-500">{on ? `Se quitará de "${takenBy[k]}"` : `Hoy lo usa "${takenBy[k]}"`}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Pasos, en orden</h2>
            <span className="text-xs text-slate-400">El admin siempre puede aprobar cualquier paso</span>
          </div>
          <ol className="space-y-3">
            <AnimatePresence initial={false}>
              {steps.map((s, i) => (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                  transition={SPRING}
                  className="card relative flex gap-4"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="grid size-8 place-items-center rounded-full bg-emerald-700 font-mono text-xs font-semibold text-white">{i + 1}</span>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:invisible" aria-label="Subir paso">
                      <Icon name="up" className="size-4" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:invisible" aria-label="Bajar paso">
                      <Icon name="down" className="size-4" />
                    </button>
                  </div>
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Aprueba</label>
                      <select
                        className="input"
                        value={s.kind}
                        onChange={(e) => update(i, { kind: e.target.value as StepDef["kind"], role: undefined, userId: undefined })}
                      >
                        <option value="JEFE">Jefe directo de quien rinde</option>
                        <option value="ROLE">Cualquiera con un rol</option>
                        <option value="USER">Una persona</option>
                      </select>
                    </div>
                    {s.kind === "ROLE" && (
                      <div>
                        <label className="label">Rol</label>
                        <select className="input" value={s.role ?? ""} onChange={(e) => update(i, { role: e.target.value || undefined })}>
                          <option value="">Elegir rol…</option>
                          {APPROVER_ROLES.map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
                        </select>
                      </div>
                    )}
                    {s.kind === "USER" && (
                      <div>
                        <label className="label">Persona</label>
                        <select className="input" value={s.userId ?? ""} onChange={(e) => update(i, { userId: e.target.value || undefined })}>
                          <option value="">Elegir persona…</option>
                          {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLES[u.role]}</option>)}
                        </select>
                      </div>
                    )}
                    {s.kind === "JEFE" && <p className="self-end pb-2.5 text-xs text-slate-500">Si quien rinde no tiene jefe directo, este paso se salta.</p>}
                    <div className="sm:col-span-2">
                      <label className="label">Solo si el monto es desde (opcional)</label>
                      <input
                        className="input"
                        inputMode="numeric"
                        placeholder="Siempre"
                        value={s.minAmount ? s.minAmount.toLocaleString("es-CL") : ""}
                        onChange={(e) => update(i, { minAmount: digits(e.target.value) })}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSteps((x) => x.filter((_, j) => j !== i))}
                    className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                    aria-label={`Quitar paso ${i + 1}`}
                  >
                    <Icon name="x" className="size-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          <motion.button
            layout
            type="button"
            onClick={() => setSteps((s) => [...s, { id: newId(), kind: "ROLE" }])}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-500 transition hover:border-mandarina-500 hover:text-mandarina-600"
          >
            <Icon name="plus" className="size-4" /> Agregar paso
          </motion.button>
        </div>
      </div>

      <aside className="lg:col-span-2">
        <div className="card space-y-4 lg:sticky lg:top-10">
          <h2>Vista previa</h2>
          <div>
            <label className="label" htmlFor="sample">Probar con un monto</label>
            <input id="sample" className="input" inputMode="numeric" placeholder="Ej: 750.000" value={sample ? sample.toLocaleString("es-CL") : ""} onChange={(e) => setSample(digits(e.target.value))} />
          </div>
          {steps.length === 0 ? (
            <p className="text-sm text-slate-500">Agrega al menos un paso.</p>
          ) : (
            <FlowChain
              steps={steps.map((s) => ({
                label: s.kind === "ROLE" && !s.role ? "Rol por elegir" : s.kind === "USER" && !s.userId ? "Persona por elegir" : approverLabel(s, name),
                minAmount: s.minAmount,
                off: sample != null && !!s.minAmount && sample < s.minAmount,
              }))}
            />
          )}
          {sample != null && <p className="text-xs text-slate-500">Los pasos atenuados no aplican a una rendición de {clp(sample)}.</p>}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <button className="btn" disabled={!ready}>Guardar flujo</button>
            <Link href="/admin/flujos" className="btn-secondary">Cancelar</Link>
          </div>
          {!ready && (
            <p className="text-xs text-mandarina-700">
              {kinds.length === 0 ? "Elige para qué tipo se usa." : steps.length === 0 ? "Agrega al menos un paso." : "Completa el rol o la persona de cada paso."}
            </p>
          )}
        </div>
      </aside>
    </form>
  );
}
