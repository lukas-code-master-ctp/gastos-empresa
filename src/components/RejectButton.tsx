"use client";

import { useState } from "react";

// Botón de rechazo: al hacer click abre una ventana que pide el motivo
export function RejectButton({
  action,
  label,
  title,
  hidden = {},
  small = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  title: string;
  hidden?: Record<string, string>;
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={small ? "rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 no-underline hover:bg-red-50" : "btn-danger"}
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setOpen(false)}>
          <form action={action} onClick={(e) => e.stopPropagation()} className="card w-full max-w-md space-y-3 text-left no-underline">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <textarea name="comment" rows={3} required autoFocus className="input" placeholder="Motivo del rechazo" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
              <button className="btn-danger">Confirmar rechazo</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
