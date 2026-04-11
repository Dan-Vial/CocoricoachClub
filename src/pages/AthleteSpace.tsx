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
import { Loader2, User, LogOut, Activity, Heart, BarChart3, Target, Video, Shield, ArrowLeft, Search, ChevronRight, MessageSquare, Settings, CalendarDays, CircleDot, Waves, FileText } from "lucide-react";
import { PlayerBowlingArsenal } from "@/components/bowling/PlayerBowlingArsenal";
import { PlayerSurfEquipment } from "@/components/surf/PlayerSurfEquipment";
import { PlayerSkiEquipment } from "@/components/ski/PlayerSkiEquipment";
import { PlayerPadelEquipment } from "@/components/padel/PlayerPadelEquipment";
import { NAV_COLORS } from "@/components/ui/colored-nav-tabs";
import { AthletePWAInstallPopup } from "@/components/athlete/AthletePWAInstallPopup";
import { AthleteSpaceDashboard } from "@/components/athlete-space/AthleteSpaceDashboard";
import { AthleteSpaceRpe } from "@/components/athlete-space/AthleteSpaceRpe";
import { AthleteSpaceWellness } from "@/components/athlete-space/AthleteSpaceWellness";
import { AthleteSpaceObjectives } from "@/components/athlete-space/AthleteSpaceObjectives";
import { AthleteSpaceHealth } from "@/components/athlete-space/AthleteSpaceHealth";
import { AthleteSpacePerformance } from "@/components/athlete-space/AthleteSpacePerformance";
import { MessagingTab } from "@/components/messaging/MessagingTab";
import { AthleteSpaceSettings } from "@/components/athlete-space/AthleteSpaceSettings";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { AthleteSpaceCalendar } from "@/components/athlete-space/AthleteSpaceCalendar";
import { AthleteSpaceDocuments } from "@/components/athlete-space/AthleteSpaceDocuments";

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
  cover_image_url?: string;
}

export default function AthleteSpace() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [athleteInfo, setAthleteInfo] = useState<AthleteInfo | null>(null);
  const [allAthleteEntries, setAllAthleteEntries] = useState<AthleteInfo[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSuperAdminView, setIsSuperAdminView] = useState(false);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const { total: unreadCount } = useUnreadMessages(athleteInfo?.category_id || "");

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

  // Fetch players for selector (super admin sees all, staff sees their categories)
  const { data: allPlayers = [] } = useQuery({
    queryKey: ["all-players-for-selector", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name, category_id, categories(name, clubs(name))")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: showPlayerSelector && !!user?.id,
  });

  const queryCategoryId = searchParams.get("categoryId");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAthleteData();
  }, [user, authLoading, queryPlayerId, queryCategoryId]);

  const fetchAthleteData = async () => {
    try {
      // If staff/admin viewing a specific player via ?playerId=
      if (queryPlayerId) {
        const { data: player, error } = await supabase
          .from("players")
          .select(`
            id, name, first_name, category_id, position, avatar_url,
            categories!inner(name, rugby_type, cover_image_url, clubs!inner(name))
          `)
          .eq("id", queryPlayerId)
          .single();

        if (!error && player) {
          // Check if user is super admin or has access to this category
          const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: user!.id });
          const { data: hasAccess } = await supabase.rpc("can_access_category", { 
            _user_id: user!.id, 
            _category_id: player.category_id 
          });

          if (isSA || hasAccess) {
            setIsSuperAdminView(true);
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
              cover_image_url: (player.categories as any).cover_image_url || undefined,
            });
            return;
          }
        }
      }

      // Normal athlete flow - fetch player record(s) for this user
      const { data: players, error } = await supabase
        .from("players")
        .select(`
          id, name, first_name, category_id, position, avatar_url,
          categories!inner(name, rugby_type, cover_image_url, clubs!inner(name))
        `)
        .eq("user_id", user!.id);

      console.log("AthleteSpace: players query result", { players, error, userId: user!.id });

      if (error) {
        console.error("AthleteSpace: players query error", error);
        setLoadError(`Erreur de chargement: ${error.message}`);
        return;
      }

      if (!players || players.length === 0) {
        // If super admin or staff member, show player selector
        const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: user!.id });
        if (isSA) {
          setShowPlayerSelector(true);
          return;
        }
        // Check if user is a club/category member (staff)
        const { data: clubMemberships } = await supabase
          .from("club_members")
          .select("club_id")
          .eq("user_id", user!.id)
          .limit(1);
        if (clubMemberships && clubMemberships.length > 0) {
          setShowPlayerSelector(true);
          return;
        }
        setLoadError("Aucun profil joueur trouvé pour ce compte. Contacte ton staff pour vérifier ton invitation.");
        return;
      }

      // Build entries from primary player records
      const entries: AthleteInfo[] = players.map(player => ({
        player_id: player.id,
        player_name: player.name,
        player_first_name: player.first_name || undefined,
        category_id: player.category_id,
        category_name: (player.categories as any).name,
        club_name: (player.categories as any).clubs.name,
        sport_type: (player.categories as any).rugby_type,
        position: player.position || undefined,
        avatar_url: player.avatar_url || undefined,
        cover_image_url: (player.categories as any).cover_image_url || undefined,
      }));

      // Also fetch additional categories from player_categories junction table
      const playerIds = players.map(p => p.id);
      const existingCategoryIds = new Set(entries.map(e => e.category_id));

      const { data: extraCategories } = await supabase
        .from("player_categories")
        .select("player_id, category_id, categories(name, rugby_type, cover_image_url, clubs(name))")
        .in("player_id", playerIds)
        .eq("status", "accepted");

      if (extraCategories) {
        for (const pc of extraCategories) {
          if (!existingCategoryIds.has(pc.category_id)) {
            const player = players.find(p => p.id === pc.player_id);
            if (player && pc.categories) {
              entries.push({
                player_id: player.id,
                player_name: player.name,
                player_first_name: player.first_name || undefined,
                category_id: pc.category_id,
                category_name: (pc.categories as any).name,
                club_name: (pc.categories as any).clubs?.name || "",
                sport_type: (pc.categories as any).rugby_type,
                position: player.position || undefined,
                avatar_url: player.avatar_url || undefined,
                cover_image_url: (pc.categories as any).cover_image_url || undefined,
              });
              existingCategoryIds.add(pc.category_id);
            }
          }
        }
      }

      setAllAthleteEntries(entries);

      // If a specific category is selected via query param, use it
      if (queryCategoryId) {
        const selected = entries.find(e => e.category_id === queryCategoryId);
        if (selected) {
          setAthleteInfo(selected);
          setShowCategorySelector(false);
          return;
        }
      }

      // Always show category selector first (user clicks to enter)
      setShowCategorySelector(true);
    } catch (err: any) {
      console.error("Error fetching athlete data:", err);
      setLoadError(`Erreur inattendue: ${err?.message || "Contacte ton staff."}`);
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

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Problème de chargement</h2>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => { setLoadError(null); setIsLoading(true); fetchAthleteData(); }}>
                Réessayer
              </Button>
              <Button variant="ghost" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </CardContent>
        </Card>
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

  // Category selector for athletes with multiple categories (or always show first)
  if (showCategorySelector && !athleteInfo) {
    const displayName = allAthleteEntries[0]?.player_first_name
      ? `${allAthleteEntries[0].player_first_name} ${allAthleteEntries[0].player_name}`
      : allAthleteEntries[0]?.player_name || "Athlète";

    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Bonjour {displayName} 👋</h1>
                <p className="text-xs text-muted-foreground">Choisissez votre catégorie</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6">
          <h2 className="text-lg font-semibold mb-4">Mes catégories</h2>
          <div className="grid gap-3">
            {allAthleteEntries.map((entry) => (
              <Card
                key={entry.category_id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => {
                  setAthleteInfo(entry);
                  setShowCategorySelector(false);
                  setSearchParams({ categoryId: entry.category_id });
                }}
              >
                {entry.cover_image_url && (
                  <div className="h-24 w-full overflow-hidden">
                    <img src={entry.cover_image_url} alt={entry.category_name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-base">{entry.category_name}</h3>
                    <p className="text-sm text-muted-foreground">{entry.club_name}</p>
                    {entry.position && (
                      <Badge variant="secondary" className="mt-1 text-xs">{entry.position}</Badge>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!athleteInfo) return null;

  const isBowling = (athleteInfo.sport_type || "").toLowerCase().includes("bowling");
  const isSurf = (athleteInfo.sport_type || "").toLowerCase().includes("surf");
  const isSki = (athleteInfo.sport_type || "").toLowerCase().includes("ski") || (athleteInfo.sport_type || "").toLowerCase().includes("snow");
  const isPadel = (athleteInfo.sport_type || "").toLowerCase().includes("padel");

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
            {(isSuperAdminView || allAthleteEntries.length > 1) && (
              <Button variant="ghost" size="icon" onClick={() => {
                if (isSuperAdminView) {
                  navigate(-1);
                } else {
                  setAthleteInfo(null);
                  setShowCategorySelector(true);
                  setSearchParams({});
                }
              }}>
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
       <Tabs defaultValue={searchParams.get("tab") || "dashboard"} className="w-full">
             <TabsList className="w-full flex overflow-x-auto gap-1 h-auto flex-nowrap justify-start bg-transparent p-0 mb-6 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              <TabsTrigger 
                 value="dashboard" 
                 className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                style={{
                  color: NAV_COLORS.sante.base,
                  backgroundColor: `${NAV_COLORS.sante.base}15`,
                  borderBottom: `3px solid ${NAV_COLORS.sante.base}`,
                  ["--tab-color" as string]: NAV_COLORS.sante.base,
                }}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tableau de bord</span>
                <span className="sm:hidden">Accueil</span>
              </TabsTrigger>
              <TabsTrigger 
                value="rpe"
                 className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                 style={{
                   color: NAV_COLORS.performance.base,
                  backgroundColor: `${NAV_COLORS.performance.base}15`,
                  borderBottom: `3px solid ${NAV_COLORS.performance.base}`,
                  ["--tab-color" as string]: NAV_COLORS.performance.base,
                }}
              >
                <Activity className="h-3.5 w-3.5" />
                RPE
              </TabsTrigger>
               <TabsTrigger 
                 value="wellness"
                  className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                  style={{
                    color: NAV_COLORS.sante.base,
                    backgroundColor: `${NAV_COLORS.sante.base}15`,
                    borderBottom: `3px solid ${NAV_COLORS.sante.base}`,
                    ["--tab-color" as string]: NAV_COLORS.sante.base,
                  }}
                >
                  <Heart className="h-3.5 w-3.5" />
                  Wellness
               </TabsTrigger>
               <TabsTrigger 
                 value="calendar"
                  className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                  style={{
                    color: NAV_COLORS.planification.base,
                    backgroundColor: `${NAV_COLORS.planification.base}15`,
                    borderBottom: `3px solid ${NAV_COLORS.planification.base}`,
                    ["--tab-color" as string]: NAV_COLORS.planification.base,
                  }}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Calendrier
               </TabsTrigger>
              <TabsTrigger 
                value="performance"
                 className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                 style={{
                   color: NAV_COLORS.performance.base,
                  backgroundColor: `${NAV_COLORS.performance.base}15`,
                  borderBottom: `3px solid ${NAV_COLORS.performance.base}`,
                  ["--tab-color" as string]: NAV_COLORS.performance.base,
                }}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Performance
              </TabsTrigger>
              <TabsTrigger 
                value="objectives"
                 className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                 style={{
                   color: NAV_COLORS.planification.base,
                  backgroundColor: `${NAV_COLORS.planification.base}15`,
                  borderBottom: `3px solid ${NAV_COLORS.planification.base}`,
                  ["--tab-color" as string]: NAV_COLORS.planification.base,
                }}
              >
                <Target className="h-3.5 w-3.5" />
                Objectifs
              </TabsTrigger>
              <TabsTrigger 
                value="health"
                 className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                 style={{
                   color: NAV_COLORS.sante.base,
                   backgroundColor: `${NAV_COLORS.sante.base}15`,
                   borderBottom: `3px solid ${NAV_COLORS.sante.base}`,
                   ["--tab-color" as string]: NAV_COLORS.sante.base,
                 }}
               >
                 <Shield className="h-3.5 w-3.5" />
                  Santé
               </TabsTrigger>
               {isBowling && (
                 <TabsTrigger 
                   value="arsenal"
                   className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                   style={{
                     color: NAV_COLORS.programmation.base,
                     backgroundColor: `${NAV_COLORS.programmation.base}15`,
                     borderBottom: `3px solid ${NAV_COLORS.programmation.base}`,
                     ["--tab-color" as string]: NAV_COLORS.programmation.base,
                   }}
                 >
                   <CircleDot className="h-3.5 w-3.5" />
                   Arsenal
                 </TabsTrigger>
               )}
               {isSurf && (
                 <TabsTrigger 
                   value="equipment"
                   className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                   style={{
                     color: NAV_COLORS.programmation.base,
                     backgroundColor: `${NAV_COLORS.programmation.base}15`,
                     borderBottom: `3px solid ${NAV_COLORS.programmation.base}`,
                     ["--tab-color" as string]: NAV_COLORS.programmation.base,
                   }}
                 >
                   <Waves className="h-3.5 w-3.5" />
                   Équipement
                 </TabsTrigger>
               )}
               {isSki && (
                 <TabsTrigger 
                   value="ski-equipment"
                   className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                   style={{
                     color: NAV_COLORS.programmation.base,
                     backgroundColor: `${NAV_COLORS.programmation.base}15`,
                     borderBottom: `3px solid ${NAV_COLORS.programmation.base}`,
                     ["--tab-color" as string]: NAV_COLORS.programmation.base,
                   }}
                 >
                   <Waves className="h-3.5 w-3.5" />
                   Matériel
                 </TabsTrigger>
               )}
               {isPadel && (
                 <TabsTrigger 
                   value="padel-equipment"
                   className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                   style={{
                     color: NAV_COLORS.programmation.base,
                     backgroundColor: `${NAV_COLORS.programmation.base}15`,
                     borderBottom: `3px solid ${NAV_COLORS.programmation.base}`,
                     ["--tab-color" as string]: NAV_COLORS.programmation.base,
                   }}
                 >
                   🏓
                   Matériel
                 </TabsTrigger>
               )}
               <TabsTrigger 
                  value="documents"
                  className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                  style={{
                    color: NAV_COLORS.admin.base,
                    backgroundColor: `${NAV_COLORS.admin.base}15`,
                    borderBottom: `3px solid ${NAV_COLORS.admin.base}`,
                    ["--tab-color" as string]: NAV_COLORS.admin.base,
                  }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Documents
                </TabsTrigger>
               {(
                  <TabsTrigger 
                    value="messaging"
                    className="athlete-tab shrink-0 relative gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                    style={{
                      color: NAV_COLORS.communication.base,
                      backgroundColor: `${NAV_COLORS.communication.base}15`,
                      borderBottom: `3px solid ${NAV_COLORS.communication.base}`,
                      ["--tab-color" as string]: NAV_COLORS.communication.base,
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Messagerie
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </TabsTrigger>
                )}
               {(
                  <TabsTrigger 
                    value="settings"
                     className="athlete-tab shrink-0 gap-1 px-2 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 data-[state=active]:shadow-lg"
                     style={{
                       color: NAV_COLORS.settings.base,
                       backgroundColor: `${NAV_COLORS.settings.base}15`,
                       borderBottom: `3px solid ${NAV_COLORS.settings.base}`,
                       ["--tab-color" as string]: NAV_COLORS.settings.base,
                    }}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Paramètres
                  </TabsTrigger>
                )}
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

          <TabsContent value="calendar">
            <AthleteSpaceCalendar
              playerId={athleteInfo.player_id}
              categoryId={athleteInfo.category_id}
              sportType={athleteInfo.sport_type}
            />
          </TabsContent>

          <TabsContent value="performance">
            <AthleteSpacePerformance
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

          {isBowling && (
            <TabsContent value="arsenal">
              <PlayerBowlingArsenal
                playerId={athleteInfo.player_id}
                categoryId={athleteInfo.category_id}
              />
            </TabsContent>
          )}
           {isSurf && (
            <TabsContent value="equipment">
              <PlayerSurfEquipment
                playerId={athleteInfo.player_id}
                categoryId={athleteInfo.category_id}
              />
            </TabsContent>
          )}
          {isSki && (
            <TabsContent value="ski-equipment">
              <PlayerSkiEquipment
                playerId={athleteInfo.player_id}
                categoryId={athleteInfo.category_id}
              />
            </TabsContent>
          )}
          {isPadel && (
            <TabsContent value="padel-equipment">
              <PlayerPadelEquipment
                playerId={athleteInfo.player_id}
                categoryId={athleteInfo.category_id}
              />
            </TabsContent>
          )}
          <TabsContent value="documents">
              <AthleteSpaceDocuments
                playerId={athleteInfo.player_id}
                categoryId={athleteInfo.category_id}
              />
            </TabsContent>
          <TabsContent value="messaging">
              <MessagingTab categoryId={athleteInfo.category_id} isAthlete={true} />
            </TabsContent>

            <TabsContent value="settings">
              <AthleteSpaceSettings playerId={athleteInfo.player_id} />
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
