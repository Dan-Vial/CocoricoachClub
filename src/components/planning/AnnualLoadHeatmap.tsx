import { useMemo } from "react";
import { format, startOfYear, endOfYear, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PeriodizationCategory {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface PeriodizationCycle {
  id: string;
  periodization_category_id: string;
  name: string;
  color: string;
  start_date: string;
  end_date: string;
  objective: string | null;
  notes: string | null;
  cycle_type: string | null;
  intensity: number | null;
  volume: number | null;
}

interface AnnualLoadHeatmapProps {
  year: number;
  categories: PeriodizationCategory[];
  cycles: PeriodizationCycle[];
  sessions: { id: string; session_date: string }[];
}

function getHeatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "transparent";
  const ratio = Math.min(value / max, 1);
  // Green → Yellow → Orange → Red
  if (ratio <= 0.25) return `rgba(34, 197, 94, ${0.15 + ratio * 2})`;
  if (ratio <= 0.5) return `rgba(234, 179, 8, ${0.2 + ratio})`;
  if (ratio <= 0.75) return `rgba(249, 115, 22, ${0.3 + ratio * 0.6})`;
  return `rgba(239, 68, 68, ${0.4 + ratio * 0.5})`;
}

export function AnnualLoadHeatmap({ year, categories, cycles, sessions }: AnnualLoadHeatmapProps) {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  const weeks = useMemo(() => {
    return eachWeekOfInterval({ start: yearStart, end: yearEnd }, { weekStartsOn: 1 });
  }, [year]);

  // For each category × week, compute combined intensity+volume score
  const heatData = useMemo(() => {
    const data: Map<string, number[]> = new Map();
    let globalMax = 0;

    categories.forEach(cat => {
      const weekScores = weeks.map((weekStart) => {
        const ws = startOfWeek(weekStart, { weekStartsOn: 1 });
        const we = endOfWeek(weekStart, { weekStartsOn: 1 });

        const activeCycles = cycles.filter(c => {
          if (c.periodization_category_id !== cat.id) return false;
          const cs = new Date(c.start_date);
          const ce = new Date(c.end_date);
          return ce >= ws && cs <= we;
        });

        const score = activeCycles.reduce((sum, c) => {
          return sum + ((c.intensity || 0) + (c.volume || 0)) / 2;
        }, 0);

        if (score > globalMax) globalMax = score;
        return score;
      });

      data.set(cat.id, weekScores);
    });

    // Also compute global row (all categories combined)
    const globalScores = weeks.map((_, wi) => {
      let total = 0;
      data.forEach(scores => { total += scores[wi]; });
      return total;
    });
    let gMax = Math.max(...globalScores, 1);

    return { data, globalMax: Math.max(globalMax, 1), globalScores, globalScoresMax: gMax };
  }, [categories, cycles, weeks]);

  // Session count per week
  const sessionsPerWeek = useMemo(() => {
    return weeks.map(weekStart => {
      const ws = startOfWeek(weekStart, { weekStartsOn: 1 });
      const we = endOfWeek(weekStart, { weekStartsOn: 1 });
      return sessions.filter(s => {
        const d = new Date(s.session_date);
        return d >= ws && d <= we;
      }).length;
    });
  }, [weeks, sessions]);

  const maxSessions = Math.max(...sessionsPerWeek, 1);

  // Month boundaries for headers
  const monthHeaders = useMemo(() => {
    const headers: { label: string; span: number }[] = [];
    let currentMonth = -1;
    weeks.forEach(w => {
      const mid = new Date(w.getTime() + 3 * 24 * 60 * 60 * 1000); // Wednesday
      const m = mid.getMonth();
      if (m !== currentMonth) {
        headers.push({ label: format(mid, "MMM", { locale: fr }), span: 1 });
        currentMonth = m;
      } else {
        headers[headers.length - 1].span++;
      }
    });
    return headers;
  }, [weeks]);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: "900px" }}>
        {/* Header - months */}
        <div className="flex mb-1">
          <div className="w-36 min-w-[144px] shrink-0" />
          <div className="flex-1 flex">
            {monthHeaders.map((mh, i) => (
              <div
                key={i}
                className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1"
                style={{ width: `${(mh.span / weeks.length) * 100}%` }}
              >
                {mh.label}
              </div>
            ))}
          </div>
        </div>

        {/* Week numbers */}
        <div className="flex mb-0.5">
          <div className="w-36 min-w-[144px] shrink-0 flex items-center px-3">
            <span className="text-[9px] text-muted-foreground/60">Semaine</span>
          </div>
          <div className="flex-1 flex">
            {weeks.map((w, i) => (
              <div
                key={i}
                className="text-center text-[8px] text-muted-foreground/40"
                style={{ width: `${100 / weeks.length}%` }}
              >
                {i % 2 === 0 ? format(w, "w") : ""}
              </div>
            ))}
          </div>
        </div>

        {/* Category rows */}
        {categories.map(cat => {
          const scores = heatData.data.get(cat.id) || [];
          return (
            <div key={cat.id} className="flex items-stretch border-b border-border/10">
              <div className="w-36 min-w-[144px] shrink-0 flex items-center px-3 py-1.5 gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cat.color }} />
                <span className="text-[11px] font-semibold truncate">{cat.name}</span>
              </div>
              <div className="flex-1 flex">
                {scores.map((score, wi) => {
                  const ws = startOfWeek(weeks[wi], { weekStartsOn: 1 });
                  const we = endOfWeek(weeks[wi], { weekStartsOn: 1 });
                  return (
                    <TooltipProvider key={wi} delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="border-l border-border/5 first:border-l-0 min-h-[24px] transition-colors hover:brightness-90"
                            style={{
                              width: `${100 / weeks.length}%`,
                              backgroundColor: getHeatColor(score, heatData.globalMax),
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          <p className="font-semibold">{cat.name} — S{format(ws, "w")}</p>
                          <p>{format(ws, "dd MMM", { locale: fr })} → {format(we, "dd MMM", { locale: fr })}</p>
                          <p>Charge: {score.toFixed(1)}/5</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Global load row */}
        <div className="flex items-stretch border-b border-border/30 bg-muted/10">
          <div className="w-36 min-w-[144px] shrink-0 flex items-center px-3 py-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total</span>
          </div>
          <div className="flex-1 flex">
            {heatData.globalScores.map((score, wi) => (
              <div
                key={wi}
                className="border-l border-border/5 first:border-l-0 min-h-[28px] transition-colors hover:brightness-90"
                style={{
                  width: `${100 / weeks.length}%`,
                  backgroundColor: getHeatColor(score, heatData.globalScoresMax),
                }}
              />
            ))}
          </div>
        </div>

        {/* Session count row */}
        <div className="flex items-stretch mt-1">
          <div className="w-36 min-w-[144px] shrink-0 flex items-center px-3 py-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Séances</span>
          </div>
          <div className="flex-1 flex">
            {sessionsPerWeek.map((count, wi) => (
              <div
                key={wi}
                className="flex items-end justify-center border-l border-border/5 first:border-l-0"
                style={{ width: `${100 / weeks.length}%`, height: "32px" }}
              >
                {count > 0 && (
                  <div
                    className="w-full mx-px rounded-t-sm bg-primary/60"
                    style={{ height: `${(count / maxSessions) * 100}%` }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 px-3">
          <span className="text-[10px] text-muted-foreground font-medium">Charge :</span>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground">Faible</span>
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((r, i) => (
              <div
                key={i}
                className="w-4 h-3 rounded-sm"
                style={{ backgroundColor: getHeatColor(r * 5, 5) }}
              />
            ))}
            <span className="text-[9px] text-muted-foreground">Max</span>
          </div>
        </div>
      </div>
    </div>
  );
}
