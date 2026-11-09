import { db } from "@/lib/db";

// Lo llama el cron diario de Vercel (vercel.json) para que Supabase (plan gratis) no pause
// la base por inactividad (>7 días sin uso). Hace una lectura real y liviana a la base.
// Si CRON_SECRET está definida, Vercel la manda como "Authorization: Bearer <CRON_SECRET>".
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  const users = await db.user.count();
  return Response.json({ ok: true, users, at: new Date().toISOString() });
}
