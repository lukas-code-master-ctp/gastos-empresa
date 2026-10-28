import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("No autenticado", { status: 401 });
  const { name } = await params;
  const expense = await db.expense.findFirst({ where: { receiptPath: name, user: { companyId: user.companyId } } });
  // También sirve los comprobantes que adjunta tesorería
  const approval = expense ? null : await db.approval.findFirst({ where: { attachmentPath: name, user: { companyId: user.companyId } } });
  if (!expense && !approval) return new Response("No encontrado", { status: 404 });
  const data = await readStoredFile(name);
  if (!data) return new Response("Archivo no encontrado", { status: 404 });
  const mime = expense?.receiptMime ?? approval?.attachmentMime ?? "application/octet-stream";
  return new Response(data, { headers: { "content-type": mime } });
}
