import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  player_id: z.string().min(1, "Sélectionnez un joueur"),
  test_date: z.string().min(1, "Date requise"),
  test_type: z.string().min(1, "Type de test requis"),
  yo_yo_level: z.string().optional(),
  yo_yo_distance_m: z.string().optional(),
  bronco_time_seconds: z.string().optional(),
  agility_time_seconds: z.string().optional(),
  notes: z.string().optional(),
});

interface AddRugbyTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

const TEST_TYPES = [
  { value: "yo_yo_ir1", label: "Yo-Yo IR1 (Intermittent Recovery Level 1)" },
  { value: "yo_yo_ir2", label: "Yo-Yo IR2 (Intermittent Recovery Level 2)" },
  { value: "bronco", label: "Bronco (1200m shuttle)" },
  { value: "5_10_5", label: "5-10-5 Shuttle (Pro Agility)" },
  { value: "t_test", label: "T-Test Agility" },
];

const YO_YO_LEVELS = [
  "5.1", "9.1", "11.1", "12.1", "13.1", "14.1", "15.1", "16.1", "17.1", "18.1", "19.1", "20.1", "21.1", "22.1", "23.1"
];

export function AddRugbyTestDialog({ open, onOpenChange, categoryId }: AddRugbyTestDialogProps) {
  const queryClient = useQueryClient();

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      player_id: "",
      test_date: new Date().toISOString().split("T")[0],
      test_type: "",
      yo_yo_level: "",
      yo_yo_distance_m: "",
      bronco_time_seconds: "",
      agility_time_seconds: "",
      notes: "",
    },
  });

  const testType = form.watch("test_type");

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const { error } = await supabase.from("rugby_specific_tests").insert({
        player_id: values.player_id,
        category_id: categoryId,
        test_date: values.test_date,
        test_type: values.test_type,
        yo_yo_level: values.yo_yo_level || null,
        yo_yo_distance_m: values.yo_yo_distance_m ? parseInt(values.yo_yo_distance_m) : null,
        bronco_time_seconds: values.bronco_time_seconds ? parseFloat(values.bronco_time_seconds) : null,
        agility_time_seconds: values.agility_time_seconds ? parseFloat(values.agility_time_seconds) : null,
        notes: values.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rugby-specific-tests", categoryId] });
      toast.success("Test ajouté");
      form.reset();
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un test spécifique rugby</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="player_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Joueur</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un joueur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {players?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="test_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date du test</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="test_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de test</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TEST_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Yo-Yo specific fields */}
            {testType?.includes("yo_yo") && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="yo_yo_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niveau atteint</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Niveau" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {YO_YO_LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yo_yo_distance_m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance (m)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Bronco specific field */}
            {testType === "bronco" && (
              <FormField
                control={form.control}
                name="bronco_time_seconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temps (secondes)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="280.50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Agility tests specific field */}
            {(testType === "5_10_5" || testType === "t_test") && (
              <FormField
                control={form.control}
                name="agility_time_seconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temps (secondes)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="4.85" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes additionnelles..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
