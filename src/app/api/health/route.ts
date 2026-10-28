import { list } from "@vercel/blob";
import { db } from "@/lib/db";

// Chequeo público (sin clave) de que la base y el almacenamiento de boletas responden.
export const dynamic = "force-dynamic";

export async function GET() {
  const users = await db.user.count();
  const blob = process.env.BLOB_READ_WRITE_TOKEN ? (await list({ limit: 1 }), "ok") : "local";
  return Response.json({ ok: true, users, blob });
}
