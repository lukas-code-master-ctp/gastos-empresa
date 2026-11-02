import { SkeletonPage, SkeletonTable, SkeletonTitle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Cargando fondos y caja chica">
      <SkeletonTitle action />
      <SkeletonTable cols={6} rows={5} right={[3, 4]} />
    </SkeletonPage>
  );
}
