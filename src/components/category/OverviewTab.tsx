import { KPICards } from "@/components/dashboard/KPICards";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { InjuryAlerts } from "@/components/dashboard/InjuryAlerts";
import { PlayerComparison } from "@/components/dashboard/PlayerComparison";
import { DailySessionView } from "./DailySessionView";
import { Separator } from "@/components/ui/separator";

interface OverviewTabProps {
  categoryId: string;
}

export function OverviewTab({ categoryId }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Daily Session View - Top Priority */}
      <DailySessionView categoryId={categoryId} />
      
      <Separator />
      
      <KPICards categoryIds={[categoryId]} />
      <PerformanceChart categoryIds={[categoryId]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InjuryAlerts categoryIds={[categoryId]} />
        <PlayerComparison categoryIds={[categoryId]} />
      </div>
    </div>
  );
}
