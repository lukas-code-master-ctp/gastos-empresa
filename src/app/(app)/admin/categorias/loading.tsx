import { Bone, SkeletonAdminHeader, SkeletonPage } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="space-y-10" label="Cargando categorías y proyectos">
      <SkeletonAdminHeader tabs={2} />
      {[0, 1].map((s) => (
        <section key={s} className="space-y-4">
          <Bone className="h-7 w-48 rounded-xl" />
          <div className="card grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
            <Bone className="h-10 w-full rounded-xl" />
            <Bone className="h-10 w-full rounded-xl" />
            <Bone className="h-10 w-28 rounded-xl" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => <Bone key={i} className="h-14 w-full rounded-2xl bg-white" />)}
          </div>
        </section>
      ))}
    </SkeletonPage>
  );
}
