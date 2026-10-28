"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icons";

export default function Uploader() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/ocr", { method: "POST", body: form });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Error al subir");
      setBusy(false);
      return;
    }
    router.push(`/gastos/${body.id}?ocr=${body.ocr ? "1" : "0"}`);
  }

  return (
    <label className={`card group flex cursor-pointer flex-col items-center justify-center border-2 border-dashed py-14 text-center ${busy ? "opacity-60" : "hover:border-emerald-600"}`}>
      <input
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        disabled={busy}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <div className={`mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-700 text-white ${busy ? "animate-pulse" : "transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-4deg]"}`}><Icon name={busy ? "receipt" : "upload"} className="size-7" /></div>
      <div className="mt-3 font-medium">{busy ? "Leyendo la boleta con IA…" : "Toca para sacar una foto o elegir un archivo"}</div>
      <div className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP o PDF, hasta 10 MB</div>
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
    </label>
  );
}
