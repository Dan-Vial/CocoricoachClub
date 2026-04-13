import { useMemo } from "react";
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, differenceInDays, isWithinInterval } from "date-fns";
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

interface AnnualGlobalViewProps {
  year: number;
  categories: PeriodizationCategory[];
  cycles: PeriodizationCycle[];
  sessions: { id: string; session_date: string }[];
  matches: { id: string; match_date: string; opponent: string; is_finalized?: boolean | null; competition?: string | null }[];
}

const CYCLE_TYPE_ICONS: Record<string, string> = {
  PG: "🏗️",
  PS: "🎯",
  PC: "⚡",
  recuperation: "🌿",
};

export function AnnualGlobalView({ year, categories, cycles, sessions, matches }: AnnualGlobalViewProps) {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  // For each category × month, find active cycles
  const grid = useMemo(() => {
    return categories.map(cat => ({
      category: cat,
      months: months.map(month => {
        const ms = startOfMonth(month);
        const me = endOfMonth(month);
        const activeCycles = cycles.filter(c => {
          if (c.periodization_category_id !== cat.id) return false;
          const cs = new Date(c.start_date);
          const ce = new Date(c.end_date);
          return ce >= ms && cs <= me;
        });
        return activeCycles;
      }),
    }));
  }, [categories, cycles, months]);

  // Counts per month
  const sessionCounts = months.map(month => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    return sessions.filter(s => {
      const d = new Date(s.session_date);
      return isWithinInterval(d, { start: ms, end: me });
    }).length;
  });

  const matchCounts = months.map(month => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    return matches.filter(m => {
      const d = new Date(m.match_date);
      return isWithinInterval(d, { start: ms, end: me });
    }).length;
  });

  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: "700px" }}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground p-2 w-36 min-w-[144px]">
                Thématique
              </th>
              {months.map((month, i) => {
                const isCurrentMonth = today.getMonth() === i && today.getFullYear() === year;
                return (
                  <th
                    key={i}
                    className={cn(
                      "text-center text-[11px] font-semibold uppercase tracking-wider p-2 border-l border-border/30",
                      isCurrentMonth ? "text-primary bg-primary/5" : "text-muted-foreground"
                    )}
                  >
                    {format(month, "MMM", { locale: fr })}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {grid.map(({ category, months: monthCycles }) => (
              <tr key={category.id} className="border-b border-border/15 hover:bg-muted/10 transition-colors">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md shadow-sm" style={{ backgroundColor: category.color }} />
                    <span className="text-xs font-bold">{category.name}</span>
                  </div>
                </td>
                {monthCycles.map((activeCycles, mi) => (
                  <td key={mi} className="p-1 border-l border-border/15 align-middle">
                    {activeCycles.length > 0 ? (
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {activeCycles.map(cycle => (
                          <TooltipProvider key={cycle.id} delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white truncate max-w-full shadow-sm cursor-default"
                                  style={{ backgroundColor: cycle.color }}
                                >
                                  {CYCLE_TYPE_ICONS[cycle.cycle_type || ""] || ""} {cycle.name}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                <p className="font-semibold">{cycle.name}</p>
                                <p className="text-muted-foreground">
                                  {format(new Date(cycle.start_date), "dd MMM", { locale: fr })} → {format(new Date(cycle.end_date), "dd MMM", { locale: fr })}
                                </p>
                                {cycle.objective && <p className="mt-0.5">{cycle.objective}</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    ) : (
                      <div className="h-5" />
                    )}
                  </td>
                ))}
              </tr>
            ))}

            {/* Summary rows */}
            <tr className="border-t-2 border-border/40">
              <td className="p-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Séances</span>
              </td>
              {sessionCounts.map((count, i) => (
                <td key={i} className="p-1 border-l border-border/15 text-center">
                  {count > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                      {count}
                    </span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Matchs</span>
              </td>
              {matchCounts.map((count, i) => (
                <td key={i} className="p-1 border-l border-border/15 text-center">
                  {count > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-bold">
                      {count}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
