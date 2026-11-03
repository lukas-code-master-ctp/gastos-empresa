import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Abrir un aviso: lo marca como leído y lleva a la pantalla del informe o fondo
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const n = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!n) return NextResponse.redirect(new URL("/avisos", req.url));
  if (!n.readAt) await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  return NextResponse.redirect(new URL(n.href.startsWith("/") ? n.href : "/avisos", req.url));
}
