import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createExpenseFromReceipt } from "@/lib/receipts";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

// Subida de boleta desde la web: guarda, lee con IA y crea el gasto en borrador.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Formato no soportado (usa JPG, PNG, WEBP o PDF)" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "El archivo supera 10 MB" }, { status: 400 });
  const { expense, ocr, ocrError } = await createExpenseFromReceipt(user.id, user.companyId, Buffer.from(await file.arrayBuffer()), file.type, "WEB");
  return NextResponse.json({ id: expense.id, ocr: Boolean(ocr), ocrError });
}
