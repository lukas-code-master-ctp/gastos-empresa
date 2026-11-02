// Interruptores de funciones que existen en el código pero aún no se usan.
// El simulador de WhatsApp queda oculto (menú, página y API) hasta que se active con WHATSAPP_SIMULATOR=1.
// El webhook real de Meta (/api/whatsapp/webhook) no depende de esto.
export const whatsappSimulatorEnabled = () => process.env.WHATSAPP_SIMULATOR === "1";
