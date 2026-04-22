import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, startOfYear, endOfYear, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Flame, Activity, Trophy } from "lucide-react";

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

interface AnnualTimelineViewProps {
  year: number;
  categories: PeriodizationCategory[];
  cycles: PeriodizationCycle[];
  sessions: { id: string; session_date: string }[];
  matches: { id: string; match_date: string; opponent: string; is_finalized?: boolean | null; competition?: string | null }[];
  isViewer: boolean;
  onAddCycle: (categoryId: string) => void;
  onEditCycle: (cycle: PeriodizationCycle) => void;
  zoomLevel: "year" | "semester";
}

const CYCLE_TYPE_META: Record<string, { label: string; shortLabel: string; bgClass: string; icon: string }> = {
  PG: { label: "Préparation Générale", shortLabel: "PG", bgClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300", icon: "🏗️" },
  PS: { label: "Préparation Spécifique", shortLabel: "PS", bgClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: "🎯" },
  PC: { label: "Préparation Compétition", shortLabel: "PC", bgClass: "bg-red-500/15 text-red-700 dark:text-red-300", icon: "⚡" },
  recuperation: { label: "Récupération", shortLabel: "REC", bgClass: "bg-green-500/15 text-green-700 dark:text-green-300", icon: "🌿" },
};

function getIntensityColor(value: number) {
  if (value <= 2) return "#22c55e";
  if (value <= 4) return "#facc15";
  if (value <= 6) return "#f59e0b";
  if (value <= 8) return "#ef4444";
  return "#dc2626";
}

function IntensityDots({ value, max = 10 }: { value: number; max?: number }) {
  const displayDots = 5;
  const filled = Math.round((value / max) * displayDots);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: displayDots }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full transition-colors"
          style={{
            backgroundColor: i < filled ? getIntensityColor(value) : "hsl(var(--muted))",
          }}
        />
      ))}
    </div>
  );
}

export function AnnualTimelineView({
  year,
  categories,
  cycles,
  sessions,
  matches,
  isViewer,
  onAddCycle,
  onEditCycle,
  zoomLevel,
}: AnnualTimelineViewProps) {
  const navigate = useNavigate();
  const params = useParams();
  const routeCategoryId = params.id || params.categoryId;
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const totalDays = differenceInDays(yearEnd, yearStart) + 1;

  // No longer needed: macrocycle phases are shown inline per category row

  const getPosition = (startDate: string, endDate: string) => {
    const cs = new Date(startDate);
    const ce = new Date(endDate);
    const effectiveStart = cs < yearStart ? yearStart : cs;
    const effectiveEnd = ce > yearEnd ? yearEnd : ce;
    const startOffset = differenceInDays(effectiveStart, yearStart);
    const duration = differenceInDays(effectiveEnd, effectiveStart) + 1;
    const widthPct = (duration / totalDays) * 100;
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${Math.max(widthPct, 1.2)}%`,
      isNarrow: widthPct < 3,
      duration,
    };
  };

  const sessionsPerMonth = months.map(month => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    return sessions.filter(s => {
      const d = new Date(s.session_date);
      return isWithinInterval(d, { start: ms, end: me });
    }).length;
  });

  const matchesPerMonth = months.map(month => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    return matches.filter(m => {
      const d = new Date(m.match_date);
      return isWithinInterval(d, { start: ms, end: me });
    }).length;
  });

  // Today marker
  const today = new Date();
  const todayInYear = today.getFullYear() === year;
  const todayPct = todayInYear ? (differenceInDays(today, yearStart) / totalDays) * 100 : null;

  // Week markers for zoom
  const weeks = useMemo(() => {
    return eachWeekOfInterval({ start: yearStart, end: yearEnd }, { weekStartsOn: 1 });
  }, [year]);

  const labelWidth = "140px";

  return (
    <div className="relative overflow-x-auto">
      <div style={{ minWidth: zoomLevel === "year" ? "900px" : "1400px" }}>
        {/* MONTH HEADER */}
        <div className="flex border-b-2 border-border/60">
          <div style={{ width: labelWidth, minWidth: labelWidth }} className="shrink-0" />
          <div className="flex-1 flex">
            {months.map((month, i) => {
              const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
              const widthPct = (monthDays / totalDays) * 100;
              const isCurrentMonth = today.getMonth() === month.getMonth() && today.getFullYear() === year;
              return (
                <div
                  key={i}
                  className={cn(
                    "text-center py-2 border-l border-border/40 first:border-l-0 transition-colors",
                    isCurrentMonth && "bg-primary/5"
                  )}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider",
                    isCurrentMonth ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(month, "MMM", { locale: fr })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVITY ROW */}
        <div className="flex border-b border-border/30 bg-muted/20">
          <div style={{ width: labelWidth, minWidth: labelWidth }} className="shrink-0 flex items-center px-3">
            <Activity className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
            <span className="text-[11px] font-medium text-muted-foreground">Activité</span>
          </div>
          <div className="flex-1 flex">
            {months.map((month, i) => {
              const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
              const widthPct = (monthDays / totalDays) * 100;
              return (
                <div
                  key={i}
                  className="flex items-center justify-center gap-1.5 py-2 border-l border-border/20 first:border-l-0"
                  style={{ width: `${widthPct}%` }}
                >
                  {sessionsPerMonth[i] > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
                      {sessionsPerMonth[i]}<span className="opacity-60">S</span>
                    </span>
                  )}
                  {matchesPerMonth[i] > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-semibold">
                      {matchesPerMonth[i]}<span className="opacity-60">M</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CATEGORY ROWS */}
        {categories.map((cat) => {
          const catCycles = cycles.filter(c => c.periodization_category_id === cat.id);
          const isCompetitionRow = /comp[ée]tition/i.test(cat.name);
          // Sort by duration desc so wider blocks render first (behind)
          const sortedCycles = [...catCycles].sort((a, b) => {
            const da = differenceInDays(new Date(a.end_date), new Date(a.start_date));
            const db = differenceInDays(new Date(b.end_date), new Date(b.start_date));
            return db - da;
          });

          return (
            <div
              key={cat.id}
              className="flex border-b border-border/20 group/row hover:bg-muted/10 transition-colors"
            >
              {/* Row label */}
              <div
                style={{ width: labelWidth, minWidth: labelWidth }}
                className="shrink-0 flex items-center px-3 py-3 gap-2.5"
              >
                <div
                  className="w-3 h-3 rounded-md shrink-0 shadow-sm"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs font-bold truncate">{cat.name}</span>
                {!isViewer && (
                  <button
                    className="opacity-0 group-hover/row:opacity-100 transition-opacity ml-auto p-0.5 rounded hover:bg-muted"
                    onClick={() => onAddCycle(cat.id)}
                    title="Ajouter un cycle"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                  </button>
                )}
              </div>

              {/* Timeline area */}
              <div className="flex-1 relative" style={{ minHeight: "68px" }}>
                {/* Month grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {months.map((month, i) => {
                    const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                    const widthPct = (monthDays / totalDays) * 100;
                    return (
                      <div
                        key={i}
                        className="border-l border-border/15 first:border-l-0 h-full"
                        style={{ width: `${widthPct}%` }}
                      />
                    );
                  })}
                </div>

                {/* Competition markers (only in Compétitions row) */}
                {isCompetitionRow && matches.map((m) => {
                  const md = new Date(m.match_date);
                  if (md < yearStart || md > yearEnd) return null;
                  const offsetPct = (differenceInDays(md, yearStart) / totalDays) * 100;
                  return (
                    <TooltipProvider key={m.id} delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="absolute -translate-x-1/2 flex flex-col items-center justify-center rounded-md shadow-sm hover:shadow-md hover:scale-110 transition-all cursor-pointer"
                            style={{
                              left: `${offsetPct}%`,
                              top: "50%",
                              transform: `translate(-50%, -50%)`,
                              backgroundColor: cat.color,
                              width: "22px",
                              height: "22px",
                              zIndex: 10,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (routeCategoryId) {
                                navigate(`/categories/${routeCategoryId}?tab=competition`);
                              }
                            }}
                          >
                            <Trophy className="h-3 w-3 text-white" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs p-2">
                          <div className="space-y-1">
                            <p className="font-bold text-xs flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              {m.opponent || "Compétition"}
                            </p>
                            {m.competition && (
                              <p className="text-[11px] text-muted-foreground">{m.competition}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              {format(md, "EEEE dd MMMM yyyy", { locale: fr })}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}

                {/* Cycle blocks with macrocycle badge */}
                {sortedCycles.map((cycle) => {
                  const pos = getPosition(cycle.start_date, cycle.end_date);
                  const meta = cycle.cycle_type ? CYCLE_TYPE_META[cycle.cycle_type] : null;

                  return (
                    <TooltipProvider key={cycle.id} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="absolute flex flex-col items-center"
                            style={{
                              left: pos.left,
                              width: pos.width,
                              top: "2px",
                              bottom: "6px",
                              zIndex: pos.isNarrow ? 5 : 1,
                            }}
                            onClick={() => !isViewer && onEditCycle(cycle)}
                          >
                            {/* Macrocycle type badge on top */}
                            {meta && (
                              <div
                                className={cn(
                                  "w-full flex items-center justify-center gap-0.5 rounded-t-md text-[9px] font-bold uppercase tracking-wide shrink-0",
                                  meta.bgClass
                                )}
                                style={{ height: "16px", borderBottom: `2px solid ${cycle.color}` }}
                              >
                                <span>{meta.icon}</span>
                                {!pos.isNarrow && <span>{meta.shortLabel}</span>}
                              </div>
                            )}
                            {/* Cycle block */}
                            <div
                              className={cn(
                                "w-full flex-1 flex flex-col items-center justify-center overflow-hidden",
                                "shadow-sm hover:shadow-lg transition-all cursor-pointer",
                                "border border-white/20",
                                meta ? "rounded-b-lg" : "rounded-lg",
                                pos.isNarrow ? "px-0.5" : "px-2.5"
                              )}
                              style={{ backgroundColor: cycle.color }}
                            >
                            {pos.isNarrow ? (
                              <span className="text-white text-[9px] font-bold">{pos.duration}j</span>
                            ) : (
                              <>
                                <div className="flex items-center gap-1 w-full justify-center">
                                  <span className="truncate text-[11px] font-bold text-white tracking-wide">
                                    {cycle.name}
                                  </span>
                                </div>
                                {cycle.objective && (
                                  <span className="truncate text-[9px] text-white/70 w-full text-center font-medium">
                                    {cycle.objective}
                                  </span>
                                )}
                                {(cycle.intensity || cycle.volume) && !pos.isNarrow && (
                                  <div className="flex gap-2 mt-0.5">
                                    {cycle.intensity ? <IntensityDots value={cycle.intensity} /> : null}
                                  </div>
                                )}
                              </>
                            )}
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs p-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-md" style={{ backgroundColor: cycle.color }} />
                              <p className="font-bold text-sm">{cycle.name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(cycle.start_date), "dd MMM yyyy", { locale: fr })} → {format(new Date(cycle.end_date), "dd MMM yyyy", { locale: fr })}
                              <span className="ml-1 opacity-60">({pos.duration}j)</span>
                            </p>
                            {meta && (
                              <Badge variant="outline" className="text-[10px]">
                                {meta.icon} {meta.label}
                              </Badge>
                            )}
                            {cycle.objective && (
                              <div className="flex items-start gap-1.5 text-xs">
                                <Target className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                                <span>{cycle.objective}</span>
                              </div>
                            )}
                            {(cycle.intensity != null && cycle.intensity > 0) && (
                              <div className="flex items-center gap-2 text-xs">
                                <Flame className="h-3 w-3 text-orange-500" />
                                <span>Intensité</span>
                                <IntensityDots value={cycle.intensity} />
                                <span className="text-muted-foreground">{cycle.intensity}/5</span>
                              </div>
                            )}
                            {(cycle.volume != null && cycle.volume > 0) && (
                              <div className="flex items-center gap-2 text-xs">
                                <Activity className="h-3 w-3 text-blue-500" />
                                <span>Volume</span>
                                <IntensityDots value={cycle.volume} />
                                <span className="text-muted-foreground">{cycle.volume}/5</span>
                              </div>
                            )}
                            {cycle.notes && (
                              <p className="text-xs text-muted-foreground italic border-t pt-1">{cycle.notes}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* TODAY MARKER */}
        {todayPct !== null && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-20"
            style={{ left: `calc(${labelWidth} + (100% - ${labelWidth}) * ${todayPct / 100})` }}
          >
            <div className="w-0.5 h-full bg-destructive/70" />
            <div className="absolute -top-0.5 -translate-x-1/2 bg-destructive text-destructive-foreground text-[9px] font-bold px-1 py-0.5 rounded-b-md">
              Auj
            </div>
          </div>
        )}

        {/* LOAD BAR (global intensity visualization) */}
        {categories.length > 0 && (
          <div className="flex mt-1">
            <div style={{ width: labelWidth, minWidth: labelWidth }} className="shrink-0 flex items-center px-3">
              <Flame className="h-3.5 w-3.5 text-orange-500 mr-1.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Charge</span>
            </div>
            <div className="flex-1 relative h-6">
              {months.map((month, i) => {
                const ms = startOfMonth(month);
                const me = endOfMonth(month);
                const monthDays = differenceInDays(me, ms) + 1;
                const widthPct = (monthDays / totalDays) * 100;

                // Average intensity of cycles active in this month
                const activeCycles = cycles.filter(c => {
                  const cs = new Date(c.start_date);
                  const ce = new Date(c.end_date);
                  return ce >= ms && cs <= me;
                });
                const avgIntensity = activeCycles.length > 0
                  ? activeCycles.reduce((sum, c) => sum + (c.intensity || 0), 0) / activeCycles.length
                  : 0;

                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full border-l border-border/10 first:border-l-0"
                    style={{
                      left: `${months.slice(0, i).reduce((acc, m) => {
                        const md = differenceInDays(endOfMonth(m), startOfMonth(m)) + 1;
                        return acc + (md / totalDays) * 100;
                      }, 0)}%`,
                      width: `${widthPct}%`,
                      backgroundColor: avgIntensity > 0 ? `${getIntensityColor(Math.round(avgIntensity))}${Math.round(avgIntensity * 15 + 10).toString(16).padStart(2, '0')}` : "transparent",
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
