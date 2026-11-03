import { after } from "next/server";
import { db } from "./db";
import { flowOf } from "./workflow";

// Avisos cuando un informe o fondo avanza: quedan en la campanita y, si hay RESEND_API_KEY, llegan por correo.
// Un error al avisar nunca debe frenar la aprobación, así que todo va en try/catch.

const APP_URL = () => (process.env.APP_URL ?? "https://app.rindefi.cl").replace(/\/$/, "");
const FROM = () => process.env.NOTIFY_FROM ?? "Rindefi <avisos@rindefi.cl>";

export type Aviso = { title: string; body?: string | null; href: string };

type Owner = { id: string; managerId: string | null; companyId: string };
type InFlow = { currentStep: string | null; flowSteps: string | null; user: Owner };

export async function notify(userIds: (string | null | undefined)[], aviso: Aviso) {
  const ids = [...new Set(userIds.filter((x): x is string => Boolean(x)))];
  if (ids.length === 0) return;
  try {
    const users = await db.user.findMany({ where: { id: { in: ids }, active: true }, select: { id: true, email: true, name: true } });
    if (users.length === 0) return;
    await db.notification.createMany({ data: users.map((u) => ({ userId: u.id, title: aviso.title, body: aviso.body ?? null, href: aviso.href })) });
    const key = process.env.RESEND_API_KEY;
    if (!key) return;
    // El correo se manda después de responder, para que aprobar no se ponga lento
    after(() => Promise.all(users.map((u) => sendEmail(key, u, aviso))));
  } catch (err) {
    console.error("Error creando avisos", err);
  }
}

// Quienes deben actuar en el paso actual (sin contar a quien rinde)
export async function notifyApprovers(item: InFlow, aviso: Aviso) {
  try {
    const step = item.currentStep && flowOf(item).find((s) => s.id === item.currentStep);
    if (!step) return;
    let ids: (string | null)[] = [];
    if (step.kind === "JEFE") ids = [item.user.managerId];
    else if (step.kind === "USER") ids = [step.userId ?? null];
    else if (step.role) {
      const users = await db.user.findMany({ where: { companyId: item.user.companyId, role: step.role, active: true }, select: { id: true } });
      ids = users.map((u) => u.id);
    }
    await notify(ids.filter((id) => id !== item.user.id), aviso);
  } catch (err) {
    console.error("Error avisando a aprobadores", err);
  }
}

export async function notifyRole(companyId: string, roles: string[], aviso: Aviso, exceptId?: string) {
  try {
    const users = await db.user.findMany({ where: { companyId, role: { in: roles }, active: true }, select: { id: true } });
    await notify(users.map((u) => u.id).filter((id) => id !== exceptId), aviso);
  } catch (err) {
    console.error("Error avisando por rol", err);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function sendEmail(key: string, to: { email: string; name: string }, aviso: Aviso) {
  const link = `${APP_URL()}${aviso.href}`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2B1028">
  <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em">Rindefi<span style="color:#FF5A1F">.</span></div>
  <p style="margin:20px 0 4px">Hola ${esc(to.name.split(" ")[0])},</p>
  <h1 style="font-size:18px;margin:4px 0 8px">${esc(aviso.title)}</h1>
  ${aviso.body ? `<p style="margin:0 0 20px;color:#475569">${esc(aviso.body)}</p>` : ""}
  <a href="${link}" style="display:inline-block;background:#FF5A1F;color:#ffffff;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:12px">Ver en Rindefi</a>
  <p style="margin-top:28px;font-size:12px;color:#94a3b8">Recibes este correo porque participas en una rendición en Rindefi.</p>
</div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM(),
        to: [to.email],
        subject: aviso.title,
        html,
        text: `${aviso.title}\n\n${aviso.body ?? ""}\n\nVer en Rindefi: ${link}`,
      }),
    });
    if (!res.ok) console.error("Resend respondió", res.status, await res.text());
  } catch (err) {
    console.error("Error enviando correo", err);
  }
}
