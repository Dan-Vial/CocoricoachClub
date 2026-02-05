import { useDroppable } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

interface SessionBlock {
  id: string;
  training_type: string;
  block_order: number;
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
  onNotifySession?: (session: Session) => void;
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
  onNotifySession,
}: CalendarDayCellProps) {
  const dateStr = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { date: day },
  });

  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isToday = isSameDay(day, new Date());

  // Fetch session blocks for sessions on this day
  const sessionIds = sessions.map(s => s.id);
  const { data: sessionBlocks } = useQuery({
    queryKey: ["session-blocks-calendar", sessionIds],
    queryFn: async () => {
      if (sessionIds.length === 0) return {};
      const { data, error } = await supabase
        .from("training_session_blocks")
        .select("id, training_session_id, training_type, block_order")
        .in("training_session_id", sessionIds)
        .order("block_order");
      if (error) throw error;
      
      // Group blocks by training_session_id
      const blocksMap: Record<string, SessionBlock[]> = {};
      data?.forEach(block => {
        if (!blocksMap[block.training_session_id]) {
          blocksMap[block.training_session_id] = [];
        }
        blocksMap[block.training_session_id].push({
          id: block.id,
          training_type: block.training_type,
          block_order: block.block_order,
        });
      });
      return blocksMap;
    },
    enabled: sessionIds.length > 0,
  });

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] border-b border-r p-1.5 transition-colors relative cursor-pointer",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isToday && "bg-primary/5 ring-2 ring-primary/40 ring-inset",
        isOver && "bg-primary/10 ring-2 ring-primary/30 ring-inset"
      )}
      onClick={() => onDayClick(day)}
    >
      {/* Day number - clickable */}
      <div
        className={cn(
          "text-sm font-medium mb-1.5 cursor-pointer hover:text-primary transition-colors inline-flex items-center justify-center",
          isToday && "text-white bg-primary rounded-full w-7 h-7 font-bold"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onDayClick(day);
        }}
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
          <div key={session.id} onClick={(e) => e.stopPropagation()}>
            <SessionVignette
              session={session}
              blocks={sessionBlocks?.[session.id]}
              onPreview={() => onPreviewSession(session)}
              onEdit={() => onEditSession(session)}
              onFeedback={() => onFeedbackSession(session)}
              onDelete={() => onDeleteSession(session.id)}
              onNotify={onNotifySession ? () => onNotifySession(session) : undefined}
              isViewer={isViewer}
              isDraggable={!isViewer}
            />
          </div>
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
