 import { DecisionCenter } from "./DecisionCenter";

interface OverviewTabProps {
  categoryId: string;
  categoryName?: string;
}

export function OverviewTab({ categoryId, categoryName }: OverviewTabProps) {
  return (
     <DecisionCenter categoryId={categoryId} categoryName={categoryName} />
  );
}
