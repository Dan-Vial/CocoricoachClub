import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trophy, Star } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface PlayerCapsSectionProps {
  categoryId: string;
}

const COMPETITIONS = [
  "Test Match",
  "Tournoi des 6 Nations",
  "Coupe du Monde",
  "Autumn Nations Series",
  "Tournée d'été",
  "Autre",
];

export function PlayerCapsSection({ categoryId }: PlayerCapsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [capDate, setCapDate] = useState("");
  const [capNumber, setCapNumber] = useState("");
  const [opponent, setOpponent] = useState("");
  const [competition, setCompetition] = useState("");
  const [wasStarter, setWasStarter] = useState(true);
  const [minutesPlayed, setMinutesPlayed] = useState("");
  const [tries, setTries] = useState("");
  const [points, setPoints] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, club_origin")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: caps, isLoading } = useQuery({
    queryKey: ["player_caps", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_caps")
        .select("*, players(name, club_origin)")
        .eq("category_id", categoryId)
        .order("cap_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addCap = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_caps").insert({
        player_id: selectedPlayer,
        category_id: categoryId,
        cap_date: capDate,
        cap_number: capNumber ? parseInt(capNumber) : null,
        opponent: opponent || null,
        competition: competition || null,
        was_starter: wasStarter,
        minutes_played: minutesPlayed ? parseInt(minutesPlayed) : null,
        tries: tries ? parseInt(tries) : 0,
        points: points ? parseInt(points) : 0,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_caps", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["player_caps_stats", categoryId] });
      toast.success("Sélection ajoutée avec succès");
      resetForm();
      setIsAddOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la sélection");
    },
  });

  const resetForm = () => {
    setSelectedPlayer("");
    setCapDate("");
    setCapNumber("");
    setOpponent("");
    setCompetition("");
    setWasStarter(true);
    setMinutesPlayed("");
    setTries("");
    setPoints("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlayer && capDate) {
      addCap.mutate();
    }
  };

  // Group caps by player
  const capsByPlayer = caps?.reduce((acc, cap) => {
    const playerId = cap.player_id;
    if (!acc[playerId]) {
      acc[playerId] = {
        player: cap.players,
        caps: [],
        totalCaps: 0,
        totalTries: 0,
        totalPoints: 0,
      };
    }
    acc[playerId].caps.push(cap);
    acc[playerId].totalCaps++;
    acc[playerId].totalTries += cap.tries || 0;
    acc[playerId].totalPoints += cap.points || 0;
    return acc;
  }, {} as Record<string, any>) || {};

  const sortedPlayers = Object.entries(capsByPlayer)
    .sort(([, a], [, b]) => b.totalCaps - a.totalCaps);

  if (isLoading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sélections des joueurs</h3>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une sélection
        </Button>
      </div>

      {/* Players with caps */}
      {sortedPlayers.length > 0 ? (
        <div className="grid gap-4">
          {sortedPlayers.map(([playerId, data]) => (
            <Card key={playerId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    {data.player?.name}
                    {data.player?.club_origin && (
                      <span className="text-sm text-muted-foreground font-normal">
                        ({data.player.club_origin})
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-bold">{data.totalCaps} sél.</span>
                    {data.totalTries > 0 && (
                      <span>{data.totalTries} essais</span>
                    )}
                    {data.totalPoints > 0 && (
                      <span>{data.totalPoints} pts</span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Compétition</TableHead>
                      <TableHead>Adversaire</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Minutes</TableHead>
                      <TableHead className="text-right">Essais</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.caps.slice(0, 5).map((cap: any) => (
                      <TableRow key={cap.id}>
                        <TableCell>
                          {format(new Date(cap.cap_date), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>{cap.competition || "-"}</TableCell>
                        <TableCell>{cap.opponent || "-"}</TableCell>
                        <TableCell>
                          {cap.was_starter ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <Star className="h-3 w-3" /> Titulaire
                            </span>
                          ) : (
                            "Remplaçant"
                          )}
                        </TableCell>
                        <TableCell className="text-right">{cap.minutes_played || "-"}</TableCell>
                        <TableCell className="text-right">{cap.tries || 0}</TableCell>
                        <TableCell className="text-right">{cap.points || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.caps.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    + {data.caps.length - 5} autres sélections
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune sélection enregistrée. Ajoutez les sélections internationales de vos joueurs.
          </CardContent>
        </Card>
      )}

      {/* Add Cap Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter une sélection</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Joueur *</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un joueur" />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                        {player.club_origin && ` (${player.club_origin})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capDate">Date de la sélection *</Label>
                  <Input
                    id="capDate"
                    type="date"
                    value={capDate}
                    onChange={(e) => setCapDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capNumber">Numéro de sélection</Label>
                  <Input
                    id="capNumber"
                    type="number"
                    value={capNumber}
                    onChange={(e) => setCapNumber(e.target.value)}
                    placeholder="Ex: 15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Compétition</Label>
                <Select value={competition} onValueChange={setCompetition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une compétition" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPETITIONS.map((comp) => (
                      <SelectItem key={comp} value={comp}>
                        {comp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opponent">Adversaire</Label>
                <Input
                  id="opponent"
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  placeholder="Ex: Angleterre"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="wasStarter">Titulaire</Label>
                <Switch
                  id="wasStarter"
                  checked={wasStarter}
                  onCheckedChange={setWasStarter}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minutesPlayed">Minutes jouées</Label>
                  <Input
                    id="minutesPlayed"
                    type="number"
                    value={minutesPlayed}
                    onChange={(e) => setMinutesPlayed(e.target.value)}
                    placeholder="80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tries">Essais</Label>
                  <Input
                    id="tries"
                    type="number"
                    value={tries}
                    onChange={(e) => setTries(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarques sur la performance..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={!selectedPlayer || !capDate || addCap.isPending}>
                {addCap.isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
