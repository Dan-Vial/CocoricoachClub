import { useState } from "react";
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
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CycleFormFields } from "./CycleFormFields";
import { CycleColorPicker } from "./CycleColorPicker";


interface EditCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle: {
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
    dominant_quality?: string | null;
    load_pattern?: string | null;
    fatigue_target?: string | null;
    sessions_per_week?: number | null;
  };
  categoryId: string;
  categories: { id: string; name: string; color: string }[];
  onDelete: (id: string) => void;
}

export function EditCycleDialog({ open, onOpenChange, cycle, categoryId, categories, onDelete }: EditCycleDialogProps) {
  const [name, setName] = useState(cycle.name);
  const [periodizationCategoryId, setPeriodizationCategoryId] = useState(cycle.periodization_category_id);
  const selectedCategory = categories.find(c => c.id === periodizationCategoryId);
  const defaultColor = selectedCategory?.color || cycle.color;
  const [customColor, setCustomColor] = useState(cycle.color !== selectedCategory?.color ? cycle.color : "");
  const color = customColor || defaultColor;
  const [startDate, setStartDate] = useState<Date>(new Date(cycle.start_date));
  const [endDate, setEndDate] = useState<Date>(new Date(cycle.end_date));
  const [objective, setObjective] = useState(cycle.objective || "");
  const [notes, setNotes] = useState(cycle.notes || "");
  const [cycleType, setCycleType] = useState(cycle.cycle_type || "");
  const [intensity, setIntensity] = useState(cycle.intensity || 0);
  const [volume, setVolume] = useState(cycle.volume || 0);
  const queryClient = useQueryClient();

  const updateCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("periodization_cycles")
        .update({
          periodization_category_id: periodizationCategoryId,
          name,
          color,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          objective: objective || null,
          notes: notes || null,
          cycle_type: cycleType || null,
          intensity: intensity || null,
          volume: volume || null,
        })
        .eq("id", cycle.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodization_cycles", categoryId] });
      toast.success("Cycle mis à jour");
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const isValid = name.trim() && periodizationCategoryId && startDate && endDate && endDate >= startDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le cycle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Ligne de périodisation</Label>
            <Select value={periodizationCategoryId} onValueChange={setPeriodizationCategoryId}>
              <SelectTrigger>
                <SelectValue />
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
            <Input value={name} onChange={(e) => setName(e.target.value)} />
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
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => d && setEndDate(d)}
                    disabled={(date) => date < startDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label>Objectif</Label>
            <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(cycle.id)}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
            <Button className="flex-1" disabled={!isValid || updateCycle.isPending} onClick={() => updateCycle.mutate()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
