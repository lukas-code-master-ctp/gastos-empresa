import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { adminEmails, googleEnabled, setSession, verify } from "@/lib/auth";
import { callbackUrl, STATE_COOKIE } from "@/lib/google";

type IdToken = { aud: string; email?: string; email_verified?: boolean; name?: string };

// Google vuelve acá con ?code=…: se canjea por el id_token, se busca al usuario por su correo y se abre sesión.
export async function GET(req: NextRequest) {
  const fail = (error: string, email?: string) => {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", error);
    if (email) url.searchParams.set("email", email);
    const res = NextResponse.redirect(url);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
    return res;
  };
  if (!googleEnabled()) return fail("google");
  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("cancelado");
  const state = verify(req.cookies.get(STATE_COOKIE)?.value);
  const code = params.get("code");
  if (!state || state !== params.get("state") || !code) return fail("estado");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl(req),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    console.error("Google token", tokenRes.status, await tokenRes.text());
    return fail("google");
  }
  // El id_token llega directo de Google por TLS, así que basta con leerlo y revisar la audiencia
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  let claims: IdToken;
  try {
    claims = JSON.parse(Buffer.from(id_token!.split(".")[1], "base64url").toString());
  } catch {
    return fail("google");
  }
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID) return fail("google");
  const email = claims.email?.toLowerCase();
  if (!email || !claims.email_verified) return fail("no-verificado");

  let user = await db.user.findUnique({ where: { email } });
  if (!user && adminEmails().includes(email)) {
    // Primer ingreso de un administrador: entra a la empresa existente (o se crea una)
    const company =
      (await db.company.findFirst({ orderBy: { createdAt: "asc" } })) ??
      (await db.company.create({ data: { name: "Mi empresa", rut: "" } }));
    user = await db.user.create({ data: { name: claims.name ?? email, email, role: "ADMIN", companyId: company.id } });
  }
  if (!user) return fail("no-registrado", email);

  await setSession(user.id);
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.delete({ name: STATE_COOKIE, path: "/api/auth" });
  return res;
}
