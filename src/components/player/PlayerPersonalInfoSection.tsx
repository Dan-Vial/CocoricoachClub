import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Edit2, Save, X, Phone, Mail, Calendar, MapPin, Mountain, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isSkiCategory } from "@/lib/constants/sportTypes";
import { scrapeFisResults, importFisResultsForPlayer } from "@/lib/fis/scrapeFisResults";

interface PlayerPersonalInfoSectionProps {
  playerId: string;
  categoryId: string;
  isViewer?: boolean;
  sportType?: string;
}

interface PlayerPersonalInfo {
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  club_origin: string | null;
  fis_code: string | null;
}

export function PlayerPersonalInfoSection({ playerId, categoryId, isViewer = false, sportType = "XV" }: PlayerPersonalInfoSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PlayerPersonalInfo>({
    email: null,
    phone: null,
    birth_date: null,
    club_origin: null,
    fis_code: null,
  });

  const isSki = isSkiCategory(sportType);

  const { data: playerInfo, isLoading } = useQuery({
    queryKey: ["player-personal-info", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select(`email, phone, birth_date, club_origin, fis_code, name`)
        .eq("id", playerId)
        .single();
      if (error) throw error;
      return data as PlayerPersonalInfo & { name: string };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PlayerPersonalInfo) => {
      const previousFisCode = playerInfo?.fis_code;
      const newFisCode = data.fis_code;

      // Save player data
      const { error } = await supabase
        .from("players")
        .update({
          email: data.email,
          phone: data.phone,
          birth_date: data.birth_date,
          club_origin: data.club_origin,
          fis_code: data.fis_code,
        })
        .eq("id", playerId);
      if (error) throw error;

      // If FIS code was added or changed, trigger FIS import
      if (isSki && newFisCode && newFisCode.trim() !== "" && newFisCode !== previousFisCode) {
        return { triggerFisImport: true, fisCode: newFisCode.trim() };
      }
      return { triggerFisImport: false };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["player-personal-info", playerId] });
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      toast.success("Fiche personnelle mise à jour");
      setIsEditing(false);

      if (result?.triggerFisImport && result.fisCode) {
        toast.info("Import FIS en cours...", { id: "fis-import" });
        try {
          // Determine sector code from sport type
          const sectorCode = sportType.toLowerCase().includes("snowboard") ? "SB" : "AL";
          const fisData = await scrapeFisResults(result.fisCode, sectorCode);
          if (fisData) {
            const count = await importFisResultsForPlayer(playerId, categoryId, fisData);
            
            // Update birth date from FIS if available and not already set
            if (fisData.birthDate && !formData.birth_date) {
              await supabase
                .from("players")
                .update({ birth_date: fisData.birthDate })
                .eq("id", playerId);
              queryClient.invalidateQueries({ queryKey: ["player-personal-info", playerId] });
            }

            toast.success(`${count} résultats FIS importés avec succès`, { id: "fis-import" });
            queryClient.invalidateQueries({ queryKey: ["fis-results", playerId] });
            queryClient.invalidateQueries({ queryKey: ["fis-competitions"] });
            queryClient.invalidateQueries({ queryKey: ["players", categoryId] });
          } else {
            toast.warning("Aucun résultat FIS trouvé pour ce code", { id: "fis-import" });
          }
        } catch (err) {
          console.error("FIS import error:", err);
          toast.error("Erreur lors de l'import FIS", { id: "fis-import" });
        }
      }
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const handleStartEdit = () => {
    if (playerInfo) {
      setFormData({
        email: playerInfo.email,
        phone: playerInfo.phone,
        birth_date: playerInfo.birth_date,
        club_origin: playerInfo.club_origin,
        fis_code: playerInfo.fis_code,
      });
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const hasInfo = playerInfo?.email || playerInfo?.phone || playerInfo?.birth_date || playerInfo?.club_origin || playerInfo?.fis_code;

  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5" />
          Fiche Personnelle
        </CardTitle>
        {!isViewer && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Enregistrer
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4 mr-1" />
                {hasInfo ? "Modifier" : "Ajouter"}
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="player_email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email de l'athlète
                </Label>
                <Input
                  id="player_email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                  placeholder="athlete@exemple.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player_phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone de l'athlète
                </Label>
                <Input
                  id="player_phone"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value || null })}
                  placeholder="+33 6 XX XX XX XX"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="player_birth_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date de naissance
                </Label>
                <Input
                  id="player_birth_date"
                  type="date"
                  value={formData.birth_date || ""}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player_club_origin" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Club d'origine
                </Label>
                <Input
                  id="player_club_origin"
                  value={formData.club_origin || ""}
                  onChange={(e) => setFormData({ ...formData, club_origin: e.target.value || null })}
                  placeholder="Nom du club précédent"
                />
              </div>
            </div>
            {isSki && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="player_fis_code" className="flex items-center gap-2">
                    <Mountain className="h-4 w-4" />
                    Code FIS
                  </Label>
                  <Input
                    id="player_fis_code"
                    value={formData.fis_code || ""}
                    onChange={(e) => setFormData({ ...formData, fis_code: e.target.value || null })}
                    placeholder="Ex: 9535596"
                  />
                  {formData.fis_code && formData.fis_code !== playerInfo?.fis_code && (
                    <p className="text-xs text-muted-foreground">
                      💡 Les résultats FIS seront importés automatiquement à l'enregistrement.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {hasInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playerInfo?.email && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a href={`mailto:${playerInfo.email}`} className="text-sm hover:underline">
                        {playerInfo.email}
                      </a>
                    </div>
                  </div>
                )}
                {playerInfo?.phone && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Téléphone</p>
                      <a href={`tel:${playerInfo.phone}`} className="text-sm hover:underline">
                        {playerInfo.phone}
                      </a>
                    </div>
                  </div>
                )}
                {playerInfo?.birth_date && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date de naissance</p>
                      <p className="text-sm">
                        {new Date(playerInfo.birth_date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                )}
                {playerInfo?.club_origin && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Club d'origine</p>
                      <p className="text-sm">{playerInfo.club_origin}</p>
                    </div>
                  </div>
                )}
                {isSki && playerInfo?.fis_code && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mountain className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Code FIS</p>
                      <p className="text-sm font-mono">{playerInfo.fis_code}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Aucune information personnelle renseignée.
                </p>
                {!isViewer && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cliquez sur "Ajouter" pour compléter la fiche.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
