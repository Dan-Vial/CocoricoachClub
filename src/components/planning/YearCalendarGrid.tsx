import { useMemo, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, getDay, eachDayOfInterval, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PeriodizationCycle {
  id: string;
  periodization_category_id: string;
  name: string;
  color: string;
  start_date: string;
  end_date: string;
  objective: string | null;
}

interface YearCalendarGridProps {
  year: number;
  cycles: PeriodizationCycle[];
  sessions: { id: string; session_date: string }[];
  matches: { id: string; match_date: string; opponent: string; is_finalized?: boolean | null; competition?: string | null }[];
  onDateRangeSelect?: (startDate: Date, endDate: Date) => void;
  activeCategoryColor?: string;
}

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export function YearCalendarGrid({ year, cycles, sessions, matches, onDateRangeSelect, activeCategoryColor }: YearCalendarGridProps) {
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  }, [year]);

  const sessionDates = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => set.add(s.session_date));
    return set;
  }, [sessions]);

  const matchDates = useMemo(() => {
    const map = new Map<string, { opponent: string; is_finalized?: boolean | null; competition?: string | null }>();
    matches.forEach(m => map.set(m.match_date, { opponent: m.opponent, is_finalized: m.is_finalized, competition: m.competition }));
    return map;
  }, [matches]);

  const getCyclesForDate = (dateStr: string) => {
    return cycles.filter(c => dateStr >= c.start_date && dateStr <= c.end_date);
  };

  const isInDragRange = useCallback((dateStr: string) => {
    if (!dragStart || !dragEnd) return false;
    const min = dragStart < dragEnd ? dragStart : dragEnd;
    const max = dragStart < dragEnd ? dragEnd : dragStart;
    return dateStr >= min && dateStr <= max;
  }, [dragStart, dragEnd]);

  const handleMouseDown = (dateStr: string) => {
    if (!onDateRangeSelect) return;
    setDragStart(dateStr);
    setDragEnd(dateStr);
    setIsDragging(true);
  };

  const handleMouseEnter = (dateStr: string) => {
    if (!isDragging) return;
    setDragEnd(dateStr);
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd || !onDateRangeSelect) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }
    const min = dragStart < dragEnd ? dragStart : dragEnd;
    const max = dragStart < dragEnd ? dragEnd : dragStart;
    onDateRangeSelect(new Date(min), new Date(max));
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDragging) {
          setIsDragging(false);
          setDragStart(null);
          setDragEnd(null);
        }
      }}
    >
      {months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const firstDayOffset = (getDay(monthStart) + 6) % 7;

        return (
          <div key={month.getTime()} className="border border-border rounded-lg p-2 bg-card">
            <h4 className="text-xs font-bold text-center mb-1.5 uppercase tracking-wider text-muted-foreground">
              {format(month, "MMMM", { locale: fr })}
            </h4>
            <div className="grid grid-cols-7 gap-px mb-0.5">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={i} className="text-[9px] text-center text-muted-foreground/60 font-medium">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const activeCycles = getCyclesForDate(dateStr);
                const hasSession = sessionDates.has(dateStr);
                const matchInfo = matchDates.get(dateStr);
                const today = isToday(day);
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                const cycleColor = activeCycles.length > 0 ? activeCycles[0].color : null;
                const inRange = isInDragRange(dateStr);

                const dayContent = (
                  <div
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-sm text-[10px] relative transition-colors cursor-pointer",
                      today && "ring-2 ring-destructive ring-offset-1 ring-offset-background font-bold",
                      isWeekend && !cycleColor && !inRange && "text-muted-foreground/50",
                      !cycleColor && !today && !inRange && "hover:bg-muted/50",
                      inRange && "font-semibold",
                    )}
                    style={{
                      ...(!inRange && cycleColor ? {
                        backgroundColor: `${cycleColor}20`,
                        color: cycleColor,
                      } : {}),
                      ...(inRange ? {
                        backgroundColor: `${activeCategoryColor || 'hsl(var(--primary))'}30`,
                        color: activeCategoryColor || 'hsl(var(--primary))',
                      } : {}),
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleMouseDown(dateStr);
                    }}
                    onMouseEnter={() => handleMouseEnter(dateStr)}
                  >
                    <span className={cn("leading-none", today && "text-destructive")}>{day.getDate()}</span>
                    {(hasSession || matchInfo) && (
                      <div className="flex gap-px mt-px">
                        {hasSession && <div className="w-1 h-1 rounded-full bg-primary" />}
                        {matchInfo && <div className="w-1 h-1 rounded-full bg-destructive" />}
                      </div>
                    )}
                    {activeCycles.length > 1 && (
                      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-px">
                        {activeCycles.slice(1, 3).map((c) => (
                          <div key={c.id} className="w-full h-[2px]" style={{ backgroundColor: c.color }} />
                        ))}
                      </div>
                    )}
                  </div>
                );

                if (hasSession || matchInfo || activeCycles.length > 0) {
                  return (
                    <TooltipProvider key={dateStr} delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>{dayContent}</TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[200px]">
                          <p className="font-semibold">{format(day, "EEEE d MMMM", { locale: fr })}</p>
                          {activeCycles.map(c => (
                            <div key={c.id} className="flex items-center gap-1 mt-0.5">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                              <span>{c.name}</span>
                            </div>
                          ))}
                          {hasSession && <p className="text-muted-foreground mt-0.5">📋 Séance programmée</p>}
                          {matchInfo && (
                            <p className="text-muted-foreground mt-0.5">
                              {matchInfo.is_finalized ? "✅" : "⚔️"} vs {matchInfo.opponent}
                              {matchInfo.competition && <span className="opacity-70"> · {matchInfo.competition}</span>}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return <div key={dateStr}>{dayContent}</div>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
