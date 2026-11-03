import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { markAllNotificationsRead } from "@/app/actions";
import { Icon } from "@/components/Icons";

const cuando = (d: Date) => new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(d);

export default async function AvisosPage() {
  const user = await requireUser();
  const avisos = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = avisos.filter((a) => !a.readAt).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Avisos</h1>
          <p className="mt-2 text-sm text-slate-500">Cuando un informe o fondo tuyo avanza, o te toca aprobar, te avisamos aquí y por correo.</p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <button className="btn-secondary">Marcar todo como leído</button>
          </form>
        )}
      </div>
      <div className="card divide-y divide-slate-100 p-0">
        {avisos.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-500">
            <Icon name="bell" className="size-8 text-slate-300" />
            Todavía no tienes avisos.
          </div>
        )}
        {avisos.map((a) => (
          <a key={a.id} href={`/avisos/${a.id}`} className={`flex gap-3 px-5 py-4 transition-colors hover:bg-slate-50 ${a.readAt ? "" : "bg-mandarina-50/60"}`}>
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${a.readAt ? "bg-transparent" : "bg-mandarina-500"}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className={`text-sm ${a.readAt ? "text-slate-700" : "font-semibold text-ink"}`}>
                {a.title}
                {!a.readAt && <span className="sr-only"> (sin leer)</span>}
              </div>
              {a.body && <div className="mt-0.5 text-sm text-slate-500">{a.body}</div>}
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-400">{cuando(a.createdAt)}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
