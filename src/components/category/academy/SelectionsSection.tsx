import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Award } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface SelectionsSectionProps {
  categoryId: string;
  players: { id: string; name: string; first_name?: string | null }[] | undefined;
}

const SELECTION_TYPES = [
  { value: "regional", label: "Équipe régionale" },
  { value: "france_u16", label: "France U16" },
  { value: "france_u17", label: "France U17" },
  { value: "france_u18", label: "France U18" },
  { value: "france_u19", label: "France U19" },
  { value: "france_u20", label: "France U20" },
  { value: "barbarians", label: "Barbarians" },
  { value: "other", label: "Autre" },
];

export function SelectionsSection({ categoryId, players }: SelectionsSectionProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectionType, setSelectionType] = useState("");
  const [selectionDate, setSelectionDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [competitionName, setCompetitionName] = useState("");
  const [notes, setNotes] = useState("");

  const { data: selections } = useQuery({
    queryKey: ["player_selections", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_selections")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("selection_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addSelection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_selections").insert({
        player_id: selectedPlayer,
        category_id: categoryId,
        selection_type: selectionType,
        selection_date: selectionDate || new Date().toISOString().split("T")[0],
        end_date: endDate || null,
        competition_name: competitionName || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_selections", categoryId] });
      toast.success("Sélection ajoutée");
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const deleteSelection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("player_selections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_selections", categoryId] });
      toast.success("Sélection supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const resetForm = () => {
    setSelectedPlayer("");
    setSelectionType("");
    setSelectionDate("");
    setEndDate("");
    setCompetitionName("");
    setNotes("");
  };

  const getSelectionBadgeColor = (type: string) => {
    if (type.startsWith("france")) return "bg-blue-600";
    if (type === "regional") return "bg-amber-500";
    return "bg-gray-500";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Sélections Nationales
              </CardTitle>
              <CardDescription>Historique des sélections en équipes nationales et régionales</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle sélection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!selections || selections.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune sélection enregistrée.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joueur</TableHead>
                    <TableHead>Sélection</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Compétition</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selections.map((selection) => (
                    <TableRow key={selection.id}>
                      <TableCell className="font-medium">{selection.players?.name}</TableCell>
                      <TableCell>
                        <Badge className={`${getSelectionBadgeColor(selection.selection_type)} text-white`}>
                          {SELECTION_TYPES.find((t) => t.value === selection.selection_type)?.label || selection.selection_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(selection.selection_date), "dd MMM yyyy", { locale: fr })}
                        {selection.end_date && ` - ${format(new Date(selection.end_date), "dd MMM yyyy", { locale: fr })}`}
                      </TableCell>
                      <TableCell>{selection.competition_name || "-"}</TableCell>
                      <TableCell className="max-w-40 truncate">{selection.notes || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteSelection.mutate(selection.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une sélection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Joueur</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un joueur" /></SelectTrigger>
                <SelectContent>
                  {players?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name ? `${p.first_name} ${p.name}` : p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type de sélection</Label>
              <Select value={selectionType} onValueChange={setSelectionType}>
                <SelectTrigger><SelectValue placeholder="Sélectionner le type" /></SelectTrigger>
                <SelectContent>
                  {SELECTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date début</Label>
                <Input type="date" value={selectionDate} onChange={(e) => setSelectionDate(e.target.value)} />
              </div>
              <div>
                <Label>Date fin (optionnel)</Label>
                <Input type="date" value={endDate} min={selectionDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Compétition / Stage</Label>
              <Input value={competitionName} onChange={(e) => setCompetitionName(e.target.value)} placeholder="Six Nations U18, Stage Marcoussis..." />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Détails supplémentaires..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addSelection.mutate()} disabled={!selectedPlayer || !selectionType}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}