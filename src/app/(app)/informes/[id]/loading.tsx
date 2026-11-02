import { Bone, SkeletonCard, SkeletonPage, SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Cargando detalle">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-9 w-64 rounded-xl md:h-10" />
          <Bone className="h-4 w-48" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Bone className="h-6 w-24 rounded-full" />
          <Bone className="h-8 w-36 rounded-xl" />
        </div>
      </div>
      <div className="card flex flex-wrap items-center gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Bone className={`size-8 rounded-full ${i === 1 ? "bg-mandarina-100" : ""}`} />
            <Bone className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonTable cols={5} rows={5} right={[3, 4]} />
        </div>
        <div className="space-y-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    </SkeletonPage>
  );
}
