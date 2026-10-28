import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

// Autenticación de demostración: el usuario elige con quién entrar.
// En producción reemplazar por SSO / NextAuth.
const COOKIE = "gastos_uid";

export async function currentUser() {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  return db.user.findUnique({ where: { id }, include: { company: true, manager: true } });
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSession(userId: string) {
  (await cookies()).set(COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
