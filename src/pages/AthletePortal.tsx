import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, XCircle, Activity, Trophy } from "lucide-react";
import { AthleteRpeEntry } from "@/components/athlete-portal/AthleteRpeEntry";
import { AthleteMatchStats } from "@/components/athlete-portal/AthleteMatchStats";
import { athletePortalHeaders, buildAthletePortalFunctionUrl } from "@/lib/athletePortalClient";

interface AthleteInfo {
  player_id: string;
  player_name: string;
  category_id: string;
  category_name: string;
  club_name: string;
}

export default function AthletePortal() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [athleteInfo, setAthleteInfo] = useState<AthleteInfo | null>(null);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Lien d'accès invalide");
      return;
    }

    const url = buildAthletePortalFunctionUrl("validate", token);
    fetch(url, { headers: athletePortalHeaders() })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
      })
      .then(({ data }) => {
        if (data?.success) {
          setAthleteInfo({
            player_id: data.player_id,
            player_name: data.player_name,
            category_id: data.category_id,
            category_name: data.category_name,
            club_name: data.club_name,
          });
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage(data?.error || "Ce lien n'est plus valide ou a expiré");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Erreur de connexion au serveur");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">
              Validation de votre accès...
            </p>
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
            <p className="text-center font-medium text-destructive">
              {errorMessage}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Demandez un nouveau lien d'accès à votre coach.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-card">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{athleteInfo?.player_name}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary">{athleteInfo?.category_name}</Badge>
                  <span className="text-muted-foreground">{athleteInfo?.club_name}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Portal Instructions */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Portail Athlète</strong> - Utilisez ce portail pour saisir vos données personnelles : 
              RPE après les entraînements et statistiques après les matchs. Ces données seront automatiquement 
              synchronisées avec votre coach.
            </p>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="rpe" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rpe" className="gap-2">
              <Activity className="h-4 w-4" />
              Séances & RPE
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-2">
              <Trophy className="h-4 w-4" />
              Compétitions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rpe" className="mt-6">
            <AthleteRpeEntry token={token!} playerId={athleteInfo!.player_id} categoryId={athleteInfo!.category_id} />
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
            <AthleteMatchStats token={token!} playerId={athleteInfo!.player_id} categoryId={athleteInfo!.category_id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
