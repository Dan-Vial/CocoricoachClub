import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Settings2, ChevronLeft, ChevronRight } from "lucide-react";
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
}

export function AnnualPlanningView({ categoryId }: AnnualPlanningViewProps) {
  const { isViewer } = useViewerModeContext();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date());
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addCycleOpen, setAddCycleOpen] = useState(false);
  const [addCyclePreselectedCategory, setAddCyclePreselectedCategory] = useState<string | null>(null);
  const [editingCycle, setEditingCycle] = useState<PeriodizationCycle | null>(null);

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
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
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
        <CardContent>
          {/* Month headers */}
          <div className="relative">
            <div className="flex border-b border-border">
              <div className="w-32 min-w-[128px] shrink-0" />
              <div className="flex-1 flex">
                {months.map((month, i) => {
                  const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                  const widthPercent = (monthDays / totalDays) * 100;
                  return (
                    <div
                      key={i}
                      className="text-center text-xs font-medium text-muted-foreground py-2 border-l border-border first:border-l-0 uppercase"
                      style={{ width: `${widthPercent}%` }}
                    >
                      {format(month, "MMM", { locale: fr })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity row: sessions + matches dots */}
            <div className="flex border-b border-border bg-muted/30">
              <div className="w-32 min-w-[128px] shrink-0 flex items-center px-3">
                <span className="text-xs font-medium text-muted-foreground">Activité</span>
              </div>
              <div className="flex-1 flex">
                {months.map((month, i) => {
                  const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                  const widthPercent = (monthDays / totalDays) * 100;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-center gap-1 py-2 border-l border-border first:border-l-0"
                      style={{ width: `${widthPercent}%` }}
                    >
                      {sessionsPerMonth[i] > 0 && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                {sessionsPerMonth[i]}S
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{sessionsPerMonth[i]} séance(s)</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {matchesPerMonth[i] > 0 && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                                {matchesPerMonth[i]}M
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{matchesPerMonth[i]} match(s)</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cycle category rows */}
            {categories.length === 0 && (
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
                    {!isViewer && (
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
                      {months.map((month, i) => {
                        const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                        const widthPercent = (monthDays / totalDays) * 100;
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
                      const pos = getCyclePosition(cycle);
                      return (
                        <TooltipProvider key={cycle.id} delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  "absolute top-1.5 h-[calc(100%-12px)] rounded-md shadow-sm",
                                  "flex items-center justify-center px-2 overflow-hidden",
                                  "hover:shadow-md hover:brightness-110 transition-all cursor-pointer",
                                  "text-white text-[11px] font-semibold tracking-wide"
                                )}
                                style={{
                                  left: pos.left,
                                  width: pos.width,
                                  backgroundColor: cycle.color,
                                  minWidth: "20px",
                                }}
                                onClick={() => !isViewer && setEditingCycle(cycle)}
                              >
                                <span className="truncate">{cycle.name}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">{cycle.name}</p>
                                <p className="text-xs">
                                  {format(new Date(cycle.start_date), "dd MMM yyyy", { locale: fr })} → {format(new Date(cycle.end_date), "dd MMM yyyy", { locale: fr })}
                                </p>
                                {cycle.objective && <p className="text-xs text-muted-foreground">Objectif: {cycle.objective}</p>}
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
            {isWithinInterval(new Date(), { start: yearStart, end: yearEnd }) && (() => {
              const todayOffset = differenceInDays(new Date(), yearStart);
              const pct = (todayOffset / totalDays) * 100;
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
        </CardContent>
      </Card>

      {/* Full Year Calendar Grid */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Calendrier {selectedYear.getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <YearCalendarGrid
            year={selectedYear.getFullYear()}
            cycles={cycles}
            sessions={sessions}
            matches={matches}
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
        onOpenChange={setAddCycleOpen}
        categoryId={categoryId}
        categories={categories}
        preselectedCategoryId={addCyclePreselectedCategory}
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
