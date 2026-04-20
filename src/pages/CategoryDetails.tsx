import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredNavTabsList, NAV_COLORS, NavColorKey } from "@/components/ui/colored-nav-tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ArrowLeft, LayoutDashboard, Shield, Users, Calendar, Zap, Heart, Trophy, MessageSquare, Loader2, Settings, FileCode, MapPin, Video, GraduationCap, CircleDot } from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { OverviewTab } from "@/components/category/OverviewTab";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CategoryCoverUpload } from "@/components/category/CategoryCoverUpload";
import { GlobalPlayerSearch } from "@/components/search/GlobalPlayerSearch";
import { EditableCategoryName } from "@/components/category/EditableCategoryName";
import { EditableRugbyType } from "@/components/category/EditableRugbyType";
import { ViewerModeProvider, useViewerModeContext } from "@/contexts/ViewerModeContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { usePublicAccess } from "@/contexts/PublicAccessContext";
import { PublicDataProvider, usePublicDataContext } from "@/contexts/PublicDataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React from "react";

import { getSportLabel } from "@/lib/constants/sportTypes";

// New mega-tabs
import { EffectifTab } from "@/components/category/tabs/EffectifTab";
import { PlanificationTab } from "@/components/category/tabs/PlanificationTab";
import { PerformanceTab } from "@/components/category/tabs/PerformanceTab";
import { SanteTab } from "@/components/category/tabs/SanteTab";
import { CompetitionTab } from "@/components/category/tabs/CompetitionTab";
import { CommunicationTab } from "@/components/category/tabs/CommunicationTab";
import { AcademyTab } from "@/components/category/AcademyTab";
import { SettingsTab } from "@/components/category/tabs/SettingsTab";
import { ProgrammationTab } from "@/components/category/tabs/ProgrammationTab";
import { GpsDataTab } from "@/components/category/gps/GpsDataTab";
import { VideoAnalysisTab } from "@/components/category/video/VideoAnalysisTab";
import { AdminTab } from "@/components/category/tabs/AdminTab";
import { BowlingArsenalCatalogTab } from "@/components/bowling/BowlingArsenalCatalogTab";


// Colored Tab Trigger Component - Large icons with labels below
interface ColoredTabTriggerProps {
  value: string;
  colorKey: NavColorKey;
  icon: React.ReactNode;
  label: string;
  shortLabel?: string;
  disabled?: boolean;
  badge?: number;
  tooltip?: string;
}

function ColoredTabTrigger({ value, colorKey, icon, label, shortLabel, disabled, badge, tooltip }: ColoredTabTriggerProps) {
  const colors = NAV_COLORS[colorKey];
  
  if (disabled) {
    return (
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl font-medium text-xs",
          "text-muted-foreground/50 cursor-not-allowed bg-muted/30",
          "min-w-[70px] sm:min-w-[85px]"
        )}
        title="Accès restreint en mode lecture"
      >
        <span className="shrink-0 h-6 w-6 sm:h-7 sm:w-7">{icon}</span>
        <span className="whitespace-nowrap text-center leading-tight hidden sm:block">{label}</span>
        <span className="whitespace-nowrap text-center leading-tight sm:hidden">{shortLabel || label}</span>
      </div>
    );
  }
  
  const trigger = (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "colored-tab-trigger relative inline-flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl font-medium text-xs",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "min-w-[70px] sm:min-w-[85px]",
        "hover:shadow-md data-[state=active]:shadow-lg"
      )}
      style={{
        ["--tab-color" as string]: colors.base,
      }}
    >
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 z-20 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span className="colored-tab-text relative z-10 flex flex-col items-center gap-1 transition-colors duration-200" style={{ color: "var(--tab-color)" }}>
        <span className="shrink-0 h-6 w-6 sm:h-7 sm:w-7">{icon}</span>
        <span className="whitespace-nowrap text-center leading-tight hidden sm:block">{label}</span>
        <span className="whitespace-nowrap text-center leading-tight sm:hidden">{shortLabel || label}</span>
      </span>
    </TabsPrimitive.Trigger>
  );

  if (!tooltip) return trigger;

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{trigger}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs bg-background/95 backdrop-blur-sm border shadow-lg">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper to check if GPS is available for sport (only Football and Rugby)
const isGpsSportType = (sportType: string | undefined) => {
  return sportType === "football" || sportType === "XV" || sportType === "7" || sportType === "XIII" || sportType === "rugby" ||
         sportType?.startsWith("football_");
};

// Video Analysis is available for ALL sports
const hasVideoAnalysis = (_sportType: string | undefined) => {
  return true;
};

function CategoryDetailsContent() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const handleTabChange = (value: string) => {
    if (value === "overview") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", value);
    }
    setSearchParams(searchParams, { replace: true });
  };
  const { isViewer } = useViewerModeContext();
  const { isPublicAccess, token, clubName: publicClubName, categoryName: publicCategoryName } = usePublicAccess();
  const { total: unreadMessagesCount } = useUnreadMessages(categoryId || "");

  // Fetch category data - use edge function for public access, direct query for authenticated
  const { data: category, isLoading } = useQuery({
    queryKey: ["category", categoryId, isPublicAccess],
    queryFn: async () => {
      if (isPublicAccess && token) {
        // Use edge function for public access
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-data?token=${token}&type=category`,
          {
            headers: {
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch category");
        }
        return result.data;
      } else {
        const { data, error } = await supabase
          .from("categories")
          .select("*, clubs(name, id), rugby_type")
          .eq("id", categoryId)
          .single();
        if (error) throw error;
        return data;
      }
    },
  });

  const isRugby7 = category?.rugby_type === "7";
  const isAcademy = category?.academy_enabled === true;
  const isNationalTeam = category?.rugby_type === "national_team";
  
  // Check if GPS/Video/Academy should be visible (category-level flags)
  const showGpsTab = isGpsSportType(category?.rugby_type) && (category?.gps_enabled === true);
  const showVideoTab = hasVideoAnalysis(category?.rugby_type) && (category?.video_enabled === true);
  const isBowling = category?.rugby_type?.toLowerCase().includes("bowling");

  // Menu permissions based on role_menu_permissions matrix
  const { canSeeMenu } = useMenuPermissions(category?.clubs?.id, categoryId);

  // In public mode, use the context values as fallback
  const displayCategoryName = category?.name || publicCategoryName || "Catégorie";
  const displayClubName = category?.clubs?.name || publicClubName || "Club";

  const handleBack = () => {
    if (isPublicAccess && token) {
      navigate(`/public-view?token=${token}`);
    } else if (category?.clubs?.id) {
      navigate(`/clubs/${category.clubs.id}`);
    } else {
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="relative py-12 px-4 bg-gradient-hero"
        style={
          category?.cover_image_url
            ? {
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${category.cover_image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">
                {isPublicAccess ? "Retour" : "Retour aux catégories"}
              </span>
              <span className="sm:hidden">Retour</span>
            </Button>
            {!isViewer && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <GlobalPlayerSearch />
                <NotificationBell />
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="min-w-0 flex-1">
              {categoryId && (
                isViewer ? (
                  <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                    {displayCategoryName}
                  </h1>
                ) : (
                  category?.name && (
                    <EditableCategoryName 
                      categoryId={categoryId} 
                      initialName={category.name}
                    />
                  )
                )
              )}
              <div className="flex items-center gap-2 sm:gap-4 mt-2 flex-wrap">
                <p className="text-white/90 text-sm sm:text-base truncate">
                  {displayClubName}
                </p>
                {categoryId && category?.rugby_type && (
                  <>
                    <span className="text-white/60">•</span>
                    {isViewer ? (
                      <span className="text-white/90 text-xs sm:text-sm">
                        {getSportLabel(category.rugby_type)}
                      </span>
                    ) : (
                      <EditableRugbyType 
                        categoryId={categoryId}
                        currentType={category.rugby_type}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
            {categoryId && !isViewer && (
              <CategoryCoverUpload 
                categoryId={categoryId} 
                currentCoverUrl={category?.cover_image_url}
              />
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="px-0 pb-2">
            <ColoredNavTabsList className="flex flex-wrap justify-center gap-1 p-2">
              <ColoredTabTrigger 
                value="overview" 
                colorKey="overview"
                icon={<LayoutDashboard className="h-5 w-5" />}
               label="Centre de décision"
               shortLabel="Décision"
               tooltip="Vue d'ensemble : indicateurs clés, alertes, tâches prioritaires et résumé de l'activité récente"
              />
              {canSeeMenu("administratif") && (
                <ColoredTabTrigger
                  value="admin" 
                  colorKey="admin"
                  icon={<Shield className="h-5 w-5" />}
                  label="Administratif"
                  shortLabel="Admin"
                  tooltip="Gestion des documents, licences, certificats médicaux et pièces administratives des athlètes"
                />
              )}
              {canSeeMenu("academique") && isAcademy && (
                <ColoredTabTrigger
                  value="academy" 
                  colorKey="effectif"
                  icon={<GraduationCap className="h-5 w-5" />}
                  label="Académie"
                  shortLabel="Acad"
                  tooltip="Suivi scolaire : notes, moyennes, absences et statistiques académiques de chaque athlète"
                />
              )}
              {canSeeMenu("effectif") && (
                <ColoredTabTrigger 
                  value="effectif" 
                  colorKey="effectif"
                  icon={<Users className="h-5 w-5" />}
                  label="Effectif"
                  shortLabel="Équipe"
                  tooltip="Liste des athlètes, fiches individuelles, profils athlétiques et données biométriques"
                />
              )}
              {canSeeMenu("planification") && (
                <ColoredTabTrigger 
                  value="planification" 
                  colorKey="planification"
                  icon={<Calendar className="h-5 w-5" />}
                  label="Planification"
                  shortLabel="Planning"
                  tooltip="Calendrier annuel et hebdomadaire : organisation des séances, compétitions et objectifs de saison"
                />
              )}
              {canSeeMenu("programmation") && (
                <ColoredTabTrigger 
                  value="programmation" 
                  colorKey="programmation"
                  icon={<FileCode className="h-5 w-5" />}
                  label="Programmation"
                  shortLabel="Prog"
                  tooltip="Création et structuration des programmes d'entraînement : blocs, semaines et séances types"
                />
              )}
              {canSeeMenu("performance") && (
                <ColoredTabTrigger 
                  value="performance" 
                  colorKey="performance"
                  icon={<Zap className="h-5 w-5" />}
                  label="Data"
                  shortLabel="Data"
                  tooltip="Monitoring de la charge (EWMA/AWCR), suivi HRV, préparation physique et évolution des tests"
                />
              )}
              {canSeeMenu("sante") && (
                <ColoredTabTrigger 
                  value="sante" 
                  colorKey="sante"
                  icon={<Heart className="h-5 w-5" />}
                  label="Santé"
                  tooltip="Bien-être (wellness), blessures, récupération, cycle menstruel et prévention des risques"
                />
              )}
              {canSeeMenu("competition") && (
                <ColoredTabTrigger 
                  value="competition" 
                  colorKey="competition"
                  icon={<Trophy className="h-5 w-5" />}
                  label="Compétition & Stats"
                  shortLabel="Compét"
                  tooltip="Gestion des matchs/compétitions, saisie des résultats, statistiques individuelles et collectives"
                />
              )}
              {isBowling && (
                <ColoredTabTrigger 
                  value="arsenal" 
                  colorKey="performance"
                  icon={<CircleDot className="h-5 w-5" />}
                  label="Arsenal"
                  tooltip="Inventaire des boules de bowling : marque, modèle, caractéristiques techniques et surface"
                />
              )}
              {showGpsTab && (
                <ColoredTabTrigger 
                  value="gps" 
                  colorKey="gps"
                  icon={<MapPin className="h-5 w-5" />}
                  label="GPS"
                  tooltip="Données GPS des séances : distance, vitesse, accélérations et charge mécanique externe"
                />
              )}
              {showVideoTab && (
                <ColoredTabTrigger 
                  value="video" 
                  colorKey="video"
                  icon={<Video className="h-5 w-5" />}
                  label="Analyse Vidéo"
                  shortLabel="Vidéo"
                  tooltip="Import et découpage de vidéos de matchs et entraînements, clips et annotations"
                />
              )}
              {canSeeMenu("messagerie") && (
                <ColoredTabTrigger 
                  value="communication" 
                  colorKey="communication"
                  icon={<MessageSquare className="h-5 w-5" />}
                  label="Communication"
                  shortLabel="Com"
                  badge={unreadMessagesCount}
                  tooltip="Messagerie interne : échanges avec le staff et les athlètes, discussions de groupe"
                />
              )}
              {canSeeMenu("parametres") && (
                <ColoredTabTrigger 
                  value="settings" 
                  colorKey="settings"
                  icon={<Settings className="h-5 w-5" />}
                  label="Paramètres"
                  shortLabel="Param"
                  tooltip="Configuration de la catégorie : membres, invitations, préférences et gestion des accès"
                />
              )}
            </ColoredNavTabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <OverviewTab categoryId={categoryId!} categoryName={displayCategoryName} />
          </TabsContent>

          {canSeeMenu("administratif") && (
            <TabsContent value="admin" className="space-y-4">
              <AdminTab categoryId={categoryId!} />
            </TabsContent>
          )}

          {canSeeMenu("academique") && isAcademy && (
            <TabsContent value="academy" className="space-y-4">
              <AcademyTab categoryId={categoryId!} />
            </TabsContent>
          )}

          {canSeeMenu("effectif") && (
            <TabsContent value="effectif" className="space-y-4">
              <EffectifTab categoryId={categoryId!} />
            </TabsContent>
          )}

          {canSeeMenu("planification") && (
            <TabsContent value="planification" className="space-y-4">
              <PlanificationTab categoryId={categoryId!} sportType={category?.rugby_type} />
            </TabsContent>
          )}

          {canSeeMenu("programmation") && (
            <TabsContent value="programmation" className="space-y-4">
              <ProgrammationTab categoryId={categoryId!} />
            </TabsContent>
          )}

          {canSeeMenu("performance") && (
            <TabsContent value="performance" className="space-y-4">
              <PerformanceTab categoryId={categoryId!} sportType={category?.rugby_type} />
            </TabsContent>
          )}

          {canSeeMenu("sante") && (
            <TabsContent value="sante" className="space-y-4">
              <SanteTab categoryId={categoryId!} />
            </TabsContent>
          )}

          {canSeeMenu("competition") && (
            <TabsContent value="competition" className="space-y-4">
              <CompetitionTab 
                categoryId={categoryId!} 
                isRugby7={isRugby7} 
                isNationalTeam={isNationalTeam}
                sportType={category?.rugby_type}
              />
            </TabsContent>
          )}

          {isBowling && (
            <TabsContent value="arsenal" className="space-y-4">
              <BowlingArsenalCatalogTab categoryId={categoryId!} />
            </TabsContent>
          )}

          {/* GPS Tab - Only for Football and Rugby + Client option enabled */}
          {showGpsTab && (
            <TabsContent value="gps" className="space-y-4">
              <GpsDataTab categoryId={categoryId!} />
            </TabsContent>
          )}

          {/* Video Analysis Tab - Sport supported + Client option enabled */}
          {showVideoTab && (
            <TabsContent value="video" className="space-y-4">
              <VideoAnalysisTab categoryId={categoryId!} sportType={category?.rugby_type} />
            </TabsContent>
          )}

          {canSeeMenu("messagerie") && (
            <TabsContent value="communication" className="space-y-4">
              <CommunicationTab 
                categoryId={categoryId!} 
                isAcademy={false}
              />
            </TabsContent>
          )}


          {canSeeMenu("parametres") && (
            <TabsContent value="settings" className="space-y-4">
              <SettingsTab categoryId={categoryId!} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default function CategoryDetails() {
  const { categoryId } = useParams();
  const { isPublicAccess, token } = usePublicAccess();

  // Fetch category to get club_id for the provider
  // For public access, use edge function
  const { data: category, isLoading } = useQuery({
    queryKey: ["category-for-viewer", categoryId, isPublicAccess],
    queryFn: async () => {
      if (isPublicAccess && token) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-data?token=${token}&type=category`,
          {
            headers: {
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        const result = await response.json();
        if (!result.success) return null;
        return { club_id: result.data?.clubs?.id };
      } else {
        const { data, error } = await supabase
          .from("categories")
          .select("club_id")
          .eq("id", categoryId)
          .single();
        if (error) return null;
        return data;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ViewerModeProvider clubId={category?.club_id} categoryId={categoryId}>
      <PublicDataProvider categoryId={categoryId || ""}>
        <CategoryDetailsContent />
      </PublicDataProvider>
    </ViewerModeProvider>
  );
}
