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
  /** Optional custom period start (defaults to Jan 1 of `year`). */
  periodStart?: Date;
  /** Optional custom period end (defaults to Dec 31 of `year`). */
  periodEnd?: Date;
  categories: PeriodizationCategory[];
  cycles: PeriodizationCycle[];
  sessions: { id: string; session_date: string }[];
}

// Shared green → yellow → red gradient (0..10 scale)
// Mirrors the PDF "Moyenne de tous les cycles" gradient for visual consistency.
function intensityRgb(value0to10: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, value0to10 / 10));
  // 0 → green (76,175,80), 0.5 → amber (255,193,7), 1 → red (229,57,53)
  if (t <= 0.5) {
    const u = t / 0.5;
    return [
      Math.round(76 + (255 - 76) * u),
      Math.round(175 + (193 - 175) * u),
      Math.round(80 + (7 - 80) * u),
    ];
  }
  const u = (t - 0.5) / 0.5;
  return [
    Math.round(255 + (229 - 255) * u),
    Math.round(193 + (57 - 193) * u),
    Math.round(7 + (53 - 7) * u),
  ];
}

function getHeatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "transparent";
  const ratio = Math.min(value / max, 1);
  const [r, g, b] = intensityRgb(ratio * 10);
  // Slight transparency so the underlying grid stays subtle
  return `rgba(${r}, ${g}, ${b}, ${0.55 + ratio * 0.4})`;
}

export function AnnualLoadHeatmap({ year, periodStart, periodEnd, categories, cycles, sessions }: AnnualLoadHeatmapProps) {
  const yearStart = periodStart ?? startOfYear(new Date(year, 0, 1));
  const yearEnd = periodEnd ?? endOfYear(new Date(year, 0, 1));

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

        {/* Legend — full 0 to 10 intensity scale */}
        <div className="mt-4 px-3 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
              Échelle d'intensité
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              Charge prescrite par cycle (0 à 10)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-3 text-right">0</span>
            <div className="flex-1 flex h-4 rounded-md overflow-hidden border border-border/50">
              {Array.from({ length: 11 }).map((_, i) => {
                const [r, g, b] = intensityRgb(i);
                return (
                  <div
                    key={i}
                    className="flex-1 flex items-center justify-center text-[9px] font-bold"
                    style={{
                      backgroundColor: `rgb(${r}, ${g}, ${b})`,
                      color: i >= 6 ? "#fff" : "#1e2333",
                    }}
                    title={`Intensité ${i}/10`}
                  >
                    {i}
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] text-muted-foreground w-5">10</span>
          </div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground/80 px-4">
            <span>Faible · récupération</span>
            <span>Modérée</span>
            <span>Élevée · maximale</span>
          </div>
        </div>
      </div>
    </div>
  );
}
