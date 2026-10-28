import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { handleIncoming } from "@/lib/whatsapp";

// Simulador del canal WhatsApp para probar sin la API de Meta.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.phone) return NextResponse.json({ error: "Tu usuario no tiene teléfono asociado" }, { status: 400 });
  const form = await req.formData();
  const file = form.get("file");
  const text = form.get("text");
  const answer = await handleIncoming({
    phone: user.phone,
    text: typeof text === "string" ? text : undefined,
    media: file instanceof File ? { data: Buffer.from(await file.arrayBuffer()), mime: file.type } : undefined,
  });
  return NextResponse.json({ answer });
}
