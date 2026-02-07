import { TutorialVideosSection } from "@/components/category/settings/TutorialVideosSection";

interface SettingsTabProps {
  categoryId: string;
}

export function SettingsTab({ categoryId }: SettingsTabProps) {
  return (
    <div className="space-y-4">
      <TutorialVideosSection />
    </div>
  );
}
