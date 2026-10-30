import Link from "next/link";
import { Logo } from "@/components/Brand";

export const metadata = { title: "Política de privacidad · Rindefi" };

// Página pública (sin sesión): Google la exige para publicar el ingreso con Google
export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-12 text-slate-700">
      <Link href="/login" aria-label="Rindefi"><Logo tone="dark" className="text-[36px]" /></Link>
      <h1 className="h1 text-ink">Política de privacidad</h1>
      <p className="text-sm text-slate-500">Última actualización: 30 de octubre de 2026</p>
      <p>Rindefi es una aplicación para que las empresas gestionen la rendición de gastos de sus colaboradores (reembolsos, fondos fijos y caja chica).</p>
      <h2 className="font-display text-xl font-bold text-ink">Qué datos usamos</h2>
      <p>Al ingresar con Google recibimos solo tu nombre, tu correo electrónico y si ese correo está verificado. Los usamos para identificarte y abrir tu sesión; no accedemos a tus correos, archivos ni contactos.</p>
      <p>Además guardamos lo que tú o tu empresa ingresan en Rindefi: gastos, boletas y comprobantes, informes, aprobaciones y, si lo entregas, tu número de WhatsApp y datos bancarios para reembolsos.</p>
      <h2 className="font-display text-xl font-bold text-ink">Para qué los usamos</h2>
      <p>Solo para operar la rendición de gastos de tu empresa: registrar gastos, leer boletas con IA, enviarlos a aprobación, contabilizarlos y pagarlos. No vendemos ni compartimos tus datos con fines publicitarios.</p>
      <h2 className="font-display text-xl font-bold text-ink">Con quién se comparten</h2>
      <p>Con las personas de tu empresa que participan en el flujo de aprobación y tesorería, y con los proveedores que necesitamos para funcionar: alojamiento y almacenamiento (Vercel y Supabase), lectura de boletas con IA (OpenRouter) y, si tu empresa lo configura, su sistema contable (ERP) y WhatsApp.</p>
      <h2 className="font-display text-xl font-bold text-ink">Tus derechos</h2>
      <p>Puedes pedir acceso, corrección o eliminación de tus datos al administrador de tu empresa en Rindefi, o escribiendo a lukas@impulseai.cl.</p>
    </main>
  );
}
