import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, User, LogOut, Activity, Heart, BarChart3, Target, Video, BookOpen, Shield } from "lucide-react";
import { AthletePWAInstallPopup } from "@/components/athlete/AthletePWAInstallPopup";
import { AthleteSpaceDashboard } from "@/components/athlete-space/AthleteSpaceDashboard";
import { AthleteSpaceRpe } from "@/components/athlete-space/AthleteSpaceRpe";
import { AthleteSpaceWellness } from "@/components/athlete-space/AthleteSpaceWellness";
import { AthleteSpaceProgression } from "@/components/athlete-space/AthleteSpaceProgression";
import { AthleteSpaceObjectives } from "@/components/athlete-space/AthleteSpaceObjectives";
import { AthleteSpaceHealth } from "@/components/athlete-space/AthleteSpaceHealth";
import { AthleteSpaceEducation } from "@/components/athlete-space/AthleteSpaceEducation";

interface AthleteInfo {
  player_id: string;
  player_name: string;
  player_first_name?: string;
  category_id: string;
  category_name: string;
  club_name: string;
  sport_type?: string;
  position?: string;
  avatar_url?: string;
}

export default function AthleteSpace() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [athleteInfo, setAthleteInfo] = useState<AthleteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAthleteData();
  }, [user, authLoading]);

  const fetchAthleteData = async () => {
    try {
      const { data: player, error } = await supabase
        .from("players")
        .select(`
          id, name, first_name, category_id, position, avatar_url,
          categories!inner(name, rugby_type, clubs!inner(name))
        `)
        .eq("user_id", user!.id)
        .single();

      if (error || !player) {
        // User is not an athlete, redirect
        navigate("/");
        return;
      }

      setAthleteInfo({
        player_id: player.id,
        player_name: player.name,
        player_first_name: player.first_name || undefined,
        category_id: player.category_id,
        category_name: (player.categories as any).name,
        club_name: (player.categories as any).clubs.name,
        sport_type: (player.categories as any).rugby_type,
        position: player.position || undefined,
        avatar_url: player.avatar_url || undefined,
      });
    } catch (err) {
      console.error("Error fetching athlete data:", err);
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!athleteInfo) return null;

  const displayName = athleteInfo.player_first_name
    ? `${athleteInfo.player_first_name} ${athleteInfo.player_name}`
    : athleteInfo.player_name;

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <AthletePWAInstallPopup playerId={athleteInfo.player_id} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {athleteInfo.avatar_url ? (
                <img src={athleteInfo.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">{initials}</span>
              )}
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">{displayName}</h1>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] h-5">{athleteInfo.category_name}</Badge>
                <span className="text-xs text-muted-foreground">{athleteInfo.club_name}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="w-full flex overflow-x-auto gap-1 h-auto flex-wrap justify-start bg-transparent p-0 mb-6">
            <TabsTrigger value="dashboard" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tableau de bord</span>
              <span className="sm:hidden">Accueil</span>
            </TabsTrigger>
            <TabsTrigger value="rpe" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="h-3.5 w-3.5" />
              RPE
            </TabsTrigger>
            <TabsTrigger value="wellness" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Heart className="h-3.5 w-3.5" />
              Wellness
            </TabsTrigger>
            <TabsTrigger value="progression" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Progression
            </TabsTrigger>
            <TabsTrigger value="objectives" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target className="h-3.5 w-3.5" />
              Objectifs
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="h-3.5 w-3.5" />
              Santé
            </TabsTrigger>
            <TabsTrigger value="education" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Conseils
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AthleteSpaceDashboard
              playerId={athleteInfo.player_id}
              categoryId={athleteInfo.category_id}
              playerName={displayName}
              sportType={athleteInfo.sport_type}
            />
          </TabsContent>

          <TabsContent value="rpe">
            <AthleteSpaceRpe
              playerId={athleteInfo.player_id}
              categoryId={athleteInfo.category_id}
            />
          </TabsContent>

          <TabsContent value="wellness">
            <AthleteSpaceWellness
              playerId={athleteInfo.player_id}
              categoryId={athleteInfo.category_id}
            />
          </TabsContent>

          <TabsContent value="progression">
            <AthleteSpaceProgression
              playerId={athleteInfo.player_id}
              categoryId={athleteInfo.category_id}
              sportType={athleteInfo.sport_type}
            />
          </TabsContent>

          <TabsContent value="objectives">
            <AthleteSpaceObjectives
              playerId={athleteInfo.player_id}
              categoryId={athleteInfo.category_id}
            />
          </TabsContent>

          <TabsContent value="health">
            <AthleteSpaceHealth
              playerId={athleteInfo.player_id}
              categoryId={athleteInfo.category_id}
            />
          </TabsContent>

          <TabsContent value="education">
            <AthleteSpaceEducation sportType={athleteInfo.sport_type} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
