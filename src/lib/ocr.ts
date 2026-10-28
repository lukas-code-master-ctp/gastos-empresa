import * as z from "zod/v4";

export const ReceiptSchema = z.object({
  merchant: z.string().nullable().describe("Nombre del comercio o razón social"),
  rutProvider: z.string().nullable().describe("RUT del proveedor, formato 12.345.678-9"),
  docType: z.enum(["BOLETA", "FACTURA", "OTRO"]).nullable(),
  docNumber: z.string().nullable().describe("Número o folio del documento"),
  date: z.string().nullable().describe("Fecha de emisión en formato YYYY-MM-DD"),
  amount: z.number().nullable().describe("Monto total en pesos chilenos, IVA incluido, sin puntos ni signo"),
  iva: z.number().nullable().describe("Monto del IVA en pesos chilenos, si aparece"),
  category: z.string().nullable().describe("Una de las categorías entregadas, la que mejor calce"),
  doubts: z.array(z.string()).describe("Campos ilegibles o dudosos, por nombre de campo"),
});

export type ReceiptData = z.infer<typeof ReceiptSchema>;

// Modelo por defecto: barato, con visión y lectura nativa de PDF. Se cambia con OPENROUTER_MODEL
// (se pueden poner varios separados por coma: si el primero falla, OpenRouter prueba el siguiente).
const DEFAULT_MODEL = "google/gemini-3.1-flash-lite";

export const ocrEnabled = () => Boolean(process.env.OPENROUTER_API_KEY);

const jsonSchema: Record<string, unknown> = z.toJSONSchema(ReceiptSchema, { target: "draft-7" });
delete jsonSchema.$schema;

// Lee una boleta o factura (imagen o PDF) con un modelo de visión vía OpenRouter y devuelve los datos estructurados.
export async function readReceipt(file: Buffer, mime: string, categories: string[]): Promise<ReceiptData | null> {
  if (!ocrEnabled()) return null;
  const models = (process.env.OPENROUTER_MODEL || DEFAULT_MODEL).split(",").map((m) => m.trim()).filter(Boolean);
  const dataUrl = `data:${mime};base64,${file.toString("base64")}`;
  const media =
    mime === "application/pdf"
      ? { type: "file", file: { filename: "boleta.pdf", file_data: dataUrl } }
      : { type: "image_url", image_url: { url: dataUrl } };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://app.rindefi.cl",
      "X-Title": "Rindefi",
    },
    body: JSON.stringify({
      ...(models.length > 1 ? { models } : { model: models[0] }),
      temperature: 0,
      max_tokens: 1500,
      // Solo proveedores que respeten el esquema JSON
      provider: { require_parameters: true },
      response_format: { type: "json_schema", json_schema: { name: "receipt", strict: true, schema: jsonSchema } },
      messages: [
        {
          role: "user",
          content: [
            media,
            {
              type: "text",
              text:
                "Extrae los datos de este documento tributario chileno (boleta o factura). " +
                "Los montos van en pesos chilenos como número entero (ej. $12.990 → 12990). " +
                "Si un dato no aparece o no se lee con certeza, déjalo en null y agrega el nombre de su clave (merchant, rutProvider, docType, docNumber, date, amount, iva, category) en doubts. " +
                `Categorías disponibles: ${categories.join(", ")}.`,
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  const text: string | undefined = body.choices?.[0]?.message?.content;
  if (!text) return null;
  const parsed = ReceiptSchema.safeParse(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
  if (!parsed.success) throw new Error(`Respuesta de IA con formato inválido: ${parsed.error.message.slice(0, 200)}`);
  const round = (n: number | null) => (n == null ? null : Math.round(n));
  return { ...parsed.data, amount: round(parsed.data.amount), iva: round(parsed.data.iva) };
}
