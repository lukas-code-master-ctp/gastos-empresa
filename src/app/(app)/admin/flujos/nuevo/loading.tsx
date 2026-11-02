import { SkeletonForm, SkeletonPage, SkeletonTitle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Cargando">
      <SkeletonTitle subtitle />
      <SkeletonForm fields={6} className="max-w-3xl" />
    </SkeletonPage>
  );
}
