import { SkeletonPage, SkeletonTable, SkeletonTitle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Cargando aprobaciones">
      <SkeletonTitle />
      <SkeletonTable cols={5} rows={6} right={[4]} />
    </SkeletonPage>
  );
}
