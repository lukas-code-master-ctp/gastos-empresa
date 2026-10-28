"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";

type Msg = { from: "me" | "bot"; text: string };

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(payload: { text?: string; file?: File }) {
    setBusy(true);
    setMsgs((m) => [...m, { from: "me", text: payload.file ? `📎 ${payload.file.name}` : payload.text! }]);
    const form = new FormData();
    if (payload.text) form.append("text", payload.text);
    if (payload.file) form.append("file", payload.file);
    const res = await fetch("/api/whatsapp/simulate", { method: "POST", body: form });
    const body = await res.json();
    setMsgs((m) => [...m, { from: "bot", text: body.answer ?? body.error }]);
    setBusy(false);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#efeae2]">
      <div className="bg-emerald-800 px-4 py-3 text-sm font-medium text-white">Rindefi · bot</div>
      <div className="flex h-[420px] flex-col gap-2 overflow-y-auto p-4">
        {msgs.length === 0 && <div className="m-auto text-sm text-slate-500">Envía una foto de una boleta para empezar.</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow-sm ${m.from === "me" ? "self-end bg-[#d9fdd3]" : "self-start bg-white"}`}>{m.text}</div>
        ))}
        {busy && <div className="self-start rounded-lg bg-white px-3 py-2 text-sm text-slate-400">escribiendo…</div>}
        <div ref={end} />
      </div>
      <form
        className="flex gap-2 bg-slate-100 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send({ text: text.trim() });
          setText("");
        }}
      >
        <label className="btn-secondary cursor-pointer px-3" aria-label="Adjuntar boleta">
          <Icon name="clip" />
          <input type="file" accept="image/*,application/pdf" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && send({ file: e.target.files[0] })} />
        </label>
        <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder="Escribe un mensaje" disabled={busy} />
        <button className="btn" disabled={busy}>Enviar</button>
      </form>
    </div>
  );
}
