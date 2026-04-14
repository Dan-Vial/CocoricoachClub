import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPositionsForSport } from "@/lib/constants/sportPositions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, FileSpreadsheet, Users, Star, Clock, MapPin, Trash2, Edit, Send, Check } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MatchSheetsSectionProps {
  categoryId: string;
  preSelectedMatchId?: string;
}

export function MatchSheetsSection({ categoryId, preSelectedMatchId }: MatchSheetsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<any>(null);
  const [name, setName] = useState("");
  const [sheetDate, setSheetDate] = useState(new Date().toISOString().split("T")[0]);
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [notes, setNotes] = useState("");
  const [matchId, setMatchId] = useState<string>(preSelectedMatchId || "");
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, {
    selected: boolean;
    isStarter: boolean;
    isCaptain: boolean;
    jerseyNumber: number;
    position: string;
  }>>({});
  
  const queryClient = useQueryClient();

  // Fetch category sport type
  const { data: categoryData } = useQuery({
    queryKey: ["category-sport-matchsheet", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const sportType = categoryData?.rugby_type || "XV";
  const sportPositions = getPositionsForSport(sportType);

  // Fetch match sheets
  const { data: matchSheets, isLoading } = useQuery({
    queryKey: ["match_sheets", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_sheets")
        .select("*, match_sheet_players(*, players(name, position))")
        .eq("category_id", categoryId)
        .order("sheet_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch upcoming matches
  const { data: matches } = useQuery({
    queryKey: ["upcoming_matches", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("category_id", categoryId)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setName("");
    setSheetDate(new Date().toISOString().split("T")[0]);
    setOpponent("");
    setLocation("");
    setMatchTime("");
    setNotes("");
    setMatchId("");
    setSelectedPlayers({});
    setEditingSheet(null);
  };

  const openDialog = (sheet?: any) => {
    if (sheet) {
      setEditingSheet(sheet);
      setName(sheet.name);
      setSheetDate(sheet.sheet_date);
      setOpponent(sheet.opponent || "");
      setLocation(sheet.location || "");
      setMatchTime(sheet.match_time || "");
      setNotes(sheet.notes || "");
      setMatchId(sheet.match_id || "");
      
      // Initialize selected players from existing sheet
      const playersMap: Record<string, any> = {};
      sheet.match_sheet_players?.forEach((msp: any) => {
        playersMap[msp.player_id] = {
          selected: true,
          isStarter: msp.is_starter,
          isCaptain: msp.is_captain,
          jerseyNumber: msp.jersey_number || 0,
          position: msp.position || "",
        };
      });
      setSelectedPlayers(playersMap);
    } else {
      resetForm();
      // Initialize with all players deselected
      const playersMap: Record<string, any> = {};
      players?.forEach((p) => {
        playersMap[p.id] = {
          selected: false,
          isStarter: true,
          isCaptain: false,
          jerseyNumber: 0,
          position: p.position || "",
        };
      });
      setSelectedPlayers(playersMap);
    }
    setIsDialogOpen(true);
  };

  const saveMatchSheet = useMutation({
    mutationFn: async () => {
      // Validation: match is required
      if (!matchId) {
        throw new Error("Veuillez sélectionner un match");
      }

      const sheetData = {
        category_id: categoryId,
        name,
        sheet_date: sheetDate,
        opponent: opponent || null,
        location: location || null,
        match_time: matchTime || null,
        notes: notes || null,
        match_id: matchId,
        status: editingSheet?.status || "draft",
      };

      let sheetId: string;

      if (editingSheet) {
        const { error } = await supabase
          .from("match_sheets")
          .update(sheetData)
          .eq("id", editingSheet.id);
        if (error) throw error;
        sheetId = editingSheet.id;

        // Delete existing players from match sheet
        await supabase
          .from("match_sheet_players")
          .delete()
          .eq("match_sheet_id", sheetId);
      } else {
        const { data, error } = await supabase
          .from("match_sheets")
          .insert(sheetData)
          .select()
          .single();
        if (error) throw error;
        sheetId = data.id;
      }

      // Insert selected players to match_sheet_players
      const playersToInsert = Object.entries(selectedPlayers)
        .filter(([_, data]) => data.selected)
        .map(([playerId, data], index) => ({
          match_sheet_id: sheetId,
          player_id: playerId,
          is_starter: data.isStarter,
          is_captain: data.isCaptain,
          jersey_number: data.jerseyNumber || null,
          position: data.position || null,
          order_index: index,
        }));

      if (playersToInsert.length > 0) {
        const { error: playersError } = await supabase
          .from("match_sheet_players")
          .insert(playersToInsert);
        if (playersError) throw playersError;
      }

      // SYNC: Also update match_lineups for the linked match
      if (matchId) {
        // Delete existing lineup for this match
        await supabase
          .from("match_lineups")
          .delete()
          .eq("match_id", matchId);

        // Insert lineup from the match sheet players
        const lineupToInsert = Object.entries(selectedPlayers)
          .filter(([_, data]) => data.selected)
          .map(([playerId, data]) => ({
            match_id: matchId,
            player_id: playerId,
            position: data.position || null,
            is_starter: data.isStarter,
          }));

        if (lineupToInsert.length > 0) {
          const { error: lineupError } = await supabase
            .from("match_lineups")
            .insert(lineupToInsert);
          if (lineupError) throw lineupError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match_sheets"] });
      queryClient.invalidateQueries({ queryKey: ["match_lineup", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success(editingSheet ? "Feuille de match mise à jour" : "Feuille de match créée");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const deleteMatchSheet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("match_sheets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match_sheets"] });
      toast.success("Feuille de match supprimée");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("match_sheets")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match_sheets"] });
      toast.success("Statut mis à jour");
    },
  });

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers({
      ...selectedPlayers,
      [playerId]: {
        ...selectedPlayers[playerId],
        selected: !selectedPlayers[playerId]?.selected,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Brouillon</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-700">Envoyée</Badge>;
      case "confirmed":
        return <Badge className="bg-green-100 text-green-700">Confirmée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const selectedCount = Object.values(selectedPlayers).filter((p) => p.selected).length;
  const startersCount = Object.values(selectedPlayers).filter((p) => p.selected && p.isStarter).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Feuilles de Match
        </h3>
        <p className="text-sm text-muted-foreground">
          Créez et gérez les compositions d'équipe pour les matchs
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Chargement...
          </CardContent>
        </Card>
      ) : matchSheets && matchSheets.length > 0 ? (
        <div className="grid gap-4">
          {matchSheets.map((sheet) => (
            <Card key={sheet.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{sheet.name}</h4>
                      {getStatusBadge(sheet.status)}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(sheet.sheet_date), "dd/MM/yyyy", { locale: fr })}
                        {sheet.match_time && ` à ${sheet.match_time.slice(0, 5)}`}
                      </span>
                      {sheet.opponent && (
                        <span>vs {sheet.opponent}</span>
                      )}
                      {sheet.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {sheet.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {sheet.match_sheet_players?.length || 0} joueurs
                      </Badge>
                      <Badge variant="outline">
                        {sheet.match_sheet_players?.filter((p: any) => p.is_starter).length || 0} titulaires
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {sheet.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: sheet.id, status: "sent" })}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Envoyer
                      </Button>
                    )}
                    {sheet.status === "sent" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: sheet.id, status: "confirmed" })}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Confirmer
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(sheet)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteMatchSheet.mutate(sheet.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune feuille de match créée</p>
            <Button className="mt-4" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une feuille
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border-0 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] rounded-2xl p-0 gap-0 bg-card">
          {/* Premium Header with colored accent */}
          <div className="relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.3),transparent_60%)]" />
            <div className="relative z-10 px-8 pt-4 pb-6">
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-primary-foreground">
                  {editingSheet ? "Modifier la feuille de match" : "Nouvelle feuille de match"}
                </DialogTitle>
                <p className="text-sm text-primary-foreground/70 mt-0.5">
                  Composez votre équipe et préparez le match
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-secondary/30">
            {/* Section: Informations */}
            <div className="space-y-4 bg-card rounded-xl p-5 border border-border/30 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-widest text-primary/70">Informations du match</h4>
              </div>
              <div className="space-y-2">
                <Label className="font-medium text-sm">Nom de la feuille *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Match J5 vs Racing"
                  className="bg-muted/50 border-border/50 h-11 rounded-xl transition-all duration-200 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] focus:border-primary/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-sm">Date du match</Label>
                  <Input
                    type="date"
                    value={sheetDate}
                    onChange={(e) => setSheetDate(e.target.value)}
                    className="bg-muted/50 border-border/50 h-11 rounded-xl transition-all duration-200 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] focus:border-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium text-sm">Heure</Label>
                  <Input
                    type="time"
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    className="bg-muted/50 border-border/50 h-11 rounded-xl transition-all duration-200 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] focus:border-primary/40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-sm">Adversaire</Label>
                  <Input
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    placeholder="Nom de l'équipe adverse"
                    className="bg-muted/50 border-border/50 h-11 rounded-xl transition-all duration-200 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] focus:border-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium text-sm">Lieu</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Stade / Complexe"
                    className="bg-muted/50 border-border/50 h-11 rounded-xl transition-all duration-200 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] focus:border-primary/40"
                  />
                </div>
              </div>
            </div>

            {/* Section: Lien match */}
            <div className="space-y-4 bg-card rounded-xl p-5 border border-border/30 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                <h4 className="text-xs font-semibold uppercase tracking-widest text-accent">Match associé</h4>
              </div>
              <div className="space-y-2">
                <Label className="font-medium text-sm flex items-center gap-1">
                  Lier à un match existant <span className="text-destructive">*</span>
                </Label>
                {matches && matches.length > 0 ? (
                  <Select value={matchId} onValueChange={(value) => {
                    setMatchId(value);
                    const selectedMatch = matches.find(m => m.id === value);
                    if (selectedMatch) {
                      if (!opponent) setOpponent(selectedMatch.opponent || "");
                      if (!sheetDate || sheetDate === new Date().toISOString().split("T")[0]) {
                        setSheetDate(selectedMatch.match_date);
                      }
                      if (!matchTime && selectedMatch.match_time) {
                        setMatchTime(selectedMatch.match_time);
                      }
                      if (!location && selectedMatch.location) {
                        setLocation(selectedMatch.location);
                      }
                      if (!name) {
                        setName(`Feuille - ${selectedMatch.opponent} (${format(new Date(selectedMatch.match_date), "dd/MM")})`);
                      }
                    }
                  }}>
                    <SelectTrigger className={`h-11 rounded-xl bg-muted/50 border-border/50 transition-all duration-200 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--accent)/0.15)] focus:border-accent/40 ${!matchId ? "border-destructive/50" : ""}`}>
                      <SelectValue placeholder="Sélectionner un match" />
                    </SelectTrigger>
                    <SelectContent>
                      {matches.map((match) => (
                        <SelectItem key={match.id} value={match.id}>
                          {format(new Date(match.match_date), "dd/MM")} - {match.opponent}
                          {match.location && ` (${match.location})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground italic p-4 border border-dashed border-border/60 rounded-xl bg-muted/30">
                    Aucun match programmé. Créez d'abord un match dans le calendrier global.
                  </p>
                )}
              </div>
            </div>

            {/* Section: Notes */}
            <div className="space-y-4 bg-card rounded-xl p-5 border border-border/30 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notes & consignes</h4>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions, consignes..."
                rows={2}
                className="bg-muted/50 border-border/50 rounded-xl transition-all duration-200 focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] focus:border-primary/40 resize-none"
              />
            </div>

            {/* Section: Joueurs */}
            <div className="space-y-4 bg-card rounded-xl p-5 border border-border/30 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-primary/70">Sélection des joueurs</h4>
                </div>
                <div className="flex gap-2">
                  <Badge className="rounded-lg font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">{selectedCount} sélectionnés</Badge>
                  <Badge className="rounded-lg font-medium bg-accent/10 text-accent border-accent/20 hover:bg-accent/15">{startersCount} titulaires</Badge>
                </div>
              </div>
              <div className="border border-border/30 rounded-xl overflow-hidden bg-background shadow-sm">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5 hover:bg-primary/5 border-b border-border/30">
                        <TableHead className="w-12 h-10 text-xs font-semibold uppercase tracking-wider text-primary/60"></TableHead>
                        <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-primary/60">Joueur</TableHead>
                        <TableHead className="w-20 h-10 text-xs font-semibold uppercase tracking-wider text-primary/60">N°</TableHead>
                        <TableHead className="min-w-[140px] h-10 text-xs font-semibold uppercase tracking-wider text-primary/60">Poste</TableHead>
                        <TableHead className="w-24 text-center h-10 text-xs font-semibold uppercase tracking-wider text-primary/60">Titulaire</TableHead>
                        <TableHead className="w-24 text-center h-10 text-xs font-semibold uppercase tracking-wider text-primary/60">Capitaine</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players?.map((player, index) => {
                        const playerData = selectedPlayers[player.id] || {
                          selected: false,
                          isStarter: true,
                          isCaptain: false,
                          jerseyNumber: 0,
                          position: player.position || "",
                        };
                        
                        return (
                          <TableRow 
                            key={player.id}
                            className={`transition-colors duration-150 border-b border-border/20 ${
                              playerData.selected 
                                ? "bg-primary/5 hover:bg-primary/10" 
                                : index % 2 === 0 ? "bg-transparent hover:bg-muted/30" : "bg-muted/15 hover:bg-muted/30"
                            }`}
                          >
                            <TableCell className="py-2.5">
                              <Checkbox
                                checked={playerData.selected}
                                onCheckedChange={() => togglePlayer(player.id)}
                                className="transition-all duration-150"
                              />
                            </TableCell>
                            <TableCell className="font-medium py-2.5">
                              <span className="flex items-center gap-1.5">
                                {player.name}
                                {playerData.isCaptain && (
                                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 drop-shadow-sm" />
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <Input
                                type="number"
                                className="w-16 h-8 rounded-lg bg-muted/40 border-border/40 text-center transition-all duration-150 focus:bg-background focus:shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]"
                                value={playerData.jerseyNumber || ""}
                                onChange={(e) => setSelectedPlayers({
                                  ...selectedPlayers,
                                  [player.id]: {
                                    ...playerData,
                                    jerseyNumber: parseInt(e.target.value) || 0,
                                  },
                                })}
                                disabled={!playerData.selected}
                              />
                            </TableCell>
                            <TableCell className="py-2.5">
                              {sportPositions.length > 0 ? (
                                <Select
                                  value={playerData.position || ""}
                                  onValueChange={(value) => setSelectedPlayers({
                                    ...selectedPlayers,
                                    [player.id]: {
                                      ...playerData,
                                      position: value,
                                    },
                                  })}
                                  disabled={!playerData.selected}
                                >
                                  <SelectTrigger className="h-8 text-xs w-full min-w-[140px] rounded-lg bg-muted/40 border-border/40 transition-all duration-150 focus:bg-background">
                                    <SelectValue placeholder={player.position || "Poste"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sportPositions.map((pos) => (
                                      <SelectItem key={pos.id} value={pos.name}>
                                        {pos.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  className="h-8 text-xs w-full rounded-lg bg-muted/40 border-border/40 transition-all duration-150 focus:bg-background"
                                  value={playerData.position}
                                  onChange={(e) => setSelectedPlayers({
                                    ...selectedPlayers,
                                    [player.id]: {
                                      ...playerData,
                                      position: e.target.value,
                                    },
                                  })}
                                  placeholder={player.position || ""}
                                  disabled={!playerData.selected}
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-center py-2.5">
                              <Checkbox
                                checked={playerData.isStarter}
                                onCheckedChange={(checked) => setSelectedPlayers({
                                  ...selectedPlayers,
                                  [player.id]: {
                                    ...playerData,
                                    isStarter: !!checked,
                                  },
                                })}
                                disabled={!playerData.selected}
                                className="transition-all duration-150"
                              />
                            </TableCell>
                            <TableCell className="text-center py-2.5">
                              <Checkbox
                                checked={playerData.isCaptain}
                                onCheckedChange={(checked) => {
                                  const updated = { ...selectedPlayers };
                                  Object.keys(updated).forEach((id) => {
                                    updated[id] = { ...updated[id], isCaptain: false };
                                  });
                                  updated[player.id] = { ...playerData, isCaptain: !!checked };
                                  setSelectedPlayers(updated);
                                }}
                                disabled={!playerData.selected}
                                className="transition-all duration-150"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Premium Footer */}
          <div className="px-8 py-5 border-t border-border/30 bg-card flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {selectedCount > 0 && `${selectedCount} joueur${selectedCount > 1 ? 's' : ''} sélectionné${selectedCount > 1 ? 's' : ''}`}
            </p>
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl px-6 h-11 font-medium hover:bg-muted/60 transition-all duration-200"
              >
                Annuler
              </Button>
              <Button 
                onClick={() => saveMatchSheet.mutate()}
                disabled={!name || saveMatchSheet.isPending}
                className="rounded-xl px-8 h-11 font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-primary to-primary/85"
              >
                {editingSheet ? "Mettre à jour" : "Créer la feuille"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
