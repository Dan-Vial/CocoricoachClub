import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Filter, Eye, Copy, Check, Mail, RefreshCw, FileSpreadsheet, Link2, Info, ClipboardCopy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { AddPlayerDialogWithInvite } from "./AddPlayerDialogWithInvite";
import { BulkAddPlayersDialog } from "./BulkAddPlayersDialog";
import { LinkExistingPlayerDialog } from "./LinkExistingPlayerDialog";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { useViewerPlayers } from "@/hooks/use-viewer-data";
import { getDisciplineLabel, getSpecialtyLabel } from "@/lib/constants/athleticProfiles";
import { isAthletismeCategory, isJudoCategory, isIndividualSport, isSkiCategory, isSurfCategory, isTriathlonCategory, isNatationCategory, ATHLETISME_SPECIALTIES, NATATION_SPECIALTIES } from "@/lib/constants/sportTypes";
import { getPositionsForSport } from "@/lib/constants/sportPositions";
import { getInvitationStatus } from "@/hooks/useResendInvitation";

import { AVIRON_ROLES } from "@/lib/constants/sportTypes";

function getAvironRoleLabel(role: string | null): string {
  if (!role) return "";
  const found = AVIRON_ROLES.find(r => r.value === role);
  return found ? found.label : role;
}

function PlayerInfoHover({ player, isSki }: { player: any; isSki: boolean }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    birth_date: player.birth_date || "",
    email: player.email || "",
    phone: player.phone || "",
    fis_code: player.fis_code || "",
  });
  const queryClient = useQueryClient();

  const infoLines: { label: string; value: string }[] = [];
  
  const fullName = player.first_name ? `${player.first_name} ${player.name}` : player.name;
  infoLines.push({ label: "Nom", value: fullName });

  if (player.birth_date) {
    infoLines.push({ label: "Date de naissance", value: format(new Date(player.birth_date), "dd/MM/yyyy") });
  }
  if (player.email) {
    infoLines.push({ label: "Email", value: player.email });
  }
  if (player.phone) {
    infoLines.push({ label: "Téléphone", value: player.phone });
  }
  if (isSki && player.fis_code) {
    infoLines.push({ label: "Code FIS", value: player.fis_code });
  }
  if (isSki && player.fis_points != null && player.fis_points > 0) {
    infoLines.push({ label: "Points FIS", value: String(player.fis_points) });
  }
  if (isSki && player.fis_ranking != null) {
    infoLines.push({ label: "Classement FIS", value: String(player.fis_ranking) });
  }
  if (player.position) {
    infoLines.push({ label: "Poste", value: player.position });
  }
  if (player.discipline) {
    infoLines.push({ label: "Discipline", value: getDisciplineLabel(player.discipline) });
  }

  const copyAll = () => {
    const text = infoLines.map(l => `${l.label}: ${l.value}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Informations copiées !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = async () => {
    const updates: Record<string, unknown> = {};
    if (editData.birth_date) updates.birth_date = editData.birth_date;
    if (editData.email !== player.email) updates.email = editData.email || null;
    if (editData.phone !== player.phone) updates.phone = editData.phone || null;
    if (isSki && editData.fis_code !== player.fis_code) updates.fis_code = editData.fis_code || null;

    if (Object.keys(updates).length === 0) {
      setEditing(false);
      return;
    }

    const { error } = await supabase.from("players").update(updates).eq("id", player.id);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success("Informations mises à jour");
    queryClient.invalidateQueries({ queryKey: ["players"] });
    setEditing(false);
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Infos athlète</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => {
                setEditData({
                  birth_date: player.birth_date || "",
                  email: player.email || "",
                  phone: player.phone || "",
                  fis_code: player.fis_code || "",
                });
                setEditing(!editing);
              }}>
                {editing ? "Annuler" : "Modifier"}
              </Button>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={copyAll}>
                {copied ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
          </div>
          
          {editing ? (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Date de naissance</Label>
                <Input type="date" value={editData.birth_date} onChange={(e) => setEditData({...editData, birth_date: e.target.value})} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} className="h-8 text-xs" placeholder="email@exemple.com" />
              </div>
              <div>
                <Label className="text-xs">Téléphone</Label>
                <Input value={editData.phone} onChange={(e) => setEditData({...editData, phone: e.target.value})} className="h-8 text-xs" placeholder="+33..." />
              </div>
              {isSki && (
                <div>
                  <Label className="text-xs">Code FIS</Label>
                  <Input value={editData.fis_code} onChange={(e) => setEditData({...editData, fis_code: e.target.value})} className="h-8 text-xs" placeholder="FIS Code" />
                </div>
              )}
              <Button size="sm" className="w-full h-8 text-xs" onClick={handleSaveEdit}>Enregistrer</Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {infoLines.map((line) => (
                <div key={line.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="font-medium text-right max-w-[160px] truncate">{line.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface PlayersTabProps {
  categoryId: string;
}

export function PlayersTab({ categoryId }: PlayersTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isViewer } = useViewerModeContext();

  const { data: players, isLoading } = useViewerPlayers(categoryId);

  // Fetch all athlete invitations for this category
  const { data: invitations } = useQuery({
    queryKey: ["athlete-invitations-list", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_invitations")
        .select("id, player_id, token, status, expires_at")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Group invitations by player_id (latest first)
  const invitationsByPlayer = useMemo(() => {
    const map = new Map<string, typeof invitations extends (infer T)[] | null ? T : never>();
    invitations?.forEach((inv) => {
      if (!map.has(inv.player_id)) {
        map.set(inv.player_id, inv);
      }
    });
    return map;
  }, [invitations]);

  // Fetch category to check sport type
  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const sportType = category?.rugby_type || "XV";
  const isAthletics = isAthletismeCategory(sportType);
  const isJudo = isJudoCategory(sportType);
  const isSki = isSkiCategory(sportType);
  const isSurf = isSurfCategory(sportType);
  const isTriathlon = isTriathlonCategory(sportType);
  const isNatation = isNatationCategory(sportType);
  const isAviron = sportType.toLowerCase().includes("aviron");
  const isIndividual = isIndividualSport(sportType);
  
  // Determine which attribute column to show
  const showDiscipline = isAthletics || isJudo || isSki || isSurf || isTriathlon || isNatation;
  const showRole = isAviron;
  const showPosition = !isIndividual && !showDiscipline && !showRole;
  
  const attributeColumnLabel = isJudo 
    ? "Catégorie" 
    : showDiscipline
      ? "Discipline"
      : isAviron 
        ? "Rôle" 
        : "Poste";

  // Get positions for the sport (for dropdown display)
  const positions = useMemo(() => getPositionsForSport(sportType), [sportType]);
  const uniquePositionNames = useMemo(() => {
    const names = new Set(positions.map(p => p.name));
    return Array.from(names);
  }, [positions]);

  // Get unique disciplines/positions from players for filtering
  const availableFilters = useMemo(() => {
    if (!players) return [];
    if (showDiscipline) {
      const disciplines = new Set(
        players
          .map((p: any) => p.discipline)
          .filter((d: string | null) => d && d.length > 0)
      );
      return Array.from(disciplines) as string[];
    }
    if (showPosition) {
      const positions = new Set(
        players
          .map((p: any) => p.position)
          .filter((p: string | null) => p && p.length > 0)
      );
      return Array.from(positions) as string[];
    }
    return [];
  }, [players, showDiscipline, showPosition]);

  // Filter players
  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    if (disciplineFilter === "all") return players;
    if (showDiscipline) {
      return players.filter((p: any) => p.discipline === disciplineFilter);
    }
    if (showPosition) {
      return players.filter((p: any) => p.position === disciplineFilter);
    }
    return players;
  }, [players, disciplineFilter, showDiscipline, showPosition]);

  const deletePlayer = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase.from("players").delete().eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players", categoryId] });
      toast.success("Athlète supprimé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de l'athlète");
    },
  });

  // Mutation pour mettre à jour la spécialité
  const updateSpecialty = useMutation({
    mutationFn: async ({ playerId, specialty }: { playerId: string; specialty: string }) => {
      const { error } = await supabase
        .from("players")
        .update({ specialty })
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players", categoryId] });
      toast.success("Spécialité mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  // Get display value for the attribute column
  const getAttributeDisplay = (player: any) => {
    if (showDiscipline) {
      if (!player.discipline) {
        return <span className="text-muted-foreground text-sm">—</span>;
      }
      // For athletics, show discipline + specialty (with inline edit)
      const disciplineLabel = getDisciplineLabel(player.discipline);
      const specialtyLabel = player.specialty ? getSpecialtyLabel(player.specialty) : null;
      const availableSpecialties = isAthletics && player.discipline 
        ? ATHLETISME_SPECIALTIES[player.discipline] || [] 
        : isNatation && player.discipline 
          ? NATATION_SPECIALTIES[player.discipline] || []
          : [];
      
      return (
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="bg-primary/5">
            {disciplineLabel}
          </Badge>
          {(isAthletics || isNatation) && availableSpecialties.length > 0 && !isViewer ? (
            <Select 
              value={player.specialty || ""} 
              onValueChange={(val) => {
                updateSpecialty.mutate({ playerId: player.id, specialty: val });
              }}
            >
              <SelectTrigger 
                className="h-6 w-auto min-w-[80px] px-2 text-xs border-dashed"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue placeholder="+ Spécialité" />
              </SelectTrigger>
              <SelectContent onClick={(e) => e.stopPropagation()}>
                {availableSpecialties.map((spec) => (
                  <SelectItem key={spec.value} value={spec.value}>
                    {spec.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : specialtyLabel ? (
            <Badge variant="secondary" className="font-normal">
              {specialtyLabel}
            </Badge>
          ) : null}
        </div>
      );
    }
    if (showRole) {
      return player.position ? (
        <Badge variant="outline" className="bg-accent text-accent-foreground">
          {getAvironRoleLabel(player.position)}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    }
    if (showPosition) {
      return player.position ? (
        <Badge variant="secondary" className="font-normal">
          {player.position}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    }
    return null;
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  const hasAttributeColumn = showDiscipline || showPosition || showRole;
  const filterPlaceholder = showDiscipline 
    ? (isJudo ? "Filtrer par catégorie" : "Filtrer par discipline")
    : "Filtrer par poste";

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle>Liste des athlètes</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {hasAttributeColumn && availableFilters.length > 0 && (
              <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={filterPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {showDiscipline 
                      ? (isJudo ? "Toutes les catégories" : "Toutes les disciplines")
                      : "Tous les postes"}
                  </SelectItem>
                  {availableFilters.map((filter) => (
                    <SelectItem key={filter} value={filter}>
                      {showDiscipline ? getDisciplineLabel(filter) : filter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!isViewer && (
              <>
                <Button onClick={() => setIsLinkDialogOpen(true)} variant="outline" className="gap-2 whitespace-nowrap">
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Rattacher</span>
                </Button>
                <Button onClick={() => setIsBulkDialogOpen(true)} variant="outline" className="gap-2 whitespace-nowrap">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden sm:inline">Import Excel</span>
                </Button>
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Ajouter un athlète</span>
                  <span className="sm:hidden">Ajouter</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPlayers && filteredPlayers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {disciplineFilter !== "all" 
                ? (showDiscipline 
                    ? (isJudo ? "Aucun athlète dans cette catégorie de poids" : "Aucun athlète dans cette discipline")
                    : "Aucun athlète à ce poste")
                : "Aucun athlète dans cette catégorie"}
            </p>
            {!isViewer && disciplineFilter === "all" && (
              <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter le premier athlète
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                {hasAttributeColumn && <TableHead>{attributeColumnLabel}</TableHead>}
                {!isViewer && <TableHead>Inscription</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers?.map((player: any) => {
                const fullName = player.first_name 
                  ? `${player.first_name} ${player.name}` 
                  : player.name;
                const initials = fullName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <TableRow 
                    key={player.id} 
                    className="animate-fade-in cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/players/${player.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player.avatar_url || undefined} alt={fullName} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{fullName}</span>
                        <PlayerInfoHover player={player} isSki={isSki} />
                      </div>
                    </TableCell>
                    {hasAttributeColumn && (
                      <TableCell>
                        {getAttributeDisplay(player)}
                      </TableCell>
                    )}
                    {!isViewer && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          if (player.user_id) {
                            return (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 gap-1">
                                <Check className="h-3 w-3" />
                                Connecté
                              </Badge>
                            );
                          }
                          const inv = invitationsByPlayer.get(player.id);
                          if (!inv) {
                            return (
                              <span className="text-xs text-muted-foreground">—</span>
                            );
                          }
                          const status = getInvitationStatus(inv.status, inv.expires_at);
                          const link = `${window.location.origin}/accept-athlete-invitation?token=${inv.token}`;
                          return (
                            <TooltipProvider>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className={
                                  status === "expired" 
                                    ? "text-destructive border-destructive/30" 
                                    : "text-amber-600 border-amber-300 dark:text-amber-400"
                                }>
                                  {status === "expired" ? "Expiré" : "En attente"}
                                </Badge>
                                {status === "pending" && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => {
                                          navigator.clipboard.writeText(link);
                                          setCopiedInviteId(inv.id);
                                          toast.success("Lien d'inscription copié !");
                                          setTimeout(() => setCopiedInviteId(null), 2000);
                                        }}
                                      >
                                        {copiedInviteId === inv.id ? (
                                          <Check className="h-3.5 w-3.5 text-green-600" />
                                        ) : (
                                          <Copy className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copier le lien d'inscription</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TooltipProvider>
                          );
                        })()}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!isViewer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Êtes-vous sûr de vouloir supprimer l'athlète ${fullName} ?`)) {
                                deletePlayer.mutate(player.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/players/${player.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Voir le profil complet</span>
                          <span className="sm:hidden">Profil</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AddPlayerDialogWithInvite
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categoryId={categoryId}
      />
      <BulkAddPlayersDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        categoryId={categoryId}
      />
      <LinkExistingPlayerDialog
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        categoryId={categoryId}
      />
    </Card>
  );
}