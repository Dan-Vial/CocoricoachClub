import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredNavTabsList, NAV_COLORS, NavColorKey } from "@/components/ui/colored-nav-tabs";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ArrowLeft, LayoutDashboard, Shield, Users, Calendar, Zap, Heart, Trophy, MessageSquare, Loader2, Settings, FileCode, MapPin, Video, GraduationCap } from "lucide-react";
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


// Colored Tab Trigger Component - Large icons with labels below
interface ColoredTabTriggerProps {
  value: string;
  colorKey: NavColorKey;
  icon: React.ReactNode;
  label: string;
  shortLabel?: string;
  disabled?: boolean;
  badge?: number;
}

function ColoredTabTrigger({ value, colorKey, icon, label, shortLabel, disabled, badge }: ColoredTabTriggerProps) {
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
  
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl font-medium text-xs",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "min-w-[70px] sm:min-w-[85px]",
        colors.text,
        colors.hover,
        "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105"
      )}
    >
      {/* Active background */}
      <span 
        className={cn(
          "absolute inset-0 rounded-xl transition-all duration-200",
          "opacity-0 scale-95",
          "group-data-[state=active]:opacity-100 group-data-[state=active]:scale-100"
        )}
        style={{ backgroundColor: colors.base }}
      />
      {/* Unread badge */}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 z-20 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      {/* Content - Icon on top, label below */}
      <span className="relative z-10 flex flex-col items-center gap-1">
        <span className="shrink-0 h-6 w-6 sm:h-7 sm:w-7">{icon}</span>
        <span className="whitespace-nowrap text-center leading-tight hidden sm:block">{label}</span>
        <span className="whitespace-nowrap text-center leading-tight sm:hidden">{shortLabel || label}</span>
      </span>
    </TabsPrimitive.Trigger>
  );
}

// Helper to check if GPS is available for sport (only Football and Rugby)
const isGpsSportType = (sportType: string | undefined) => {
  return sportType === "football" || sportType === "XV" || sportType === "7" || sportType === "XIII" || sportType === "rugby" ||
         sportType?.startsWith("football_");
};

// Helper to check if Video Analysis is available for sport (exclude CrossFit/Hyrox/Musculation)
const hasVideoAnalysis = (sportType: string | undefined) => {
  if (!sportType) return true;
  return !sportType.startsWith("crossfit");
};

function CategoryDetailsContent() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
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
              className="text-primary-foreground hover:bg-primary-foreground/10"
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
                  <h1 className="text-2xl sm:text-3xl font-bold text-primary-foreground truncate">
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
                <p className="text-primary-foreground/90 text-sm sm:text-base truncate">
                  {displayClubName}
                </p>
                {categoryId && category?.rugby_type && (
                  <>
                    <span className="text-primary-foreground/60">•</span>
                    {isViewer ? (
                      <span className="text-primary-foreground/90 text-xs sm:text-sm">
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
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <ColoredNavTabsList className="inline-flex w-max min-w-full gap-1 p-3">
              <ColoredTabTrigger 
                value="overview" 
                colorKey="overview"
                icon={<LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7" />}
               label="Centre de décision"
               shortLabel="Décision"
              />
              {canSeeMenu("administratif") && (
                <ColoredTabTrigger
                  value="admin" 
                  colorKey="admin"
                  icon={<Shield className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Administratif"
                  shortLabel="Admin"
                />
              )}
              {canSeeMenu("academique") && (
                <ColoredTabTrigger
                  value="academy" 
                  colorKey="effectif"
                  icon={<GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Académie"
                  shortLabel="Acad"
                />
              )}
              {canSeeMenu("effectif") && (
                <ColoredTabTrigger 
                  value="effectif" 
                  colorKey="effectif"
                  icon={<Users className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Effectif"
                  shortLabel="Équipe"
                />
              )}
              {canSeeMenu("planification") && (
                <ColoredTabTrigger 
                  value="planification" 
                  colorKey="planification"
                  icon={<Calendar className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Planification"
                  shortLabel="Planning"
                />
              )}
              {canSeeMenu("programmation") && (
                <ColoredTabTrigger 
                  value="programmation" 
                  colorKey="programmation"
                  icon={<FileCode className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Programmation"
                  shortLabel="Prog"
                />
              )}
              {canSeeMenu("performance") && (
                <ColoredTabTrigger 
                  value="performance" 
                  colorKey="performance"
                  icon={<Zap className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Entrainement"
                  shortLabel="Entraîn"
                />
              )}
              {canSeeMenu("sante") && (
                <ColoredTabTrigger 
                  value="sante" 
                  colorKey="sante"
                  icon={<Heart className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Santé"
                />
              )}
              {canSeeMenu("competition") && (
                <ColoredTabTrigger 
                  value="competition" 
                  colorKey="competition"
                  icon={<Trophy className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Compétition"
                  shortLabel="Compét"
                />
              )}
              {showGpsTab && (
                <ColoredTabTrigger 
                  value="gps" 
                  colorKey="gps"
                  icon={<MapPin className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="GPS"
                />
              )}
              {showVideoTab && (
                <ColoredTabTrigger 
                  value="video" 
                  colorKey="video"
                  icon={<Video className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Analyse Vidéo"
                  shortLabel="Vidéo"
                />
              )}
              {canSeeMenu("messagerie") && (
                <ColoredTabTrigger 
                  value="communication" 
                  colorKey="communication"
                  icon={<MessageSquare className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Communication"
                  shortLabel="Com"
                  badge={unreadMessagesCount}
                />
              )}
              {canSeeMenu("parametres") && (
                <ColoredTabTrigger 
                  value="settings" 
                  colorKey="settings"
                  icon={<Settings className="h-6 w-6 sm:h-7 sm:w-7" />}
                  label="Paramètres"
                  shortLabel="Param"
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

          {canSeeMenu("academique") && (
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
              <PlanificationTab categoryId={categoryId!} />
            </TabsContent>
          )}

          {canSeeMenu("programmation") && (
            <TabsContent value="programmation" className="space-y-4">
              <ProgrammationTab categoryId={categoryId!} />
            </TabsContent>
          )}

          {canSeeMenu("performance") && (
            <TabsContent value="performance" className="space-y-4">
              <PerformanceTab categoryId={categoryId!} />
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
