import { db } from "./db";
import { saveFile } from "./storage";
import { readReceipt } from "./ocr";

// Guarda la boleta, la lee con IA y crea el gasto en borrador con lo capturado.
export async function createExpenseFromReceipt(userId: string, companyId: string, file: Buffer, mime: string, source: "WEB" | "WHATSAPP") {
  const receiptPath = await saveFile(file, mime);
  const categories = await db.category.findMany({ where: { companyId } });
  let ocr = null;
  let ocrError: string | null = null;
  try {
    ocr = await readReceipt(file, mime, categories.map((c) => c.name));
  } catch (err) {
    console.error("Error OCR", err);
    ocrError = err instanceof Error ? err.message : String(err);
  }
  const category = ocr?.category ? categories.find((c) => c.name.toLowerCase() === ocr.category!.toLowerCase()) : undefined;
  const expense = await db.expense.create({
    data: {
      userId,
      source,
      receiptPath,
      receiptMime: mime,
      merchant: ocr?.merchant ?? null,
      rutProvider: ocr?.rutProvider ?? null,
      docType: ocr?.docType ?? null,
      docNumber: ocr?.docNumber ?? null,
      date: ocr?.date && !isNaN(Date.parse(ocr.date)) ? new Date(`${ocr.date}T12:00:00`) : null,
      amount: ocr?.amount ?? null,
      iva: ocr?.iva ?? null,
      categoryId: category?.id ?? null,
      ocrRaw: ocr ? JSON.stringify({ ...ocr, doubts: ocr.doubts.map((d) => (d === "category" ? "categoryId" : d)) }) : null,
    },
  });
  return { expense, ocr, ocrError };
}
