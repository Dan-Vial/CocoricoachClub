import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, LogOut, Activity, Heart, BarChart3, Target, Video, BookOpen, Shield, ArrowLeft, Search, ChevronRight, MessageSquare } from "lucide-react";
import { NAV_COLORS } from "@/components/ui/colored-nav-tabs";
import { AthletePWAInstallPopup } from "@/components/athlete/AthletePWAInstallPopup";
import { AthleteSpaceDashboard } from "@/components/athlete-space/AthleteSpaceDashboard";
import { AthleteSpaceRpe } from "@/components/athlete-space/AthleteSpaceRpe";
import { AthleteSpaceWellness } from "@/components/athlete-space/AthleteSpaceWellness";
import { AthleteSpaceProgression } from "@/components/athlete-space/AthleteSpaceProgression";
import { AthleteSpaceObjectives } from "@/components/athlete-space/AthleteSpaceObjectives";
import { AthleteSpaceHealth } from "@/components/athlete-space/AthleteSpaceHealth";
import { AthleteSpaceEducation } from "@/components/athlete-space/AthleteSpaceEducation";
import { MessagingTab } from "@/components/messaging/MessagingTab";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [athleteInfo, setAthleteInfo] = useState<AthleteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdminView, setIsSuperAdminView] = useState(false);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");

  const queryPlayerId = searchParams.get("playerId");

  // Check super admin status
  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      return data === true;
    },
    enabled: !!user?.id,
  });

  // Fetch all players for super admin selector
  const { data: allPlayers = [] } = useQuery({
    queryKey: ["all-players-for-selector"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name, category_id, categories(name, clubs(name))")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: showPlayerSelector && !!isSuperAdmin,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAthleteData();
  }, [user, authLoading, queryPlayerId]);

  const fetchAthleteData = async () => {
    try {
      // If super admin viewing a specific player
      if (queryPlayerId) {
        const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: user!.id });
        if (isSA) {
          setIsSuperAdminView(true);
          const { data: player, error } = await supabase
            .from("players")
            .select(`
              id, name, first_name, category_id, position, avatar_url,
              categories!inner(name, rugby_type, clubs!inner(name))
            `)
            .eq("id", queryPlayerId)
            .single();

          if (error || !player) {
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
          return;
        }
      }

      // Normal athlete flow
      const { data: player, error } = await supabase
        .from("players")
        .select(`
          id, name, first_name, category_id, position, avatar_url,
          categories!inner(name, rugby_type, clubs!inner(name))
        `)
        .eq("user_id", user!.id)
        .single();

      if (error || !player) {
        // If super admin, show player selector instead of redirecting
        const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: user!.id });
        if (isSA) {
          setShowPlayerSelector(true);
          setIsLoading(false);
          return;
        }
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

  const selectPlayer = (playerId: string) => {
    setSearchParams({ playerId });
    setShowPlayerSelector(false);
  };

  // Filter players by search
  const filteredPlayers = allPlayers.filter(p => {
    const fullName = `${p.first_name || ""} ${p.name}`.toLowerCase();
    const catName = ((p.categories as any)?.name || "").toLowerCase();
    const clubName = ((p.categories as any)?.clubs?.name || "").toLowerCase();
    const q = playerSearch.toLowerCase();
    return fullName.includes(q) || catName.includes(q) || clubName.includes(q);
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Super admin player selector
  if (showPlayerSelector) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-base font-semibold">Espace Athlète</h1>
                <Badge variant="outline" className="text-[10px] h-5 border-primary text-primary">Vue Admin</Badge>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Sélectionner un athlète
              </CardTitle>
              <CardDescription>Choisissez un athlète pour consulter son espace personnel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, catégorie ou club..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {filteredPlayers.map(p => (
                  <Button
                    key={p.id}
                    variant="ghost"
                    className="w-full justify-between h-auto py-3"
                    onClick={() => selectPlayer(p.id)}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">{p.first_name ? `${p.first_name} ${p.name}` : p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(p.categories as any)?.name} • {(p.categories as any)?.clubs?.name}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                ))}
                {filteredPlayers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucun athlète trouvé</p>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
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
      {!isSuperAdminView && <AthletePWAInstallPopup playerId={athleteInfo.player_id} />}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSuperAdminView && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
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
                {isSuperAdminView && (
                  <Badge variant="outline" className="text-[10px] h-5 border-primary text-primary">Vue Admin</Badge>
                )}
                <Badge variant="secondary" className="text-[10px] h-5">{athleteInfo.category_name}</Badge>
                <span className="text-xs text-muted-foreground">{athleteInfo.club_name}</span>
              </div>
            </div>
          </div>
          {!isSuperAdminView ? (
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate(`/players/${athleteInfo.player_id}`)}>
              Fiche joueur
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
       <Tabs defaultValue="dashboard" className="w-full">
           <TabsList className="w-full flex overflow-x-auto gap-1.5 h-auto flex-wrap justify-start bg-transparent p-0 mb-6">
             <TabsTrigger 
               value="dashboard" 
               className="gap-1.5 px-3 py-2 rounded-lg transition-all duration-200"
               style={{
                 color: NAV_COLORS.sante.base,
                 borderBottom: `2px solid ${NAV_COLORS.sante.base}`,
                 opacity: 0.6
               }}
               data-active-color={NAV_COLORS.sante.base}
             >
               <BarChart3 className="h-3.5 w-3.5" />
               <span className="hidden sm:inline">Tableau de bord</span>
               <span className="sm:hidden">Accueil</span>
             </TabsTrigger>
             <TabsTrigger 
               value="rpe"
               className="gap-1.5 px-3 py-2 rounded-lg transition-all duration-200"
               style={{
                 color: NAV_COLORS.performance.base,
                 borderBottom: `2px solid ${NAV_COLORS.performance.base}`,
                 opacity: 0.6
               }}
             >
               <Activity className="h-3.5 w-3.5" />
               RPE
             </TabsTrigger>
             <TabsTrigger 
               value="wellness"
               className="gap-1.5 px-3 py-2 rounded-lg transition-all duration-200"
               style={{
                 color: NAV_COLORS.sante.base,
                 borderBottom: `2px solid ${NAV_COLORS.sante.base}`,
                 opacity: 0.6
               }}
             >
               <Heart className="h-3.5 w-3.5" />
               Wellness
             </TabsTrigger>
             <TabsTrigger 
               value="progression"
               className="gap-1.5 px-3 py-2 rounded-lg transition-all duration-200"
               style={{
                 color: NAV_COLORS.programmation.base,
                 borderBottom: `2px solid ${NAV_COLORS.programmation.base}`,
                 opacity: 0.6
               }}
             >
               <BarChart3 className="h-3.5 w-3.5" />
               Progression
             </TabsTrigger>
             <TabsTrigger 
               value="objectives"
               className="gap-1.5 px-3 py-2 rounded-lg transition-all duration-200"
               style={{
                 color: NAV_COLORS.planification.base,
                 borderBottom: `2px solid ${NAV_COLORS.planification.base}`,
                 opacity: 0.6
               }}
             >
               <Target className="h-3.5 w-3.5" />
               Objectifs
             </TabsTrigger>
             <TabsTrigger 
               value="health"
               className="gap-1.5 px-3 py-2 rounded-lg transition-all duration-200"
               style={{
                 color: NAV_COLORS.sante.base,
                 borderBottom: `2px solid ${NAV_COLORS.sante.base}`,
                 opacity: 0.6
               }}
             >
               <Shield className="h-3.5 w-3.5" />
               Santé
             </TabsTrigger>
             <TabsTrigger 
               value="education"
               className="gap-1.5 px-3 py-2 rounded-lg transition-all duration-200"
               style={{
                 color: NAV_COLORS.effectif.base,
                 borderBottom: `2px solid ${NAV_COLORS.effectif.base}`,
                 opacity: 0.6
               }}
             >
              <BookOpen className="h-3.5 w-3.5" />
                Conseils
              </TabsTrigger>
              <TabsTrigger 
                value="messaging"
                className="gap-1.5 px-3 py-2 rounded-lg transition-all duration-200"
                style={{
                  color: NAV_COLORS.communication.base,
                  borderBottom: `2px solid ${NAV_COLORS.communication.base}`,
                  opacity: 0.6
                }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Messagerie
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

          <TabsContent value="messaging">
            <MessagingTab categoryId={athleteInfo.category_id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
