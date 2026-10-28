import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";

export const ReceiptSchema = z.object({
  merchant: z.string().nullable().describe("Nombre del comercio o razón social"),
  rutProvider: z.string().nullable().describe("RUT del proveedor, formato 12.345.678-9"),
  docType: z.enum(["BOLETA", "FACTURA", "OTRO"]).nullable(),
  docNumber: z.string().nullable().describe("Número o folio del documento"),
  date: z.string().nullable().describe("Fecha de emisión en formato YYYY-MM-DD"),
  amount: z.number().int().nullable().describe("Monto total en pesos chilenos, IVA incluido"),
  iva: z.number().int().nullable().describe("Monto del IVA en pesos chilenos, si aparece"),
  category: z.string().nullable().describe("Una de las categorías entregadas, la que mejor calce"),
  doubts: z.array(z.string()).describe("Campos ilegibles o dudosos, por nombre de campo"),
});

export type ReceiptData = z.infer<typeof ReceiptSchema>;

export const ocrEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

// Lee una boleta o factura (imagen o PDF) y devuelve los datos estructurados.
export async function readReceipt(file: Buffer, mime: string, categories: string[]): Promise<ReceiptData | null> {
  if (!ocrEnabled()) return null;
  const client = new Anthropic();
  const data = file.toString("base64");
  const media =
    mime === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
      : ({
          type: "image",
          source: { type: "base64", media_type: mime as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data },
        } as const);

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ReceiptSchema) },
    messages: [
      {
        role: "user",
        content: [
          media,
          {
            type: "text",
            text:
              "Extrae los datos de este documento tributario chileno (boleta o factura). " +
              "Si un dato no aparece o no se lee con certeza, déjalo en null y agrega el nombre de su clave (merchant, rutProvider, docType, docNumber, date, amount, iva, category) en doubts. " +
              `Categorías disponibles: ${categories.join(", ")}.`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}
