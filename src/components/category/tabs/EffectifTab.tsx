import { PlayersTab } from "@/components/category/PlayersTab";

interface EffectifTabProps {
  categoryId: string;
}

export function EffectifTab({ categoryId }: EffectifTabProps) {
  return <PlayersTab categoryId={categoryId} />;
}
