import { handleIncoming } from "@/lib/whatsapp";

// Webhook para Meta WhatsApp Cloud API.
// Configurar en Meta: URL https://<dominio>/api/whatsapp/webhook y WHATSAPP_VERIFY_TOKEN.
const GRAPH = "https://graph.facebook.com/v21.0";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN)
    return new Response(url.searchParams.get("hub.challenge") ?? "");
  return new Response("Token inválido", { status: 403 });
}

async function downloadMedia(id: string) {
  const headers = { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
  const meta = await (await fetch(`${GRAPH}/${id}`, { headers })).json();
  const res = await fetch(meta.url, { headers });
  return { data: Buffer.from(await res.arrayBuffer()), mime: String(meta.mime_type).split(";")[0] };
}

async function reply(to: string, body: string) {
  await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const messages = body?.entry?.flatMap((e: any) => e.changes?.flatMap((c: any) => c.value?.messages ?? []) ?? []) ?? []; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const m of messages) {
    const mediaId = m.image?.id ?? m.document?.id;
    const answer = await handleIncoming({
      phone: m.from,
      text: m.text?.body ?? m.image?.caption,
      media: mediaId ? await downloadMedia(mediaId) : undefined,
    });
    await reply(m.from, answer);
  }
  return Response.json({ ok: true });
}
