import { Eye } from "lucide-react";
import { usePublicAccess } from "@/contexts/PublicAccessContext";

export function ViewerModeBanner() {
  const { isPublicAccess, categoryName, clubName } = usePublicAccess();

  if (!isPublicAccess) return null;

  return (
    <div className="bg-amber-500/90 text-amber-950 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
      <Eye className="h-4 w-4" />
      <span>
        Mode consultation uniquement
        {categoryName && ` — ${categoryName}`}
        {clubName && !categoryName && ` — ${clubName}`}
      </span>
    </div>
  );
}
