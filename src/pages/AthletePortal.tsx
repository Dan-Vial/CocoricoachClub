import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, User, XCircle, Activity, Trophy, LogOut, BarChart3, CalendarPlus } from "lucide-react";
import { AthleteRpeEntry } from "@/components/athlete-portal/AthleteRpeEntry";
import { AthleteMatchStats } from "@/components/athlete-portal/AthleteMatchStats";
import { AthleteTrainingStats } from "@/components/athlete-portal/AthleteTrainingStats";
import { AthleteCreateSession } from "@/components/athlete-portal/AthleteCreateSession";
import { AthletePWAInstallPopup } from "@/components/athlete/AthletePWAInstallPopup";
import { athletePortalHeaders, buildAthletePortalFunctionUrl } from "@/lib/athletePortalClient";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AthleteInfo {
  player_id: string;
  player_name: string;
  player_first_name?: string;
  category_id: string;
  category_name: string;
  club_name: string;
  sport_type?: string;
}

export default function AthletePortal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [athleteInfo, setAthleteInfo] = useState<AthleteInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const token = searchParams.get("token");

  const isBowling = athleteInfo?.sport_type?.toLowerCase().startsWith("bowling");

  useEffect(() => {
    if (user && user.user_metadata?.is_athlete) {
      fetchLoggedInAthleteData();
    } else if (token) {
      validateToken();
    } else if (user) {
      navigate("/");
    } else {
      setStatus("error");
      setErrorMessage("Lien d'accès invalide");
    }
  }, [token, user]);

  const fetchLoggedInAthleteData = async () => {
    try {
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select(`
          id, name, first_name, category_id,
          categories!inner(name, rugby_type, clubs!inner(name))
        `)
        .eq("user_id", user!.id)
        .single();

      if (playerError || !player) {
        setStatus("error");
        setErrorMessage("Aucun profil athlète lié à ce compte");
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
      });
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Erreur lors du chargement des données");
    }
  };

  const validateToken = async () => {
    const url = buildAthletePortalFunctionUrl("validate", token!);
    try {
      const res = await fetch(url, { headers: athletePortalHeaders() });
      const data = await res.json().catch(() => ({}));
      if (data?.success) {
        setAthleteInfo({
          player_id: data.player_id,
          player_name: data.player_name,
          category_id: data.category_id,
          category_name: data.category_name,
          club_name: data.club_name,
          sport_type: data.sport_type,
        });
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(data?.error || "Ce lien n'est plus valide ou a expiré");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Erreur de connexion au serveur");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">Chargement de ton espace athlète...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8 space-y-4">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-center font-medium text-destructive">{errorMessage}</p>
            <p className="text-sm text-muted-foreground text-center">Contacte ton coach pour obtenir de l'aide.</p>
            {user && (
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Se déconnecter
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = athleteInfo?.player_first_name
    ? `${athleteInfo.player_first_name} ${athleteInfo.player_name}`
    : athleteInfo?.player_name;

  const tabCount = isBowling ? 4 : 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <AthletePWAInstallPopup playerId={athleteInfo?.player_id} />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{displayName}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary">{athleteInfo?.category_name}</Badge>
                    <span className="text-muted-foreground">{athleteInfo?.club_name}</span>
                  </CardDescription>
                </div>
              </div>
              {user && (
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Instructions */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Ton espace athlète</strong> – Saisis tes données personnelles :
              RPE après les entraînements{isBowling ? ", feuilles de score, exercices de précision" : ""} et statistiques après les matchs.
            </p>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="rpe" className="w-full">
          <TabsList className={`grid w-full ${isBowling ? "grid-cols-4" : "grid-cols-2"}`}>
            <TabsTrigger value="rpe" className="gap-1 text-xs sm:text-sm">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Séances & RPE</span>
              <span className="sm:hidden">RPE</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-1 text-xs sm:text-sm">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Compétitions</span>
              <span className="sm:hidden">Compét.</span>
            </TabsTrigger>
            {isBowling && (
              <>
                <TabsTrigger value="stats" className="gap-1 text-xs sm:text-sm">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Stats Entraînement</span>
                  <span className="sm:hidden">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="create" className="gap-1 text-xs sm:text-sm">
                  <CalendarPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Ajouter Séance</span>
                  <span className="sm:hidden">+ Séance</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="rpe" className="mt-6">
            <AthleteRpeEntry
              key={refreshKey}
              token={token || undefined}
              playerId={athleteInfo!.player_id}
              categoryId={athleteInfo!.category_id}
              sportType={athleteInfo?.sport_type}
              onRefreshStats={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
            <AthleteMatchStats
              token={token || undefined}
              playerId={athleteInfo!.player_id}
              categoryId={athleteInfo!.category_id}
              sportType={athleteInfo?.sport_type}
            />
          </TabsContent>

          {isBowling && (
            <>
              <TabsContent value="stats" className="mt-6">
                <AthleteTrainingStats
                  key={`stats-${refreshKey}`}
                  token={token || undefined}
                  playerId={athleteInfo!.player_id}
                  categoryId={athleteInfo!.category_id}
                />
              </TabsContent>

              <TabsContent value="create" className="mt-6">
                <AthleteCreateSession
                  token={token || undefined}
                  onSessionCreated={handleRefresh}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
