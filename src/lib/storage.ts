import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { get, put } from "@vercel/blob";

// Boletas y comprobantes. Con BLOB_READ_WRITE_TOKEN (Vercel) se guardan en Vercel Blob privado;
// sin él, en la carpeta local uploads/ (desarrollo).
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function saveFile(data: Buffer, mime: string) {
  const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1] ?? "bin";
  const name = `${randomUUID()}.${ext}`;
  if (blobEnabled()) {
    await put(`uploads/${name}`, data, { access: "private", contentType: mime, addRandomSuffix: false });
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), data);
  }
  return name;
}

export async function readStoredFile(name: string): Promise<BodyInit | null> {
  const safe = path.basename(name);
  if (blobEnabled()) {
    const res = await get(`uploads/${safe}`, { access: "private" });
    return res?.statusCode === 200 ? res.stream : null;
  }
  return readFile(path.join(UPLOAD_DIR, safe)).catch(() => null);
}
