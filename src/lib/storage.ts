import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Almacenamiento local de boletas. En producción usar S3 / GCS / Vercel Blob.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function saveFile(data: Buffer, mime: string) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1] ?? "bin";
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), data);
  return name;
}
