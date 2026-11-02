import { Bone, SkeletonAdminHeader, SkeletonForm, SkeletonPage } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="space-y-10" label="Cargando usuarios">
      <SkeletonAdminHeader />
      <SkeletonForm fields={4} className="lg:grid-cols-4" />
      <section className="space-y-3">
        <Bone className="h-3 w-24" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="card grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_0.8fr_1fr_auto]" style={{ opacity: 1 - i * 0.15 }}>
            {Array.from({ length: 4 }, (_, j) => <Bone key={j} className="h-10 w-full rounded-xl" />)}
            <div className="flex gap-2">
              <Bone className="h-10 flex-1 rounded-xl lg:w-24" />
              <Bone className="h-10 w-10 rounded-xl" />
            </div>
          </div>
        ))}
      </section>
    </SkeletonPage>
  );
}
