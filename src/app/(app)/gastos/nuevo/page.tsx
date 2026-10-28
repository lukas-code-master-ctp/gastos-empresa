import Uploader from "./Uploader";
import { createBlankExpense } from "@/app/actions";
import { ocrEnabled } from "@/lib/ocr";

export default function NuevoGasto() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="h1">Subir boleta</h1>
      {!ocrEnabled() && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          La lectura con IA está desactivada (falta ANTHROPIC_API_KEY). La boleta se guardará y completarás los datos a mano.
        </p>
      )}
      <Uploader />
      <form action={createBlankExpense}>
        <button className="text-sm text-emerald-700 hover:underline">o crear un gasto sin boleta</button>
      </form>
    </div>
  );
}
