import { db } from "@/lib/db";
import { login } from "@/app/actions";
import { ROLES } from "@/lib/format";
import { Logo } from "@/components/Brand";
import { Icon } from "@/components/Icons";
import { Stagger, StaggerItem } from "@/components/motion";
import { demoEnabled, googleEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "no-registrado": "no está registrado en Rindefi. Pídele al administrador de tu empresa que te agregue.",
  "no-verificado": "Tu cuenta Google no tiene el correo verificado.",
  cancelado: "Cancelaste el ingreso con Google.",
  estado: "La sesión de ingreso expiró. Vuelve a intentarlo.",
  google: "No pudimos validar tu cuenta con Google. Vuelve a intentarlo.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; email?: string }> }) {
  const { error, email } = await searchParams;
  const demo = demoEnabled();
  const users = demo ? await db.user.findMany({ orderBy: { name: "asc" } }) : [];
  const message = error && ERRORS[error] ? (error === "no-registrado" ? `${email ?? "Tu correo"} ${ERRORS[error]}` : ERRORS[error]) : null;
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-slate-900 p-8 text-slate-200 md:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-mandarina-500/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-emerald-500/30 blur-3xl" />
        <Logo className="relative text-[clamp(48px,7vw,88px)]" />
        <div className="relative mt-16 max-w-md space-y-4 lg:mt-0">
          <p className="font-display text-3xl font-bold leading-tight tracking-[-0.03em] text-white md:text-4xl">Rinde tus gastos sin perseguir boletas.</p>
          <p className="text-slate-300">Sube la boleta por la web o por WhatsApp, la IA la lee y el informe recorre solo el flujo de aprobación de tu empresa hasta tesorería.</p>
        </div>
        <div className="relative mt-10 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">Reembolsos · Fondo fijo · Caja chica</div>
      </section>

      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {googleEnabled() && (
            <div className={demo ? "mb-12" : ""}>
              <div className="eyebrow">Bienvenido</div>
              <h1 className="h1 mt-2">Entra a Rindefi</h1>
              <p className="mt-2 text-sm text-slate-500">Usa la cuenta Google de tu trabajo.</p>
              {message && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</p>}
              <a
                href="/api/auth/google"
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3.5 font-semibold transition duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:border-emerald-700 hover:shadow-[0_16px_32px_-20px_rgb(43_16_40/0.5)] active:scale-[0.99]"
              >
                <GoogleG /> Continuar con Google
              </a>
            </div>
          )}
          {demo && <DemoUsers users={users} />}
        </div>
      </section>
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

function DemoUsers({ users }: { users: { id: string; name: string; email: string; role: string }[] }) {
  return (
    <div>
      <div className="eyebrow">Modo demostración</div>
      <h1 className="h1 mt-2">Elige con quién entrar</h1>
      <p className="mt-2 text-sm text-slate-500">Cada usuario tiene un rol distinto en el flujo de aprobación.</p>
      <form action={login} className="mt-8">
        <Stagger className="space-y-2" delay={0.25}>
          {users.map((u) => (
            <StaggerItem key={u.id}>
              <button
                name="userId"
                value={u.id}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:border-emerald-700 hover:shadow-[0_16px_32px_-20px_rgb(43_16_40/0.5)] active:scale-[0.99]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 font-display text-sm font-bold text-emerald-700 transition-colors group-hover:bg-emerald-700 group-hover:text-white">
                  {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{u.name}</span>
                  <span className="block truncate text-xs text-slate-500">{u.email}</span>
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{ROLES[u.role]}</span>
                <Icon name="arrow" className="size-4 -translate-x-1 text-mandarina-500 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      </form>
    </div>
  );
}
