import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  position: z.string().min(1, "Poste requis"),
  sprint_40m_elite: z.string().optional(),
  sprint_40m_good: z.string().optional(),
  yo_yo_level_elite: z.string().optional(),
  yo_yo_level_good: z.string().optional(),
  squat_ratio_elite: z.string().optional(),
  squat_ratio_good: z.string().optional(),
  bench_ratio_elite: z.string().optional(),
  bench_ratio_good: z.string().optional(),
  body_fat_max: z.string().optional(),
  muscle_mass_min_ratio: z.string().optional(),
  cmj_cm_elite: z.string().optional(),
  cmj_cm_good: z.string().optional(),
  notes: z.string().optional(),
});

interface AddBenchmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  existingBenchmark?: any;
  existingPositions: string[];
}

const POSITIONS = [
  { value: "pilier", label: "Pilier" },
  { value: "talonneur", label: "Talonneur" },
  { value: "deuxieme_ligne", label: "2ème Ligne" },
  { value: "flanker", label: "Flanker" },
  { value: "numero_8", label: "Numéro 8" },
  { value: "demi_melee", label: "Demi de mêlée" },
  { value: "demi_ouverture", label: "Demi d'ouverture" },
  { value: "centre", label: "Centre" },
  { value: "ailier", label: "Ailier" },
  { value: "arriere", label: "Arrière" },
];

export function AddBenchmarkDialog({ open, onOpenChange, categoryId, existingBenchmark, existingPositions }: AddBenchmarkDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!existingBenchmark;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      position: "",
      sprint_40m_elite: "",
      sprint_40m_good: "",
      yo_yo_level_elite: "",
      yo_yo_level_good: "",
      squat_ratio_elite: "",
      squat_ratio_good: "",
      bench_ratio_elite: "",
      bench_ratio_good: "",
      body_fat_max: "",
      muscle_mass_min_ratio: "",
      cmj_cm_elite: "",
      cmj_cm_good: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (existingBenchmark) {
      form.reset({
        position: existingBenchmark.position || "",
        sprint_40m_elite: existingBenchmark.sprint_40m_elite?.toString() || "",
        sprint_40m_good: existingBenchmark.sprint_40m_good?.toString() || "",
        yo_yo_level_elite: existingBenchmark.yo_yo_level_elite || "",
        yo_yo_level_good: existingBenchmark.yo_yo_level_good || "",
        squat_ratio_elite: existingBenchmark.squat_ratio_elite?.toString() || "",
        squat_ratio_good: existingBenchmark.squat_ratio_good?.toString() || "",
        bench_ratio_elite: existingBenchmark.bench_ratio_elite?.toString() || "",
        bench_ratio_good: existingBenchmark.bench_ratio_good?.toString() || "",
        body_fat_max: existingBenchmark.body_fat_max?.toString() || "",
        muscle_mass_min_ratio: existingBenchmark.muscle_mass_min_ratio?.toString() || "",
        cmj_cm_elite: existingBenchmark.cmj_cm_elite?.toString() || "",
        cmj_cm_good: existingBenchmark.cmj_cm_good?.toString() || "",
        notes: existingBenchmark.notes || "",
      });
    } else {
      form.reset();
    }
  }, [existingBenchmark, form]);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const data = {
        category_id: categoryId,
        position: values.position,
        sprint_40m_elite: values.sprint_40m_elite ? parseFloat(values.sprint_40m_elite) : null,
        sprint_40m_good: values.sprint_40m_good ? parseFloat(values.sprint_40m_good) : null,
        yo_yo_level_elite: values.yo_yo_level_elite || null,
        yo_yo_level_good: values.yo_yo_level_good || null,
        squat_ratio_elite: values.squat_ratio_elite ? parseFloat(values.squat_ratio_elite) : null,
        squat_ratio_good: values.squat_ratio_good ? parseFloat(values.squat_ratio_good) : null,
        bench_ratio_elite: values.bench_ratio_elite ? parseFloat(values.bench_ratio_elite) : null,
        bench_ratio_good: values.bench_ratio_good ? parseFloat(values.bench_ratio_good) : null,
        body_fat_max: values.body_fat_max ? parseFloat(values.body_fat_max) : null,
        muscle_mass_min_ratio: values.muscle_mass_min_ratio ? parseFloat(values.muscle_mass_min_ratio) : null,
        cmj_cm_elite: values.cmj_cm_elite ? parseInt(values.cmj_cm_elite) : null,
        cmj_cm_good: values.cmj_cm_good ? parseInt(values.cmj_cm_good) : null,
        notes: values.notes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("position_benchmarks")
          .update(data)
          .eq("id", existingBenchmark.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("position_benchmarks").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-benchmarks", categoryId] });
      toast.success(isEditing ? "Benchmark mis à jour" : "Benchmark ajouté");
      form.reset();
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de l'opération"),
  });

  const availablePositions = POSITIONS.filter(
    p => !existingPositions.includes(p.value) || (isEditing && p.value === existingBenchmark?.position)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le benchmark" : "Ajouter un benchmark"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poste</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un poste" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availablePositions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-medium">Vitesse - 40m Sprint (secondes)</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sprint_40m_elite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-400">Niveau Élite</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="4.85" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sprint_40m_good"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-yellow-400">Niveau Bon</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="5.10" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-medium">Yo-Yo Test (niveau)</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="yo_yo_level_elite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-400">Niveau Élite</FormLabel>
                      <FormControl>
                        <Input placeholder="20.1" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yo_yo_level_good"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-yellow-400">Niveau Bon</FormLabel>
                      <FormControl>
                        <Input placeholder="18.1" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-medium">Force (ratio poids soulevé / poids corps)</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="squat_ratio_elite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-400">Squat Élite</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="2.0" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="squat_ratio_good"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-yellow-400">Squat Bon</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="1.7" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bench_ratio_elite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-400">Bench Élite</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="1.5" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bench_ratio_good"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-yellow-400">Bench Bon</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="1.3" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-medium">Composition & Détente</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="body_fat_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>% Masse Grasse Max</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="15" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="muscle_mass_min_ratio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ratio Masse Musc. Min</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.45" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cmj_cm_elite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-400">CMJ Élite (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="45" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cmj_cm_good"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-yellow-400">CMJ Bon (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="38" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes sur les benchmarks..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Ajouter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
