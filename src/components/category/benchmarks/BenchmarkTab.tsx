import { BenchmarkManager } from "./BenchmarkManager";
import { BenchmarkComparison } from "./BenchmarkComparison";

interface BenchmarkTabProps {
  categoryId: string;
  sportType?: string;
}

export function BenchmarkTab({ categoryId, sportType }: BenchmarkTabProps) {
  return (
    <div className="space-y-6">
      <BenchmarkManager categoryId={categoryId} sportType={sportType} />
      <BenchmarkComparison categoryId={categoryId} sportType={sportType} />
    </div>
  );
}
