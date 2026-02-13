import { TutorialVideosSection } from "@/components/category/settings/TutorialVideosSection";
import { PdfSettingsSection } from "@/components/category/settings/PdfSettingsSection";

interface SettingsTabProps {
  categoryId: string;
}

export function SettingsTab({ categoryId }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <PdfSettingsSection categoryId={categoryId} />
      <TutorialVideosSection />
    </div>
  );
}
