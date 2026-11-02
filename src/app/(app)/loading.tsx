import { Bone, SkeletonPage } from "@/components/Skeleton";

// Inicio: saludo, accesos y tarjetas de resumen
export default function Loading() {
  return (
    <SkeletonPage className="space-y-10" label="Cargando inicio">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-full space-y-3">
          <Bone className="h-3 w-36" />
          <div className="flex items-end gap-2">
            <Bone className="h-12 w-64 rounded-xl md:h-16 md:w-96" />
            <span className="mb-2 size-3 animate-pulse rounded-full bg-mandarina-500" />
          </div>
          <Bone className="h-4 w-[28rem] max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Bone className="h-10 w-36 rounded-xl bg-emerald-100" />
          <Bone className="h-10 w-32 rounded-xl" />
          <Bone className="h-10 w-48 rounded-xl" />
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card relative overflow-hidden border-transparent bg-emerald-700 sm:col-span-2">
          <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-mandarina-500/35 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <Bone dark className="h-3 w-28" />
            <Bone dark className="size-8 rounded-lg" />
          </div>
          <Bone dark className="relative mt-4 h-11 w-52 rounded-xl md:h-12" />
          <Bone dark className="relative mt-2 h-4 w-40" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between">
              <Bone className="h-3 w-24" />
              <Bone className="size-8 rounded-lg" />
            </div>
            <Bone className="mt-4 h-10 w-16 rounded-xl" />
            <Bone className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
