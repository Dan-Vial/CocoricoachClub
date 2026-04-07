import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { dateRangeRefinement } from "@/lib/validations";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const cycleSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  week_number: z.number().min(1, "Le numéro de semaine est requis"),
  start_date: z.string().min(1, "La date de début est requise"),
  end_date: z.string().min(1, "La date de fin est requise"),
  period_id: z.string().optional(),
  target_intensity: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
}).superRefine(dateRangeRefinement("start_date", "end_date"));

type CycleForm = z.infer<typeof cycleSchema>;

interface AddCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  editingCycle?: any;
}

export function AddCycleDialog({ open, onOpenChange, categoryId, editingCycle }: AddCycleDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!editingCycle;

  const { data: periods } = useQuery({
    queryKey: ["training_periods", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_periods")
        .select("*")
        .eq("category_id", categoryId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<CycleForm>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      name: "",
      week_number: 1,
      start_date: "",
      end_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (editingCycle) {
      form.reset({
        name: editingCycle.name,
        week_number: editingCycle.week_number,
        start_date: editingCycle.start_date,
        end_date: editingCycle.end_date,
        period_id: editingCycle.period_id || undefined,
        target_intensity: editingCycle.target_intensity || undefined,
        notes: editingCycle.notes || "",
      });
    } else {
      form.reset({
        name: "",
        week_number: 1,
        start_date: "",
        end_date: "",
        notes: "",
      });
    }
  }, [editingCycle, form]);

  const mutation = useMutation({
    mutationFn: async (data: CycleForm) => {
      if (isEditing) {
        const { error } = await supabase
          .from("training_cycles")
          .update({
            name: data.name,
            week_number: data.week_number,
            start_date: data.start_date,
            end_date: data.end_date,
            period_id: data.period_id,
            target_intensity: data.target_intensity,
            notes: data.notes,
          })
          .eq("id", editingCycle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("training_cycles").insert({
          name: data.name,
          week_number: data.week_number,
          start_date: data.start_date,
          end_date: data.end_date,
          period_id: data.period_id,
          target_intensity: data.target_intensity,
          notes: data.notes,
          category_id: categoryId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_cycles", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["periodization-calendar", categoryId] });
      toast.success(isEditing ? "Cycle modifié" : "Cycle créé");
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(isEditing ? "Erreur lors de la modification" : "Erreur lors de la création");
      console.error(error);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: CycleForm) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le Cycle" : "Ajouter un Cycle d'Entraînement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom du Cycle</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Ex: Semaine de Charge"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="week_number">N° Semaine</Label>
              <Input
                id="week_number"
                type="number"
                min="1"
                {...form.register("week_number", { valueAsNumber: true })}
              />
              {form.formState.errors.week_number && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.week_number.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="period_id">Période Associée (optionnel)</Label>
            <Select 
              onValueChange={(value) => form.setValue("period_id", value)}
              value={form.watch("period_id")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une période" />
              </SelectTrigger>
              <SelectContent>
                {periods?.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Date de Début</Label>
              <Input
                id="start_date"
                type="date"
                {...form.register("start_date")}
              />
              {form.formState.errors.start_date && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.start_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="end_date">Date de Fin</Label>
              <Input
                id="end_date"
                type="date"
                min={form.watch("start_date") || undefined}
                {...form.register("end_date")}
              />
              {form.formState.errors.end_date && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.end_date.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="target_intensity">Intensité Cible (%)</Label>
            <Input
              id="target_intensity"
              type="number"
              min="0"
              max="100"
              {...form.register("target_intensity", { valueAsNumber: true })}
              placeholder="Ex: 80"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Objectifs et notes du cycle..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? "Modification..." : "Création...") : (isEditing ? "Modifier" : "Créer")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}