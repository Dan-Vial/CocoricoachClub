import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRightLeft, Edit2, Check, X, User, Activity, FlaskConical, Swords, CalendarDays, Heart, Utensils, GraduationCap, Bandage, CircleDot, Mountain, FileText, BarChart3 } from "lucide-react";
import { ColoredNavTabsList } from "@/components/ui/colored-nav-tabs";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { PlayerTestsTab } from "@/components/player/PlayerTestsTab";
import { PlayerCalendarTab } from "@/components/player/PlayerCalendarTab";
import { PlayerAwcrTab } from "@/components/player/PlayerAwcrTab";
import { PlayerTrainingLoadCard } from "@/components/player/PlayerTrainingLoadCard";
import { PlayerReportSection } from "@/components/player/PlayerReportSection";
import { PlayerProfile } from "@/components/player/PlayerProfile";
import { PlayerInjuriesTab } from "@/components/player/PlayerInjuriesTab";
import { PlayerBiometrics } from "@/components/player/PlayerBiometrics";
import { PlayerMatchesTab } from "@/components/player/PlayerMatchesTab";
import { PlayerWellnessTab } from "@/components/player/PlayerWellnessTab";
import { PlayerNutritionTab } from "@/components/player/PlayerNutritionTab";
import { PlayerAcademyTab } from "@/components/player/PlayerAcademyTab";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GlobalPlayerSearch } from "@/components/search/GlobalPlayerSearch";
import { TransferPlayerDialog } from "@/components/player/TransferPlayerDialog";
import { PlayerTransferHistory } from "@/components/player/PlayerTransferHistory";
import { AthleteAccessSection } from "@/components/player/AthleteAccessSection";
import { PlayerAdditionalInfoSection } from "@/components/player/PlayerAdditionalInfoSection";
import { PlayerPersonalInfoSection } from "@/components/player/PlayerPersonalInfoSection";
import { PlayerReferenceCard } from "@/components/player/PlayerReferenceCard";
import { PlayerBowlingArsenal } from "@/components/bowling/PlayerBowlingArsenal";
import { BowlingCumulativeStats } from "@/components/bowling/BowlingCumulativeStats";
import { PlayerSurfEquipment } from "@/components/surf/PlayerSurfEquipment";
import { PlayerSkiEquipment } from "@/components/ski/PlayerSkiEquipment";
import { PlayerPadelEquipment } from "@/components/padel/PlayerPadelEquipment";
import { ViewerModeProvider, useViewerModeContext } from "@/contexts/ViewerModeContext";
import { AthleteSpaceDocuments } from "@/components/athlete-space/AthleteSpaceDocuments";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPositionsForSport } from "@/lib/constants/sportPositions";
import { isIndividualSport, ATHLETISME_DISCIPLINES, ATHLETISME_SPECIALTIES, JUDO_WEIGHT_CATEGORIES, isAthletismeCategory, isJudoCategory, isSkiCategory, isPadelCategory, AVIRON_ROLES } from "@/lib/constants/sportTypes";
import { getDisciplineLabel, getSpecialtyLabel } from "@/lib/constants/athleticProfiles";
import { toast } from "sonner";

function PlayerDetailTab({ value, label, icon: Icon, color }: { value: string; label: string; icon: React.ElementType; color: string }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "group relative inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm",
        "transition-all duration-200 ease-out whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "hover:opacity-80",
        "data-[state=active]:shadow-md",
      )}
      style={{ borderWidth: "2px", borderColor: color, borderStyle: "solid" }}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-md transition-all duration-200",
          "opacity-0 scale-95",
          "group-data-[state=active]:opacity-100 group-data-[state=active]:scale-100"
        )}
        style={{ backgroundColor: color }}
      />
      <span className="relative z-10">
        <Icon className="h-4 w-4 group-data-[state=active]:hidden" style={{ color }} />
        <Icon className="h-4 w-4 hidden group-data-[state=active]:inline text-white" />
      </span>
      <span className="relative z-10">
        <span className="group-data-[state=active]:hidden" style={{ color }}>{label}</span>
        <span className="hidden group-data-[state=active]:inline text-white">{label}</span>
      </span>
    </TabsPrimitive.Trigger>
  );
}

function PlayerDetailsContent() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [editPosition, setEditPosition] = useState("");
  const [isEditingSpecialty, setIsEditingSpecialty] = useState(false);
  const [editSpecialty, setEditSpecialty] = useState("");
  const { isViewer } = useViewerModeContext();

  const { data: player, isLoading } = useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*, categories(id, name, club_id, rugby_type, academy_enabled, gps_enabled, video_enabled)")
        .eq("id", playerId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const sportType = (player?.categories as { rugby_type?: string })?.rugby_type || "XV";
  const isTeamSport = !isIndividualSport(sportType);
  const isAthletics = isAthletismeCategory(sportType);
  const isJudo = isJudoCategory(sportType);
  const isAviron = sportType.toLowerCase().includes("aviron");
  const isBowling = sportType.toLowerCase().includes("bowling");
  const isSurf = sportType.toLowerCase().includes("surf");
  const isSki = isSkiCategory(sportType);
  const isPadel = isPadelCategory(sportType);
  const positions = getPositionsForSport(sportType);

  // Get display label for discipline/position/role
  const getAttributeLabel = () => {
    if (isAthletics) return "Discipline";
    if (isJudo) return "Catégorie";
    if (isAviron) return "Rôle";
    return "Poste";
  };

  const getAttributeValue = () => {
    if (isAthletics) {
      return player?.discipline ? getDisciplineLabel(player.discipline) : null;
    }
    if (isJudo) {
      return player?.discipline ? getDisciplineLabel(player.discipline) : null;
    }
    if (isAviron) {
      const value = player?.position;
      return AVIRON_ROLES.find(r => r.value === value)?.label || value;
    }
    return player?.position;
  };

  const getSpecialtyValue = () => {
    if (isAthletics && player?.specialty) {
      return getSpecialtyLabel(player.specialty);
    }
    return null;
  };

  // Get available specialties based on current discipline
  const availableSpecialties = player?.discipline && isAthletics 
    ? ATHLETISME_SPECIALTIES[player.discipline] || [] 
    : [];

  const updatePosition = useMutation({
    mutationFn: async (newPosition: string) => {
      // For athletics/judo, update discipline field
      // For aviron/team sports, update position field
      const updateField = (isAthletics || isJudo) ? "discipline" : "position";
      const { error } = await supabase
        .from("players")
        .update({ [updateField]: newPosition || null })
        .eq("id", playerId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      // Also invalidate the players list so changes appear immediately in the list
      if (player?.category_id) {
        queryClient.invalidateQueries({ queryKey: ["players", player.category_id] });
      }
      toast.success("Mis à jour avec succès");
      setIsEditingPosition(false);
      // Reset specialty when discipline changes for athletics
      if (isAthletics) {
        setEditSpecialty("");
      }
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const updateSpecialty = useMutation({
    mutationFn: async (newSpecialty: string) => {
      const { error } = await supabase
        .from("players")
        .update({ specialty: newSpecialty || null })
        .eq("id", playerId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      toast.success("Spécialité mise à jour");
      setIsEditingSpecialty(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de la spécialité");
    },
  });

  const handleStartEdit = () => {
    const currentValue = (isAthletics || isJudo) ? player?.discipline : player?.position;
    setEditPosition(currentValue || "");
    setIsEditingPosition(true);
  };

  const handleSavePosition = () => {
    updatePosition.mutate(editPosition);
  };

  const handleCancelEdit = () => {
    setIsEditingPosition(false);
    setEditPosition("");
  };

  const handleStartEditSpecialty = () => {
    setEditSpecialty(player?.specialty || "");
    setIsEditingSpecialty(true);
  };

  const handleSaveSpecialty = () => {
    updateSpecialty.mutate(editSpecialty);
  };

  const handleCancelEditSpecialty = () => {
    setIsEditingSpecialty(false);
    setEditSpecialty("");
  };

  // Get options for select
  const getEditOptions = () => {
    if (isAthletics) return ATHLETISME_DISCIPLINES;
    if (isJudo) return JUDO_WEIGHT_CATEGORIES;
    if (isAviron) return AVIRON_ROLES;
    return positions.map(p => ({ value: p.name, label: `${p.id}. ${p.name}` }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p className="text-muted-foreground">Joueur non trouvé</p>
      </div>
    );
  }

  const fullName = player.first_name ? `${player.first_name} ${player.name}` : player.name;
  const attributeValue = getAttributeValue();
  const specialtyValue = getSpecialtyValue();
  const showAttributeEditor = isTeamSport || isAthletics || isJudo || isAviron;
  const showSpecialtyEditor = isAthletics && player?.discipline;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/categories/${player.categories?.id}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la catégorie
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/athlete-space?playerId=${player.id}`)}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Espace Athlète</span>
            </Button>
            <GlobalPlayerSearch />
            <NotificationBell variant="default" />
          </div>
        </div>

        <Card className="mb-6 bg-gradient-card shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{fullName}</CardTitle>
              <p className="text-muted-foreground">{player.categories?.name}</p>
              
              {/* Editable position/discipline */}
              {showAttributeEditor && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">{getAttributeLabel()}:</span>
                  {isEditingPosition ? (
                    <div className="flex items-center gap-2">
                      <Select value={editPosition} onValueChange={setEditPosition}>
                        <SelectTrigger className="w-[200px] h-8">
                          <SelectValue placeholder={`Choisir un ${getAttributeLabel().toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {getEditOptions().map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleSavePosition}
                        disabled={updatePosition.isPending}
                      >
                        <Check className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {attributeValue ? (
                        <Badge variant="secondary">{attributeValue}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Non défini</span>
                      )}
                      {!isViewer && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={handleStartEdit}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Specialty editor for athletics */}
              {showSpecialtyEditor && availableSpecialties.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">Spécialité:</span>
                  {isEditingSpecialty ? (
                    <div className="flex items-center gap-2">
                      <Select value={editSpecialty} onValueChange={setEditSpecialty}>
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue placeholder="Choisir une spécialité" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {availableSpecialties.map((spec) => (
                            <SelectItem key={spec.value} value={spec.value}>
                              {spec.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleSaveSpecialty}
                        disabled={updateSpecialty.isPending}
                      >
                        <Check className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleCancelEditSpecialty}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {specialtyValue ? (
                        <Badge variant="outline" className="font-normal">{specialtyValue}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Non définie</span>
                      )}
                      {!isViewer && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={handleStartEditSpecialty}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!isViewer && (
              <Button
                variant="outline"
                onClick={() => setTransferDialogOpen(true)}
                className="gap-2"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Transférer
              </Button>
            )}
          </CardHeader>
        </Card>

        {/* Transfer History */}
        <div className="mb-6">
          <PlayerTransferHistory playerId={playerId!} />
        </div>

        {/* Athlete Access Section - only for coaches */}
        {!isViewer && player.category_id && (
          <div className="mb-3">
            <AthleteAccessSection 
              playerId={playerId!} 
              categoryId={player.category_id}
              playerName={fullName}
            />
          </div>
        )}

        <div className="mb-3">
          <PlayerReferenceCard 
            categoryId={player.category_id}
            playerId={playerId!}
            playerName={fullName}
          />
        </div>

        {/* Personal Info Section */}
        <div className="mb-3">
          <PlayerPersonalInfoSection 
            playerId={playerId!}
            categoryId={player.category_id}
            isViewer={isViewer}
            sportType={sportType}
          />
        </div>

        {/* Player Profile and Biometrics Section - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <PlayerProfile 
            playerId={playerId!} 
            categoryId={player.category_id}
            playerName={fullName}
            avatarUrl={player.avatar_url}
            sportType={(player.categories as { rugby_type?: string })?.rugby_type}
            discipline={player.discipline}
          />
          <PlayerBiometrics 
            playerId={playerId!} 
            categoryId={player.category_id}
            birthYear={player.birth_year}
          />
        </div>

        <Tabs defaultValue="charge" className="space-y-6">
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <ColoredNavTabsList className="flex w-max gap-1.5 p-2">
              <PlayerDetailTab value="charge" label="Charge" icon={Activity} color="hsl(350 80% 55%)" />
              <PlayerDetailTab value="tests" label="Tests" icon={FlaskConical} color="hsl(280 70% 55%)" />
              <PlayerDetailTab value="matches" label={isTeamSport ? "Matchs" : "Compétitions"} icon={Swords} color="hsl(220 80% 55%)" />
              <PlayerDetailTab value="calendar" label="Calendrier" icon={CalendarDays} color="hsl(35 90% 55%)" />
              <PlayerDetailTab value="wellness" label="Wellness" icon={Heart} color="hsl(160 65% 45%)" />
              <PlayerDetailTab value="nutrition" label="Nutrition" icon={Utensils} color="hsl(45 95% 50%)" />
              {(player?.categories as any)?.academy_enabled && (
                <PlayerDetailTab value="academy" label="Académie" icon={GraduationCap} color="hsl(200 85% 50%)" />
              )}
              <PlayerDetailTab value="injuries" label="Blessures" icon={Bandage} color="hsl(10 80% 55%)" />
              {(isBowling || isSurf || isSki || isPadel) && (
                <PlayerDetailTab value="equipment" label={isBowling ? "Arsenal" : "Matériel"} icon={Mountain} color="hsl(190 70% 50%)" />
              )}
              <PlayerDetailTab value="documents" label="Documents" icon={FileText} color="hsl(280 70% 55%)" />
            </ColoredNavTabsList>
          </ScrollArea>

          <TabsContent value="charge">
            <div className="space-y-6">
              <PlayerTrainingLoadCard 
                playerId={playerId!} 
                categoryId={player.category_id} 
                playerName={fullName}
              />
              <PlayerAwcrTab playerId={playerId!} categoryId={player.category_id} readOnly={true} />
            </div>
          </TabsContent>

          <TabsContent value="tests">
            <PlayerTestsTab playerId={playerId!} categoryId={player.category_id} sportType={sportType} />
          </TabsContent>

          <TabsContent value="matches">
            {isBowling ? (
              <BowlingCumulativeStats categoryId={player.category_id} playerId={playerId!} />
            ) : (
              <PlayerMatchesTab 
                playerId={playerId!} 
                categoryId={player.category_id} 
                playerName={fullName}
                sportType={(player.categories as { rugby_type?: string })?.rugby_type}
              />
            )}
          </TabsContent>

          <TabsContent value="calendar">
            <PlayerCalendarTab playerId={playerId!} categoryId={player.category_id} />
          </TabsContent>


          <TabsContent value="wellness">
            <PlayerWellnessTab playerId={playerId!} categoryId={player.category_id} />
          </TabsContent>

          <TabsContent value="nutrition">
            <PlayerNutritionTab playerId={playerId!} categoryId={player.category_id} readOnly={true} />
          </TabsContent>

          <TabsContent value="academy">
            <PlayerAcademyTab playerId={playerId!} categoryId={player.category_id} playerName={fullName} readOnly={true} />
          </TabsContent>

          <TabsContent value="injuries">
            <PlayerInjuriesTab playerId={playerId!} categoryId={player.category_id} playerName={fullName} readOnly={true} />
          </TabsContent>

          {(isBowling || isSurf || isSki || isPadel) && (
            <TabsContent value="equipment">
              {isBowling && (
                <PlayerBowlingArsenal playerId={playerId!} categoryId={player.category_id} isViewer={true} />
              )}
              {isSurf && (
                <PlayerSurfEquipment playerId={playerId!} categoryId={player.category_id} isViewer={true} />
              )}
              {isSki && (
                <PlayerSkiEquipment playerId={playerId!} categoryId={player.category_id} isViewer={true} />
              )}
              {isPadel && (
                <PlayerPadelEquipment playerId={playerId!} categoryId={player.category_id} isViewer={true} />
              )}
            </TabsContent>
          )}
          <TabsContent value="documents">
            <AthleteSpaceDocuments playerId={playerId!} categoryId={player.category_id} />
          </TabsContent>

        </Tabs>

        {/* Individual Report - always visible at the bottom */}
        <div className="mt-8">
          <PlayerReportSection 
            playerId={playerId!} 
            categoryId={player.category_id} 
            playerName={fullName}
            sportType={sportType}
          />
        </div>

        {!isViewer && (
          <TransferPlayerDialog
            open={transferDialogOpen}
            onOpenChange={setTransferDialogOpen}
            playerId={playerId!}
            playerName={fullName}
            currentCategoryId={player.category_id}
            currentCategoryName={player.categories?.name || ""}
            clubId={player.categories?.club_id || ""}
          />
        )}
      </div>
    </div>
  );
}

export default function PlayerDetails() {
  const { playerId } = useParams<{ playerId: string }>();
  
  // Fetch player to get categoryId and clubId for viewer mode
  const { data: player } = useQuery({
    queryKey: ["player-for-viewer-mode", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("category_id, categories(club_id)")
        .eq("id", playerId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });
  
  return (
    <ViewerModeProvider 
      categoryId={player?.category_id} 
      clubId={player?.categories?.club_id}
    >
      <PlayerDetailsContent />
    </ViewerModeProvider>
  );
}
