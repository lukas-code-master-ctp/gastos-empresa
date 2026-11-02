import { SkeletonPage, SkeletonTable, SkeletonTitle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="space-y-8" label="Cargando tesorería">
      <SkeletonTitle />
      <SkeletonTable title cols={4} rows={4} right={[3]} />
      <SkeletonTable title cols={3} rows={3} right={[2]} />
      <SkeletonTable title cols={4} rows={3} right={[2, 3]} />
    </SkeletonPage>
  );
}
