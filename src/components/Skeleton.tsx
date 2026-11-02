// Piezas de skeleton para los loading.tsx de cada pantalla.
// Imitan la estructura real (encabezado, tarjetas, tablas) con la paleta Ciruela y Mandarina.

export function Bone({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return <div aria-hidden="true" className={`skeleton ${dark ? "skeleton-dark" : ""} ${className}`} />;
}

// Contenedor accesible: anuncia la carga una sola vez a lectores de pantalla
export function SkeletonPage({ children, className = "space-y-6", label = "Cargando" }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

// Título de pantalla (.h1) con botón opcional a la derecha
export function SkeletonTitle({ action = false, eyebrow = false, subtitle = false }: { action?: boolean; eyebrow?: boolean; subtitle?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-full space-y-3">
        {eyebrow && <Bone className="h-3 w-28" />}
        <div className="flex items-end gap-1.5">
          <Bone className="h-9 w-56 rounded-xl md:h-10 md:w-72" />
          <span className="mb-1 size-2.5 animate-pulse rounded-full bg-mandarina-500" />
        </div>
        {subtitle && <Bone className="h-4 w-80 max-w-full" />}
      </div>
      {action && <Bone className="h-10 w-32 rounded-xl" />}
    </div>
  );
}

const WIDTHS = ["w-20", "w-36", "w-24", "w-16", "w-28", "w-14"];

// Tabla dentro de una .card, con encabezado y filas
export function SkeletonTable({ cols = 6, rows = 6, title = false, right = [] as number[] }: { cols?: number; rows?: number; title?: boolean; right?: number[] }) {
  return (
    <div className="card overflow-hidden p-0">
      {title && <div className="px-5 pt-4"><Bone className="h-5 w-64 max-w-full" /></div>}
      <table className={`table table-fixed ${title ? "mt-2" : ""}`}>
        <thead>
          <tr>{Array.from({ length: cols }, (_, c) => <th key={c}><Bone className={`h-3 bg-slate-200/70 ${c === 1 ? "w-24" : "w-14"} ${right.includes(c) ? "ml-auto" : ""}`} /></th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r} style={{ opacity: 1 - r * (0.6 / rows) }}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c}><Bone className={`h-4 max-w-full ${WIDTHS[(c + r) % WIDTHS.length]} ${right.includes(c) ? "ml-auto" : ""} ${c === 1 ? "bg-emerald-50" : ""}`} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Tarjeta genérica con título y líneas
export function SkeletonCard({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`card space-y-3 ${className}`}>
      <Bone className="h-5 w-40" />
      {Array.from({ length: lines }, (_, i) => <Bone key={i} className={`h-4 ${i % 2 ? "w-2/3" : "w-full"}`} />)}
    </div>
  );
}

// Formulario en tarjeta: pares etiqueta + campo
export function SkeletonForm({ fields = 6, cols = 2, className = "" }: { fields?: number; cols?: 1 | 2; className?: string }) {
  return (
    <div className={`card grid gap-4 ${cols === 2 ? "sm:grid-cols-2" : ""} ${className}`}>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Bone className="h-3 w-20" />
          <Bone className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <div className={`flex justify-end ${cols === 2 ? "sm:col-span-2" : ""}`}><Bone className="h-10 w-28 rounded-xl" /></div>
    </div>
  );
}

// Encabezado grande de Administración (Usuarios, Configuraciones) con pestañas opcionales
export function SkeletonAdminHeader({ tabs = 0 }: { tabs?: number }) {
  return (
    <header className="space-y-6">
      <SkeletonTitle eyebrow subtitle={tabs === 0} />
      {tabs > 0 && (
        <div className="flex gap-4 border-b border-slate-200 pb-2.5">
          {Array.from({ length: tabs }, (_, i) => <Bone key={i} className={`h-5 w-44 ${i === 0 ? "bg-mandarina-100" : ""}`} />)}
        </div>
      )}
    </header>
  );
}
