import { CalendarTab } from "@/components/category/CalendarTab";

interface PlanificationTabProps {
  categoryId: string;
}

export function PlanificationTab({ categoryId }: PlanificationTabProps) {
  return <CalendarTab categoryId={categoryId} />;
}
