import { SkeletonPage, SkeletonTable, SkeletonTitle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Cargando tus informes">
      <SkeletonTitle action />
      <SkeletonTable cols={6} rows={6} right={[3, 4]} />
    </SkeletonPage>
  );
}
