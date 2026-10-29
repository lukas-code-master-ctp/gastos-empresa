import { list } from "@vercel/blob";
import { db } from "@/lib/db";
import { blobEnabled } from "@/lib/storage";
import { ocrEnabled } from "@/lib/ocr";

// Chequeo público (sin clave) de que la base y el almacenamiento de boletas responden.
export const dynamic = "force-dynamic";

export async function GET() {
  const users = await db.user.count();
  const blob = blobEnabled() ? (await list({ limit: 1 }), "ok") : "local";
  return Response.json({ ok: true, users, blob, ocr: ocrEnabled() ? "openrouter" : "off" });
}
