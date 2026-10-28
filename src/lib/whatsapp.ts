import { db } from "./db";
import { createExpenseFromReceipt } from "./receipts";
import { clp, fecha } from "./format";

// Conversación por WhatsApp: el usuario envía la foto de la boleta, la IA la lee
// y el bot pide por mensaje la información faltante o dudosa, un campo a la vez.

type Field = { key: string; ask: string; parse: (t: string) => unknown };

const FIELDS: Field[] = [
  { key: "merchant", ask: "¿Cuál es el nombre del comercio?", parse: (t) => t },
  { key: "amount", ask: "¿Cuál es el monto total (IVA incluido)?", parse: (t) => parseInt(t.replace(/\D/g, ""), 10) || undefined },
  {
    key: "date",
    ask: "¿Qué fecha tiene el documento? (dd-mm-aaaa)",
    parse: (t) => {
      const m = t.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
      if (!m) return undefined;
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      return new Date(`${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T12:00:00`);
    },
  },
  {
    key: "docType",
    ask: "¿Es boleta o factura? (responde BOLETA, FACTURA u OTRO)",
    parse: (t) => ["BOLETA", "FACTURA", "OTRO"].find((d) => t.toUpperCase().includes(d)),
  },
  { key: "categoryId", ask: "", parse: () => undefined }, // se arma con la lista de categorías
  { key: "projectId", ask: "", parse: () => undefined },
];

async function askFor(phone: string, expenseId: string): Promise<string> {
  const e = await db.expense.findUniqueOrThrow({ where: { id: expenseId }, include: { user: true, category: true, project: true } });
  const raw = e.ocrRaw ? JSON.parse(e.ocrRaw) : {};
  const doubts: string[] = raw.doubts ?? [];
  const skipped: string[] = raw.skipped ?? [];
  const field = FIELDS.find((f) => {
    if (skipped.includes(f.key)) return false;
    const v = (e as Record<string, unknown>)[f.key];
    return v == null || doubts.includes(f.key);
  });

  if (!field) {
    await db.whatsappSession.update({ where: { phone }, data: { expenseId: null, pendingField: null } });
    return (
      `✅ Gasto creado: ${e.merchant} · ${clp(e.amount)} · ${fecha(e.date)} · ${e.category?.name}` +
      (e.project ? ` · ${e.project.name}` : "") +
      `.\nLo verás en la web, listo para agregarlo a un informe. Envía otra boleta cuando quieras.`
    );
  }

  await db.whatsappSession.update({ where: { phone }, data: { pendingField: field.key } });
  if (field.key === "categoryId" || field.key === "projectId") {
    const list =
      field.key === "categoryId"
        ? await db.category.findMany({ where: { companyId: e.user.companyId }, orderBy: { name: "asc" } })
        : await db.project.findMany({ where: { companyId: e.user.companyId }, orderBy: { name: "asc" } });
    const label = field.key === "categoryId" ? "la categoría" : "el proyecto (o 0 si no aplica)";
    return `Indica ${label} con su número:\n` + list.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
  }
  return field.ask;
}

async function applyAnswer(expenseId: string, key: string, text: string) {
  const e = await db.expense.findUniqueOrThrow({ where: { id: expenseId }, include: { user: true } });
  let value: unknown;
  if (key === "categoryId" || key === "projectId") {
    const list =
      key === "categoryId"
        ? await db.category.findMany({ where: { companyId: e.user.companyId }, orderBy: { name: "asc" } })
        : await db.project.findMany({ where: { companyId: e.user.companyId }, orderBy: { name: "asc" } });
    const n = parseInt(text, 10);
    if (key === "projectId" && n === 0) value = "";
    else value = list[n - 1]?.id;
  } else {
    value = FIELDS.find((f) => f.key === key)!.parse(text);
  }
  if (value === undefined) return false;
  // Al responder, el campo deja de estar en duda
  const raw = e.ocrRaw ? JSON.parse(e.ocrRaw) : { doubts: [] };
  raw.doubts = (raw.doubts ?? []).filter((d: string) => d !== key);
  // projectId "" = no aplica: se marca como omitido para no volver a preguntar
  if (value === "") raw.skipped = [...(raw.skipped ?? []), key];
  await db.expense.update({
    where: { id: expenseId },
    data: value === "" ? { ocrRaw: JSON.stringify(raw) } : { [key]: value, ocrRaw: JSON.stringify(raw) },
  });
  return true;
}

export async function handleIncoming(msg: { phone: string; text?: string; media?: { data: Buffer; mime: string } }): Promise<string> {
  const user = await db.user.findUnique({ where: { phone: msg.phone } });
  if (!user) return "Hola 👋 Este número no está registrado. Pide a tu administrador que lo asocie a tu usuario.";

  const session = await db.whatsappSession.upsert({ where: { phone: msg.phone }, create: { phone: msg.phone }, update: {} });

  if (msg.media) {
    const { expense, ocr } = await createExpenseFromReceipt(user.id, user.companyId, msg.media.data, msg.media.mime, "WHATSAPP");
    await db.whatsappSession.update({ where: { phone: msg.phone }, data: { expenseId: expense.id, pendingField: null } });
    const intro = ocr ? "📄 Recibí tu boleta y la leí." : "📄 Recibí tu boleta. No pude leerla automáticamente, te pediré los datos.";
    return `${intro}\n${await askFor(msg.phone, expense.id)}`;
  }

  if (session.expenseId && session.pendingField && msg.text) {
    if (msg.text.trim().toLowerCase() === "cancelar") {
      await db.whatsappSession.update({ where: { phone: msg.phone }, data: { expenseId: null, pendingField: null } });
      return "Listo, dejé el gasto en borrador. Puedes completarlo en la web.";
    }
    const ok = await applyAnswer(session.expenseId, session.pendingField, msg.text.trim());
    return (ok ? "" : "No entendí la respuesta. ") + (await askFor(msg.phone, session.expenseId));
  }

  return `Hola ${user.name.split(" ")[0]} 👋 Envíame una foto o PDF de tu boleta o factura y la registro como gasto.`;
}
