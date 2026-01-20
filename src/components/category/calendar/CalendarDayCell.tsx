import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { format, isSameMonth, isSameDay } from "date-fns";
import { SessionVignette } from "./SessionVignette";
import { isIndividualSport } from "@/lib/constants/sportTypes";

interface Session {
  id: string;
  session_date: string;
  session_start_time: string | null;
  session_end_time: string | null;
  training_type: string;
  notes: string | null;
}

interface Match {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent: string;
  location: string | null;
  is_home: boolean | null;
}

interface CalendarDayCellProps {
  day: Date;
  currentMonth: Date;
  sessions: Session[];
  matches: Match[];
  sportType: string | undefined;
  isViewer: boolean;
  onDayClick: (day: Date) => void;
  onPreviewSession: (session: Session) => void;
  onEditSession: (session: Session) => void;
  onFeedbackSession: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
}

export function CalendarDayCell({
  day,
  currentMonth,
  sessions,
  matches,
  sportType,
  isViewer,
  onDayClick,
  onPreviewSession,
  onEditSession,
  onFeedbackSession,
  onDeleteSession,
}: CalendarDayCellProps) {
  const dateStr = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { date: day },
  });

  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isToday = isSameDay(day, new Date());

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] border-b border-r p-1.5 transition-colors relative",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isToday && "bg-primary/5",
        isOver && "bg-primary/10 ring-2 ring-primary/30 ring-inset"
      )}
    >
      {/* Day number - clickable */}
      <div
        className={cn(
          "text-sm font-medium mb-1.5 cursor-pointer hover:text-primary transition-colors inline-block",
          isToday && "text-primary font-bold"
        )}
        onClick={() => onDayClick(day)}
      >
        {format(day, "d")}
      </div>

      {/* Events container */}
      <div className="space-y-1 overflow-visible">
        {/* Matches first */}
        {matches.slice(0, 2).map((match) => (
          <div
            key={match.id}
            className="bg-rose-500 text-white text-[11px] px-2 py-1 rounded-lg truncate font-medium cursor-pointer hover:bg-rose-600 transition-colors"
            title={`${match.match_time ? formatTime(match.match_time) + " - " : ""}${match.opponent}`}
            onClick={(e) => {
              e.stopPropagation();
              onDayClick(day);
            }}
          >
            {match.match_time && (
              <>
                <span className="font-bold mr-1">{formatTime(match.match_time)}</span>
                <span className="opacity-70">•</span>
              </>
            )}
            <span className="ml-1 opacity-90">
              {isIndividualSport(sportType || "") ? "Compét." : match.opponent}
            </span>
          </div>
        ))}

        {/* Sessions with vignettes */}
        {sessions.slice(0, 3 - matches.length).map((session) => (
          <SessionVignette
            key={session.id}
            session={session}
            onPreview={() => onPreviewSession(session)}
            onEdit={() => onEditSession(session)}
            onFeedback={() => onFeedbackSession(session)}
            onDelete={() => onDeleteSession(session.id)}
            isViewer={isViewer}
            isDraggable={!isViewer}
          />
        ))}

        {/* More indicator */}
        {(sessions.length + matches.length) > 3 && (
          <div 
            className="text-[10px] text-muted-foreground pl-1 cursor-pointer hover:text-primary"
            onClick={() => onDayClick(day)}
          >
            +{sessions.length + matches.length - 3} autre(s)
          </div>
        )}
      </div>
    </div>
  );
}
