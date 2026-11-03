import { Bone, SkeletonPage, SkeletonTitle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Cargando avisos">
      <SkeletonTitle subtitle />
      <div className="card divide-y divide-slate-100 p-0">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-3 px-5 py-4" style={{ opacity: 1 - i * 0.1 }}>
            <Bone className="mt-1.5 size-2 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className={`h-4 ${i % 2 ? "w-1/2" : "w-2/3"}`} />
              <Bone className="h-3.5 w-5/6" />
              <Bone className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
