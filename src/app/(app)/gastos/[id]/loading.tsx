import { Bone, SkeletonForm, SkeletonPage, SkeletonTitle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Cargando gasto">
      <SkeletonTitle action />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3">
          <Bone className="h-5 w-32" />
          <Bone className="aspect-[3/4] w-full rounded-xl" />
        </div>
        <SkeletonForm fields={8} />
      </div>
    </SkeletonPage>
  );
}
