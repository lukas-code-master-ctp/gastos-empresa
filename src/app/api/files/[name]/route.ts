import { readFile } from "fs/promises";
import path from "path";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UPLOAD_DIR } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("No autenticado", { status: 401 });
  const { name } = await params;
  const expense = await db.expense.findFirst({ where: { receiptPath: name, user: { companyId: user.companyId } } });
  if (!expense) return new Response("No encontrado", { status: 404 });
  const data = await readFile(path.join(UPLOAD_DIR, path.basename(name)));
  return new Response(data, { headers: { "content-type": expense.receiptMime ?? "application/octet-stream" } });
}
