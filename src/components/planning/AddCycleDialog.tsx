import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CycleFormFields } from "./CycleFormFields";
import { CycleColorPicker } from "./CycleColorPicker";


interface AddCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categories: { id: string; name: string; color: string }[];
  preselectedCategoryId: string | null;
  prefilledStartDate?: Date;
  prefilledEndDate?: Date;
}

export function AddCycleDialog({ open, onOpenChange, categoryId, categories, preselectedCategoryId, prefilledStartDate, prefilledEndDate }: AddCycleDialogProps) {
  const [name, setName] = useState("");
  const [periodizationCategoryId, setPeriodizationCategoryId] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [cycleType, setCycleType] = useState("");
  const [intensity, setIntensity] = useState(0);
  const [volume, setVolume] = useState(0);
  const [dominantQuality, setDominantQuality] = useState("");
  const [loadPattern, setLoadPattern] = useState("");
  const [fatigueTarget, setFatigueTarget] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number | null>(null);
  const [customColor, setCustomColor] = useState("");
  const queryClient = useQueryClient();

  const selectedCategory = categories.find(c => c.id === periodizationCategoryId);
  const color = customColor || selectedCategory?.color || "#3b82f6";

  useEffect(() => {
    if (preselectedCategoryId) {
      setPeriodizationCategoryId(preselectedCategoryId);
    }
  }, [preselectedCategoryId]);

  useEffect(() => {
    if (prefilledStartDate) setStartDate(prefilledStartDate);
    if (prefilledEndDate) setEndDate(prefilledEndDate);
  }, [prefilledStartDate, prefilledEndDate]);

  const createCycle = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) throw new Error("Dates requises");
      const { error } = await supabase.from("periodization_cycles").insert({
        periodization_category_id: periodizationCategoryId,
        category_id: categoryId,
        name,
        color,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        objective: objective || null,
        notes: notes || null,
        cycle_type: cycleType || null,
        intensity: intensity || null,
        volume: volume || null,
        dominant_quality: dominantQuality || null,
        load_pattern: loadPattern || null,
        fatigue_target: fatigueTarget || null,
        sessions_per_week: sessionsPerWeek,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodization_cycles", categoryId] });
      toast.success("Cycle créé avec succès");
      resetForm();
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de la création du cycle"),
  });

  const resetForm = () => {
    setName("");
    setStartDate(undefined);
    setEndDate(undefined);
    setObjective("");
    setNotes("");
    setCycleType("");
    setIntensity(0);
    setVolume(0);
    setCustomColor("");
  };

  const isValid = name.trim() && periodizationCategoryId && startDate && endDate && endDate >= startDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau cycle de travail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Ligne de périodisation</Label>
            <Select value={periodizationCategoryId} onValueChange={setPeriodizationCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une ligne..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nom du cycle</Label>
            <Input
              placeholder="Ex: Force, Technique, Hypertrophie..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <CycleColorPicker
            categoryId={categoryId}
            color={color}
            customColor={customColor}
            onCustomColorChange={setCustomColor}
          />

          <CycleFormFields
            cycleType={cycleType}
            onCycleTypeChange={setCycleType}
            intensity={intensity}
            onIntensityChange={setIntensity}
            volume={volume}
            onVolumeChange={setVolume}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Début"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Fin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label>Objectif</Label>
            <Input
              placeholder="Ex: Développer la force max, Améliorer la technique..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Notes additionnelles..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button className="w-full" disabled={!isValid || createCycle.isPending} onClick={() => createCycle.mutate()}>
            Créer le cycle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
