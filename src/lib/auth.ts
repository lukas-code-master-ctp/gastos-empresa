import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

// Sesión en cookie firmada (userId.firma). Se entra con Google (OAuth) cuando están
// GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET; sin ellas (local) queda el selector de usuarios de demo.
const COOKIE = "rindefi_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
// Con Google activo el selector de demo se apaga, salvo que se pida con DEMO_LOGIN=1
export const demoEnabled = () => !googleEnabled() || process.env.DEMO_LOGIN === "1";

// AUTH_SECRET es opcional: si no está se firma con el secreto de Google (nunca sale del servidor)
function secret() {
  const s = process.env.AUTH_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production" && !demoEnabled()) throw new Error("Falta AUTH_SECRET");
  return "rindefi-demo";
}

export const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

export function verify(signed: string | undefined) {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i <= 0) return null;
  const value = signed.slice(0, i);
  const a = Buffer.from(signed.slice(i + 1));
  const b = Buffer.from(sign(value));
  return a.length === b.length && timingSafeEqual(a, b) ? value : null;
}

export async function currentUser() {
  const id = verify((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  return db.user.findUnique({ where: { id }, include: { company: true, manager: true } });
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSession(userId: string) {
  (await cookies()).set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

// Correos que entran como administrador aunque nadie los haya creado (para el primer ingreso)
export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
