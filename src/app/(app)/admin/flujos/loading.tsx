import { Bone, SkeletonAdminHeader, SkeletonCard, SkeletonPage } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="space-y-10" label="Cargando configuraciones">
      <SkeletonAdminHeader tabs={2} />
      <section className="space-y-3">
        <Bone className="h-3 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} lines={1} />)}
        </div>
      </section>
      <section className="space-y-4">
        <Bone className="h-3 w-36" />
        {[0, 1].map((i) => (
          <div key={i} className="card space-y-4">
            <Bone className="h-6 w-56" />
            <div className="flex flex-wrap items-center gap-3">
              {Array.from({ length: 3 }, (_, j) => <Bone key={j} className="h-12 w-40 rounded-xl" />)}
            </div>
          </div>
        ))}
      </section>
    </SkeletonPage>
  );
}
