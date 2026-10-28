import { requireUser } from "@/lib/auth";
import Chat from "./Chat";

export default async function WhatsappPage() {
  const user = await requireUser();
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="h1">WhatsApp (simulador)</h1>
      <p className="text-sm text-slate-500">
        Prueba el canal WhatsApp sin conectar Meta: envía una foto de la boleta y responde lo que el bot pregunte.
        En producción el mismo flujo corre en <code>/api/whatsapp/webhook</code> con WhatsApp Cloud API.
      </p>
      {user.phone ? <Chat /> : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Tu usuario no tiene un teléfono asociado. Entra como Ana o Bruno para probar.</p>}
    </div>
  );
}
