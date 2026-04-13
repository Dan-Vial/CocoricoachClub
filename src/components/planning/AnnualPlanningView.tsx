import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Settings2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, differenceInDays, isWithinInterval, eachWeekOfInterval, startOfWeek, addYears, subYears } from "date-fns";
import { YearCalendarGrid } from "./YearCalendarGrid";
import { fr } from "date-fns/locale";
import { AddCycleCategoryDialog } from "./AddCycleCategoryDialog";
import { AddCycleDialog } from "./AddCycleDialog";
import { EditCycleDialog } from "./EditCycleDialog";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

function getIntensityColor(value: number) {
  if (value <= 1) return "#facc15";
  if (value <= 2) return "#f59e0b";
  if (value <= 3) return "#f97316";
  if (value <= 4) return "#ef4444";
  return "#dc2626";
}

interface AnnualPlanningViewProps {
  categoryId: string;
}

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

export function AnnualPlanningView({ categoryId }: AnnualPlanningViewProps) {
  const { isViewer } = useViewerModeContext();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date());
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addCycleOpen, setAddCycleOpen] = useState(false);
  const [addCyclePreselectedCategory, setAddCyclePreselectedCategory] = useState<string | null>(null);
  const [editingCycle, setEditingCycle] = useState<PeriodizationCycle | null>(null);
  const [prefilledStartDate, setPrefilledStartDate] = useState<Date | undefined>();
  const [prefilledEndDate, setPrefilledEndDate] = useState<Date | undefined>();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const yearStart = startOfYear(selectedYear);
  const yearEnd = endOfYear(selectedYear);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const totalDays = differenceInDays(yearEnd, yearStart) + 1;

  const { data: categories = [] } = useQuery({
    queryKey: ["periodization_categories", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodization_categories")
        .select("*")
        .eq("category_id", categoryId)
        .order("sort_order");
      if (error) throw error;
      return data as PeriodizationCategory[];
    },
  });

  // Auto-seed default categories — only runs once after categories have loaded
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || isViewer) return;
    // Wait until the categories query has actually resolved (not just empty default)
    // We rely on the query being enabled — if categories is [] after fetch, we seed
    if (categories === undefined) return;
    seededRef.current = true;
    
    const seedDefaults = async () => {
      const defaultCategories = [
        { name: "Compétitions", color: "#d4a017", sort_order: 100 },
        { name: "Stages France", color: "#1e3a5f", sort_order: 101 },
      ];
      
      let added = false;
      for (const defaultCat of defaultCategories) {
        // Check directly in DB to avoid race conditions
        const { data: existing } = await supabase
          .from("periodization_categories")
          .select("id")
          .eq("category_id", categoryId)
          .eq("name", defaultCat.name)
          .limit(1);
        
        if (!existing || existing.length === 0) {
          await supabase.from("periodization_categories").insert({
            category_id: categoryId,
            ...defaultCat
          });
          added = true;
        }
      }
      
      if (added) {
        queryClient.invalidateQueries({ queryKey: ["periodization_categories", categoryId] });
      }
    };
    
    seedDefaults();
  }, [categories, categoryId, isViewer, queryClient]);

  const { data: cycles = [] } = useQuery({
    queryKey: ["periodization_cycles", categoryId, selectedYear.getFullYear()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periodization_cycles")
        .select("*")
        .eq("category_id", categoryId)
        .gte("end_date", format(yearStart, "yyyy-MM-dd"))
        .lte("start_date", format(yearEnd, "yyyy-MM-dd"))
        .order("start_date");
      if (error) throw error;
      return data as PeriodizationCycle[];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["training_sessions_annual", categoryId, selectedYear.getFullYear()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, session_date")
        .eq("category_id", categoryId)
        .gte("session_date", format(yearStart, "yyyy-MM-dd"))
        .lte("session_date", format(yearEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches_annual", categoryId, selectedYear.getFullYear()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, match_date, opponent")
        .eq("category_id", categoryId)
        .gte("match_date", format(yearStart, "yyyy-MM-dd"))
        .lte("match_date", format(yearEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
  });

  const deleteCycleCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("periodization_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodization_categories", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["periodization_cycles", categoryId] });
    },
  });

  const deleteCycle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("periodization_cycles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodization_cycles", categoryId] });
    },
  });

  // Calculate position and width of a cycle block on the timeline
  const getCyclePosition = (cycle: PeriodizationCycle) => {
    const cycleStart = new Date(cycle.start_date);
    const cycleEnd = new Date(cycle.end_date);
    
    const effectiveStart = cycleStart < yearStart ? yearStart : cycleStart;
    const effectiveEnd = cycleEnd > yearEnd ? yearEnd : cycleEnd;
    
    const startOffset = differenceInDays(effectiveStart, yearStart);
    const duration = differenceInDays(effectiveEnd, effectiveStart) + 1;
    
    const widthPercent = (duration / totalDays) * 100;
    // Minimum visible width: ~1.8% ≈ ~7 days visually for very short events
    const minWidthPercent = 1.8;
    const isNarrow = widthPercent < minWidthPercent;
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${Math.max(widthPercent, minWidthPercent)}%`,
      isNarrow,
      duration,
    };
  };

  // Count sessions per month
  const sessionsPerMonth = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return sessions.filter(s => {
      const d = new Date(s.session_date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    }).length;
  });

  const matchesPerMonth = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return matches.filter(m => {
      const d = new Date(m.match_date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    }).length;
  });

  const handleAddCycle = (periodizationCategoryId: string) => {
    setAddCyclePreselectedCategory(periodizationCategoryId);
    setAddCycleOpen(true);
  };

  const quickCreateCycle = useMutation({
    mutationFn: async ({ catId, start, end }: { catId: string; start: Date; end: Date }) => {
      const cat = categories.find(c => c.id === catId);
      if (!cat) throw new Error("Catégorie introuvable");
      const { error } = await supabase.from("periodization_cycles").insert({
        periodization_category_id: catId,
        category_id: categoryId,
        name: cat.name,
        color: cat.color,
        start_date: format(start, "yyyy-MM-dd"),
        end_date: format(end, "yyyy-MM-dd"),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodization_cycles", categoryId] });
      toast.success("Cycle créé");
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const handleDateRangeSelect = useCallback((start: Date, end: Date) => {
    setPrefilledStartDate(start);
    setPrefilledEndDate(end);
    if (activeCategoryId) {
      setAddCyclePreselectedCategory(activeCategoryId);
    } else {
      setAddCyclePreselectedCategory(null);
    }
    setAddCycleOpen(true);
  }, [activeCategoryId]);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Planification annuelle {selectedYear.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedYear(subYears(selectedYear, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedYear(new Date())}>
                Aujourd'hui
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedYear(addYears(selectedYear, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isViewer && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setAddCategoryOpen(true)} className="gap-1">
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Ajouter une ligne</span>
                  </Button>
                  <Button size="sm" onClick={() => { setAddCyclePreselectedCategory(null); setAddCycleOpen(true); }} className="gap-1">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Ajouter un cycle</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1].map((semesterIndex) => {
            const semesterMonths = months.slice(semesterIndex * 6, semesterIndex * 6 + 6);
            const semesterStart = startOfMonth(semesterMonths[0]);
            const semesterEnd = endOfMonth(semesterMonths[semesterMonths.length - 1]);
            const semesterTotalDays = differenceInDays(semesterEnd, semesterStart) + 1;

            const getSemesterCyclePosition = (cycle: PeriodizationCycle) => {
              const cycleStart = new Date(cycle.start_date);
              const cycleEnd = new Date(cycle.end_date);
              
              // Skip if cycle doesn't overlap this semester
              if (cycleEnd < semesterStart || cycleStart > semesterEnd) return null;
              
              const effectiveStart = cycleStart < semesterStart ? semesterStart : cycleStart;
              const effectiveEnd = cycleEnd > semesterEnd ? semesterEnd : cycleEnd;
              
              const startOffset = differenceInDays(effectiveStart, semesterStart);
              const duration = differenceInDays(effectiveEnd, effectiveStart) + 1;
              
              const widthPercent = (duration / semesterTotalDays) * 100;
              const minWidthPercent = 2.5;
              const isNarrow = widthPercent < minWidthPercent;
              
              return {
                left: `${(startOffset / semesterTotalDays) * 100}%`,
                width: `${Math.max(widthPercent, minWidthPercent)}%`,
                isNarrow,
                duration,
              };
            };

            const semesterSessionsPerMonth = semesterMonths.map((month) => {
              const mStart = startOfMonth(month);
              const mEnd = endOfMonth(month);
              return sessions.filter(s => {
                const d = new Date(s.session_date);
                return isWithinInterval(d, { start: mStart, end: mEnd });
              }).length;
            });

            const semesterMatchesPerMonth = semesterMonths.map((month) => {
              const mStart = startOfMonth(month);
              const mEnd = endOfMonth(month);
              return matches.filter(m => {
                const d = new Date(m.match_date);
                return isWithinInterval(d, { start: mStart, end: mEnd });
              }).length;
            });

            return (
              <div key={semesterIndex} className="relative">
                {/* Semester label */}
                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                  {semesterIndex === 0 ? "Janvier – Juin" : "Juillet – Décembre"}
                </div>

                {/* Month headers */}
                <div className="flex border-b border-border">
                  <div className="w-32 min-w-[128px] shrink-0" />
                  <div className="flex-1 flex">
                    {semesterMonths.map((month, i) => {
                      const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                      const widthPercent = (monthDays / semesterTotalDays) * 100;
                      return (
                        <div
                          key={i}
                          className="text-center text-xs font-medium text-muted-foreground py-2 border-l border-border first:border-l-0 uppercase"
                          style={{ width: `${widthPercent}%` }}
                        >
                          {format(month, "MMMM", { locale: fr })}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Activity row */}
                <div className="flex border-b border-border bg-muted/30">
                  <div className="w-32 min-w-[128px] shrink-0 flex items-center px-3">
                    <span className="text-xs font-medium text-muted-foreground">Activité</span>
                  </div>
                  <div className="flex-1 flex">
                    {semesterMonths.map((month, i) => {
                      const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                      const widthPercent = (monthDays / semesterTotalDays) * 100;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-center gap-1 py-2 border-l border-border first:border-l-0"
                          style={{ width: `${widthPercent}%` }}
                        >
                          {semesterSessionsPerMonth[i] > 0 && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                    {semesterSessionsPerMonth[i]}S
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>{semesterSessionsPerMonth[i]} séance(s)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {semesterMatchesPerMonth[i] > 0 && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                                    {semesterMatchesPerMonth[i]}M
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>{semesterMatchesPerMonth[i]} match(s)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Category rows */}
                {categories.length === 0 && semesterIndex === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Aucune ligne de périodisation configurée</p>
                    {!isViewer && (
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddCategoryOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Créer une première ligne
                      </Button>
                    )}
                  </div>
                )}

                {categories.map((cat) => {
                  const catCycles = cycles.filter(c => c.periodization_category_id === cat.id);
                  return (
                    <div key={cat.id} className="flex border-b border-border group/row hover:bg-muted/20 transition-colors">
                      <div className="w-32 min-w-[128px] shrink-0 flex items-center px-3 py-3 gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs font-semibold truncate">{cat.name}</span>
                        {!isViewer && semesterIndex === 0 && (
                          <button
                            className="opacity-0 group-hover/row:opacity-100 transition-opacity ml-auto"
                            onClick={() => handleAddCycle(cat.id)}
                            title="Ajouter un cycle"
                          >
                            <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 relative" style={{ minHeight: "48px" }}>
                        {/* Month grid lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {semesterMonths.map((month, i) => {
                            const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                            const widthPercent = (monthDays / semesterTotalDays) * 100;
                            return (
                              <div
                                key={i}
                                className="border-l border-border/50 first:border-l-0 h-full"
                                style={{ width: `${widthPercent}%` }}
                              />
                            );
                          })}
                        </div>
                        {/* Cycle blocks */}
                        {catCycles.map((cycle) => {
                          const pos = getSemesterCyclePosition(cycle);
                          if (!pos) return null;
                          return (
                            <TooltipProvider key={cycle.id} delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className={cn(
                                      "absolute top-1.5 h-[calc(100%-12px)] rounded-md shadow-sm",
                                      "flex flex-col items-center justify-center overflow-hidden",
                                      "hover:shadow-md hover:brightness-110 transition-all cursor-pointer",
                                      "text-white",
                                      pos.isNarrow ? "px-0.5" : "px-2"
                                    )}
                                    style={{
                                      left: pos.left,
                                      width: pos.width,
                                      backgroundColor: cycle.color,
                                      zIndex: pos.isNarrow ? 5 : 1,
                                    }}
                                    onClick={() => !isViewer && setEditingCycle(cycle)}
                                  >
                                    {pos.isNarrow ? (
                                      <span className="truncate text-[9px] font-bold tracking-tight leading-tight text-center w-full">
                                        {pos.duration}j
                                      </span>
                                    ) : (
                                      <>
                                        <span className="truncate text-[11px] font-semibold tracking-wide w-full text-center">{cycle.name}</span>
                                        {cycle.objective && (
                                          <span className="truncate text-[9px] font-normal opacity-80 w-full text-center">{cycle.objective}</span>
                                        )}
                                      </>
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    <p className="font-semibold">{cycle.name}</p>
                                    <p className="text-xs">
                                      {format(new Date(cycle.start_date), "dd MMM yyyy", { locale: fr })} → {format(new Date(cycle.end_date), "dd MMM yyyy", { locale: fr })}
                                    </p>
                                    {cycle.cycle_type && (
                                      <p className="text-xs">Type: {cycle.cycle_type === "recuperation" ? "Récupération" : cycle.cycle_type}</p>
                                    )}
                                    {cycle.objective && <p className="text-xs text-muted-foreground">Objectif: {cycle.objective}</p>}
                                    {(cycle.intensity != null && cycle.intensity > 0) && (
                                      <div className="flex items-center gap-1 text-xs">
                                        <span>Intensité:</span>
                                        <div className="flex gap-0.5">
                                          {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="w-2 h-2 rounded-sm" style={{ backgroundColor: i < cycle.intensity! ? getIntensityColor(cycle.intensity!) : "hsl(var(--muted))" }} />
                                          ))}
                                        </div>
                                        <span>{cycle.intensity}/5</span>
                                      </div>
                                    )}
                                    {(cycle.volume != null && cycle.volume > 0) && (
                                      <div className="flex items-center gap-1 text-xs">
                                        <span>Volume:</span>
                                        <div className="flex gap-0.5">
                                          {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="w-2 h-2 rounded-sm" style={{ backgroundColor: i < cycle.volume! ? getIntensityColor(cycle.volume!) : "hsl(var(--muted))" }} />
                                          ))}
                                        </div>
                                        <span>{cycle.volume}/5</span>
                                      </div>
                                    )}
                                    {cycle.notes && <p className="text-xs text-muted-foreground italic">{cycle.notes}</p>}
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

                {/* Today marker */}
                {isWithinInterval(new Date(), { start: semesterStart, end: semesterEnd }) && (() => {
                  const todayOffset = differenceInDays(new Date(), semesterStart);
                  const pct = (todayOffset / semesterTotalDays) * 100;
                  return (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10 pointer-events-none"
                      style={{
                        left: `calc(128px + (100% - 128px) * ${pct / 100})`,
                      }}
                    />
                  );
                })()}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Full Year Calendar Grid */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Calendrier {selectedYear.getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Quick-assign toolbar */}
          {!isViewer && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Assignation rapide :</span>
              {categories.map((cat) => (
                <div key={cat.id} className="relative group/chip flex items-center">
                  <button
                    onClick={() => setActiveCategoryId(activeCategoryId === cat.id ? null : cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border-2",
                      activeCategoryId === cat.id
                        ? "text-white shadow-md scale-105"
                        : "text-foreground bg-card hover:brightness-95"
                    )}
                    style={{
                      borderColor: cat.color,
                      backgroundColor: activeCategoryId === cat.id ? cat.color : undefined,
                    }}
                  >
                    {activeCategoryId === cat.id && <Check className="h-3 w-3" />}
                    {cat.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Supprimer la ligne "${cat.name}" et tous ses cycles ?`)) {
                        deleteCycleCategory.mutate(cat.id);
                        if (activeCategoryId === cat.id) setActiveCategoryId(null);
                      }
                    }}
                    className="absolute -top-1.5 -right-1.5 z-10 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/chip:opacity-100 transition-opacity hover:scale-110"
                    title="Supprimer cette ligne"
                  >
                    <span className="text-[10px] font-bold leading-none">✕</span>
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAddCategoryOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-3 w-3" />
                Ajouter
              </button>
              {activeCategoryId && (
                <span className="text-[10px] text-muted-foreground italic ml-2">
                  Sélectionnez une période dans le calendrier
                </span>
              )}
            </div>
          )}
          <YearCalendarGrid
            year={selectedYear.getFullYear()}
            cycles={cycles}
            sessions={sessions}
            matches={matches}
            onDateRangeSelect={handleDateRangeSelect}
            activeCategoryColor={categories.find(c => c.id === activeCategoryId)?.color}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddCycleCategoryDialog
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
        categoryId={categoryId}
      />
      <AddCycleDialog
        open={addCycleOpen}
        onOpenChange={(open) => {
          setAddCycleOpen(open);
          if (!open) {
            setPrefilledStartDate(undefined);
            setPrefilledEndDate(undefined);
          }
        }}
        categoryId={categoryId}
        categories={categories}
        preselectedCategoryId={addCyclePreselectedCategory}
        prefilledStartDate={prefilledStartDate}
        prefilledEndDate={prefilledEndDate}
      />
      {editingCycle && (
        <EditCycleDialog
          open={!!editingCycle}
          onOpenChange={(open) => !open && setEditingCycle(null)}
          cycle={editingCycle}
          categoryId={categoryId}
          categories={categories}
          onDelete={(id) => {
            deleteCycle.mutate(id);
            setEditingCycle(null);
          }}
        />
      )}
    </div>
  );
}
