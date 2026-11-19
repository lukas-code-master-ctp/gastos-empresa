import { db } from "@/lib/db";

// Lo llama el cron diario de Vercel (vercel.json) para que Supabase (plan gratis) no pause
// la base por inactividad (>7 días sin uso). Si CRON_SECRET está definida, Vercel la manda
// como "Authorization: Bearer <CRON_SECRET>".
//
// Con solo una consulta por Prisma (que entra por el pooler de Postgres) Supabase igual avisó
// que pausaría el proyecto (2026-11-19): esa actividad no le cuenta. Por eso además se llama a
// la API de Supabase (Auth y PostgREST, que pasan por su gateway), que es lo que sí mide.
export const dynamic = "force-dynamic";

async function ping(url: string, key: string) {
  try {
    const res = await fetch(url, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return res.status;
  } catch (e) {
    return `error: ${(e as Error).message}`;
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }

  const users = await db.user.count();

  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const publicKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || publicKey;

  const supabase = base
    ? {
        auth: publicKey ? await ping(`${base}/auth/v1/health`, publicKey) : "sin clave",
        rest: serverKey ? await ping(`${base}/rest/v1/`, serverKey) : "sin clave",
      }
    : "sin SUPABASE_URL";

  const result = { ok: true, users, supabase, at: new Date().toISOString() };
  console.log("keepalive", JSON.stringify(result));
  return Response.json(result);
}
