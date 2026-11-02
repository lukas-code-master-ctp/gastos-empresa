import { SkeletonPage, SkeletonTable, SkeletonTitle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Cargando tus gastos">
      <SkeletonTitle action subtitle />
      <SkeletonTable cols={6} rows={8} right={[4]} />
    </SkeletonPage>
  );
}
