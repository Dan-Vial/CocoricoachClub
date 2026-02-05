import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { isIndividualSport } from "@/lib/constants/sportTypes";

interface Match {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent: string;
  location: string | null;
  is_home: boolean | null;
}

interface MatchVignetteProps {
  match: Match;
  sportType: string | undefined;
  isViewer: boolean;
  onClick: () => void;
  onNotify?: () => void;
}

export function MatchVignette({
  match,
  sportType,
  isViewer,
  onClick,
  onNotify,
}: MatchVignetteProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  const handleNotifyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onNotify?.();
  };

  return (
    <div
      className={cn(
        "relative group",
        isHovered && "z-50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div
        className="bg-rose-500 text-white text-[11px] px-2 py-1.5 rounded-lg truncate font-medium cursor-pointer hover:bg-rose-600 transition-colors relative overflow-hidden"
        title={`${match.match_time ? formatTime(match.match_time) + " - " : ""}${match.opponent}`}
      >
        {/* Match content - hidden when hovered to show notify button */}
        <div className={cn(
          "flex items-center gap-1 transition-opacity",
          isHovered && !isViewer && onNotify && "opacity-0"
        )}>
          {match.match_time && (
            <>
              <span className="font-bold mr-1">{formatTime(match.match_time)}</span>
              <span className="opacity-70">•</span>
            </>
          )}
          <span className="ml-1 opacity-90 truncate">
            {isIndividualSport(sportType || "") ? "Compét." : match.opponent}
          </span>
        </div>

        {/* Hover Actions Overlay - Notify button */}
        {isHovered && !isViewer && onNotify && (
          <div className="absolute inset-0 flex items-center justify-center bg-rose-600 rounded-lg z-[100] animate-fade-in">
            <button
              onClick={handleNotifyClick}
              className="p-1.5 rounded-md hover:bg-rose-500 transition-colors group/btn flex items-center gap-1.5"
              title="Notifier les athlètes convoqués"
            >
              <Bell className="h-4 w-4" />
              <span className="text-xs font-medium">Convoquer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
