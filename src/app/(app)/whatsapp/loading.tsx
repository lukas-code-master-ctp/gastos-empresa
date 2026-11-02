import { Bone, SkeletonPage, SkeletonTitle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Cargando WhatsApp">
      <SkeletonTitle subtitle />
      <div className="card mx-auto max-w-md space-y-3">
        <Bone className="ml-auto h-10 w-2/3 rounded-2xl bg-green-100" />
        <Bone className="h-16 w-3/4 rounded-2xl" />
        <Bone className="ml-auto h-10 w-1/2 rounded-2xl bg-green-100" />
        <Bone className="h-10 w-2/3 rounded-2xl" />
        <Bone className="mt-6 h-11 w-full rounded-xl" />
      </div>
    </SkeletonPage>
  );
}
