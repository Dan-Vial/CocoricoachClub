import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Settings2, ChevronLeft, ChevronRight, Check, BarChart3, Clock, Trash2, Trophy, Download } from "lucide-react";
import { exportAnnualPlanningToPdf } from "@/lib/pdfAnnualPlanning";
import { format, startOfYear, endOfYear, addYears, subYears } from "date-fns";
import { fr } from "date-fns/locale";
import { YearCalendarGrid } from "./YearCalendarGrid";
import { AnnualTimelineView } from "./AnnualTimelineView";
import { AnnualLoadHeatmap } from "./AnnualLoadHeatmap";
import { AddCycleCategoryDialog } from "./AddCycleCategoryDialog";
import { AddCycleDialog } from "./AddCycleDialog";
import { EditCycleDialog } from "./EditCycleDialog";
import { FisCalendarSync } from "./FisCalendarSync";
import { AddMultipleCompetitionsDialog } from "./AddMultipleCompetitionsDialog";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getMainSportFromType, MAIN_SPORTS } from "@/lib/constants/sportTypes";

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

type ViewMode = "timeline" | "heatmap";

const VIEW_MODES: { value: ViewMode; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { value: "timeline", label: "Vue planification", shortLabel: "Planification", icon: <Clock className="h-4 w-4" /> },
  { value: "heatmap", label: "Vue charge", shortLabel: "Charge", icon: <BarChart3 className="h-4 w-4" /> },
];

export function AnnualPlanningView({ categoryId }: AnnualPlanningViewProps) {
  const { isViewer } = useViewerModeContext();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addCycleOpen, setAddCycleOpen] = useState(false);
  const [addCompetitionsOpen, setAddCompetitionsOpen] = useState(false);
  const [addCyclePreselectedCategory, setAddCyclePreselectedCategory] = useState<string | null>(null);
  const [editingCycle, setEditingCycle] = useState<PeriodizationCycle | null>(null);
  const [prefilledStartDate, setPrefilledStartDate] = useState<Date | undefined>();
  const [prefilledEndDate, setPrefilledEndDate] = useState<Date | undefined>();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Query sport type + names for PDF export
  const { data: categoryData } = useQuery({
    queryKey: ["category-sport-type-annual", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type, name, clubs(name)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data as { rugby_type: string; name: string; clubs: { name: string } | null };
    },
  });
  const isSkiSport = categoryData?.rugby_type ? getMainSportFromType(categoryData.rugby_type) === "ski" : false;

  const yearStart = startOfYear(selectedYear);
  const yearEnd = endOfYear(selectedYear);

  // ─── Data queries ───
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

  // Auto-seed defaults (sport-aware)
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || isViewer) return;
    if (categories === undefined) return;
    if (!categoryData?.rugby_type) return;
    seededRef.current = true;
    const seedDefaults = async () => {
      const mainSport = getMainSportFromType(categoryData.rugby_type);
      const sportLabel = MAIN_SPORTS.find(s => s.value === mainSport)?.label ?? "Sport";
      const defaults = [
        { name: sportLabel, color: "#3b82f6", sort_order: 0 },
        { name: "Préparation Physique", color: "#ef4444", sort_order: 1 },
        { name: "Préparation Mentale", color: "#22c55e", sort_order: 2 },
        { name: "Compétitions", color: "#d4a017", sort_order: 100 },
      ];
      let added = false;
      for (const d of defaults) {
        const { data: existing } = await supabase
          .from("periodization_categories")
          .select("id")
          .eq("category_id", categoryId)
          .eq("name", d.name)
          .limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from("periodization_categories").insert({ category_id: categoryId, ...d });
          added = true;
        }
      }
      if (added) queryClient.invalidateQueries({ queryKey: ["periodization_categories", categoryId] });
    };
    seedDefaults();
  }, [categories, categoryId, categoryData, isViewer, queryClient]);

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
        .select("id, match_date, opponent, is_finalized, competition, event_type")
        .eq("category_id", categoryId)
        .gte("match_date", format(yearStart, "yyyy-MM-dd"))
        .lte("match_date", format(yearEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
  });

  // ─── Mutations ───
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

  const deleteAllCycles = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("periodization_cycles")
        .delete()
        .eq("category_id", categoryId)
        .gte("end_date", format(yearStart, "yyyy-MM-dd"))
        .lte("start_date", format(yearEnd, "yyyy-MM-dd"));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodization_cycles", categoryId] });
      toast.success("Tous les cycles ont été supprimés");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const handleAddCycle = (periodizationCategoryId: string) => {
    setAddCyclePreselectedCategory(periodizationCategoryId);
    setAddCycleOpen(true);
  };

  const handleDateRangeSelect = useCallback((start: Date, end: Date) => {
    setPrefilledStartDate(start);
    setPrefilledEndDate(end);
    // If the active line is the "Compétitions" line, open the competitions dialog
    // pre-filled with the selected period instead of creating a periodization cycle.
    const activeCat = categories.find(c => c.id === activeCategoryId);
    if (activeCat && /comp[ée]tition/i.test(activeCat.name)) {
      setAddCompetitionsOpen(true);
      return;
    }
    setAddCyclePreselectedCategory(activeCategoryId);
    setAddCycleOpen(true);
  }, [activeCategoryId, categories]);

  const handleExportPdf = useCallback(() => {
    try {
      exportAnnualPlanningToPdf({
        year: selectedYear.getFullYear(),
        categoryName: categoryData?.name || "Catégorie",
        clubName: categoryData?.clubs?.name,
        categories,
        cycles,
        matches,
      });
      toast.success("PDF généré avec succès");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    }
  }, [selectedYear, categoryData, categories, cycles, matches]);

  return (
    <div className="space-y-4">
      {/* ─── HEADER ─── */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Planification {selectedYear.getFullYear()}</h2>
              <p className="text-xs text-muted-foreground">
                {categories.length} thématique{categories.length > 1 ? "s" : ""} · {cycles.length} cycle{cycles.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Year nav */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(subYears(selectedYear, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-semibold" onClick={() => setSelectedYear(new Date())}>
                Aujourd'hui
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(addYears(selectedYear, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View mode switcher */}
            <div className="flex bg-muted/50 rounded-lg p-0.5">
              {VIEW_MODES.map((vm) => (
                <button
                  key={vm.value}
                  onClick={() => setViewMode(vm.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                    viewMode === vm.value
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {vm.icon}
                  <span className="hidden sm:inline">{vm.shortLabel}</span>
                </button>
              ))}
            </div>

            {/* Export PDF (always visible) */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={handleExportPdf}
              disabled={categories.length === 0}
              title="Exporter la planification annuelle en PDF (paysage A4, 2 pages)"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exporter PDF</span>
            </Button>

            {/* Actions */}
            {!isViewer && (
              <div className="flex gap-1.5">
                {cycles.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => {
                      if (confirm(`Supprimer tous les cycles de ${selectedYear.getFullYear()} ? Cette action est irréversible.`)) {
                        deleteAllCycles.mutate();
                      }
                    }}
                    disabled={deleteAllCycles.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Supprimer la planification</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setAddCategoryOpen(true)}>
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ligne</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setAddCompetitionsOpen(true)}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ajouter les compétitions</span>
                  <span className="sm:hidden">Compét.</span>
                </Button>
                <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => { setAddCyclePreselectedCategory(null); setAddCycleOpen(true); }}>
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cycle</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="p-4">
          {categories.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Aucune thématique configurée</p>
              <p className="text-xs text-muted-foreground/70 mb-4">
                Créez vos premières lignes (Technique, Tactique, Physique...) pour structurer votre saison
              </p>
              {!isViewer && (
                <Button variant="outline" size="sm" onClick={() => setAddCategoryOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Créer une thématique
                </Button>
              )}
            </div>
          ) : (
            <>
              {viewMode === "timeline" && (
                <AnnualTimelineView
                  year={selectedYear.getFullYear()}
                  categories={categories}
                  cycles={cycles}
                  sessions={sessions}
                  matches={matches}
                  isViewer={isViewer}
                  onAddCycle={handleAddCycle}
                  onEditCycle={(cycle) => setEditingCycle(cycle)}
                  zoomLevel="year"
                />
              )}


              {viewMode === "heatmap" && (
                <AnnualLoadHeatmap
                  year={selectedYear.getFullYear()}
                  categories={categories}
                  cycles={cycles}
                  sessions={sessions}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── CALENDAR GRID + QUICK ASSIGN ─── */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gradient-to-r from-muted/20 to-transparent">
          <h3 className="text-sm font-bold tracking-tight text-muted-foreground">
            Calendrier {selectedYear.getFullYear()}
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {/* Quick-assign toolbar */}
          {!isViewer && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1 font-medium">Assignation rapide :</span>
              {categories.map((cat) => (
                <div key={cat.id} className="relative group/chip flex items-center">
                  <button
                    onClick={() => setActiveCategoryId(activeCategoryId === cat.id ? null : cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-2",
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
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
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
        </div>
      </div>

      {/* ─── FIS CALENDAR SYNC (ski sports only) ─── */}
      {isSkiSport && !isViewer && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <h3 className="text-sm font-bold tracking-tight text-muted-foreground flex items-center gap-2">
              🎿 Import Calendrier FIS
            </h3>
          </div>
          <div className="p-4">
            <FisCalendarSync categoryId={categoryId} />
          </div>
        </div>
      )}

      {/* ─── DIALOGS ─── */}
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
      <AddMultipleCompetitionsDialog
        open={addCompetitionsOpen}
        onOpenChange={(open) => {
          setAddCompetitionsOpen(open);
          if (!open) {
            setPrefilledStartDate(undefined);
            setPrefilledEndDate(undefined);
          }
        }}
        categoryId={categoryId}
        sportType={categoryData?.rugby_type}
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
