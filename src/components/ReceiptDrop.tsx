"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/Icons";

const MAX_BYTES = 10 * 1024 * 1024;
const PARALLEL = 3;
const BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};
const ALLOWED = new Set(Object.values(BY_EXT));

type Item = { key: string; name: string; status: "queued" | "uploading" | "done" | "error"; id?: string; ocr?: boolean; error?: string };

// El explorador a veces entrega el archivo sin tipo: se deduce por la extensión.
function normalize(file: File): File | null {
  const type = file.type || BY_EXT[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
  if (!ALLOWED.has(type)) return null;
  return type === file.type ? file : new File([file], file.name, { type });
}

async function uploadOne(file: File): Promise<{ id?: string; ocr?: boolean; error?: string }> {
  if (file.size > MAX_BYTES) return { error: "Supera 10 MB" };
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch("/api/ocr", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    if (res.status === 413) return { error: "Archivo muy pesado" };
    if (!res.ok) return { error: body.error ?? "No se pudo subir" };
    return { id: body.id, ocr: Boolean(body.ocr) };
  } catch {
    return { error: "Sin conexión" };
  }
}

// Arrastrar y soltar boletas (PDF o imágenes, varias a la vez) en cualquier parte de la pantalla:
// cada archivo se sube, se lee con IA y queda como un gasto en borrador.
export default function ReceiptDrop() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [mounted, setMounted] = useState(false);
  const depth = useRef(0);
  const seq = useRef(0);

  const busy = items.some((i) => i.status === "queued" || i.status === "uploading");

  async function handleFiles(list: File[]) {
    const batch = list.map((raw) => {
      const file = normalize(raw);
      const item: Item = { key: `${seq.current++}`, name: raw.name, status: file ? "queued" : "error", error: file ? undefined : "Formato no soportado" };
      return { file, item };
    });
    if (!batch.length) return;
    setItems((prev) => [...prev.filter((i) => i.status === "queued" || i.status === "uploading"), ...batch.map((b) => b.item)]);

    const queue = batch.filter((b) => b.file);
    const results: Item[] = [];
    const update = (key: string, patch: Partial<Item>) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
    async function worker() {
      for (let next = queue.shift(); next; next = queue.shift()) {
        update(next.item.key, { status: "uploading" });
        const r = await uploadOne(next.file!);
        const done: Item = { ...next.item, ...r, status: r.error ? "error" : "done" };
        results.push(done);
        update(next.item.key, done);
      }
    }
    await Promise.all(Array.from({ length: PARALLEL }, worker));

    const ok = results.filter((r) => r.status === "done");
    // Una sola boleta: directo a completarla, como al subirla desde "Subir boleta"
    if (batch.length === 1 && ok.length === 1) {
      router.push(`/gastos/${ok[0].id}?ocr=${ok[0].ocr ? "1" : "0"}`);
      setItems([]);
      return;
    }
    if (ok.length) router.refresh();
  }

  useEffect(() => {
    setMounted(true);
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current++;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      handleFiles(Array.from(e.dataTransfer?.files ?? []));
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
    // handleFiles solo usa refs y setters estables
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = items.filter((i) => i.status === "done").length;
  const finished = items.filter((i) => i.status === "done" || i.status === "error").length;

  // Portal al body: la animación de entrada de cada pantalla usa transform y encerraría el "fixed"
  if (!mounted) return null;
  return createPortal(
    <>
      <AnimatePresence>
        {dragging && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-emerald-950/55 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg rounded-3xl border-2 border-dashed border-mandarina-400 bg-white px-8 py-14 text-center shadow-2xl"
            >
              <div className="mx-auto grid size-16 animate-bounce place-items-center rounded-2xl bg-emerald-700 text-white"><Icon name="upload" className="size-8" /></div>
              <div className="mt-4 font-display text-2xl font-extrabold tracking-[-0.03em] text-ink">Suelta para crear gastos<span className="text-mandarina-500">.</span></div>
              <div className="mt-2 text-sm text-slate-500">Cada boleta o factura (PDF, JPG, PNG o WEBP) queda como un gasto y la IA lee sus datos.</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed inset-x-4 bottom-4 z-40 ml-auto max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl sm:right-6 sm:left-auto"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="text-sm font-semibold">
                {busy ? `Creando gastos… ${finished} de ${items.length}` : `${done} ${done === 1 ? "gasto creado" : "gastos creados"}`}
              </div>
              {!busy && (
                <button type="button" onClick={() => setItems([])} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar">
                  <Icon name="x" className="size-4" />
                </button>
              )}
            </div>
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {items.map((i) => (
                <li key={i.key} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full ${i.status === "done" ? "bg-emerald-700 text-white" : i.status === "error" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                    <Icon name={i.status === "done" ? "ok" : i.status === "error" ? "x" : "receipt"} className={`size-3.5 ${i.status === "uploading" ? "animate-pulse" : ""}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{i.name}</div>
                    <div className={`text-xs ${i.status === "error" ? "text-red-600" : "text-slate-500"}`}>
                      {i.status === "queued" && "En espera"}
                      {i.status === "uploading" && "Leyendo con IA…"}
                      {i.status === "done" && (i.ocr ? "Datos capturados" : "Completa los datos a mano")}
                      {i.status === "error" && i.error}
                    </div>
                  </div>
                  {i.status === "done" && i.id && (
                    <Link href={`/gastos/${i.id}`} className="shrink-0 text-xs font-medium text-emerald-700 hover:underline">Revisar</Link>
                  )}
                </li>
              ))}
            </ul>
            {!busy && done > 0 && (
              <div className="border-t border-slate-100 px-4 py-2.5 text-right">
                <Link href="/gastos" className="text-xs font-medium text-emerald-700 hover:underline">Ver mis gastos</Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
