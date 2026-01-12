import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, XCircle, Shield, Users, Calendar, Activity, ArrowRight } from "lucide-react";
import { usePublicAccess } from "@/contexts/PublicAccessContext";

interface OverviewData {
  totalPlayers: number;
  totalSessions: number;
  activeInjuries: number;
  categoryName: string;
  clubName: string;
}

export default function PublicView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { validateToken, isPublicAccess, clubId, categoryId, clubName, categoryName, accessType, token } = usePublicAccess();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [overview, setOverview] = useState<OverviewData | null>(null);

  useEffect(() => {
    const urlToken = searchParams.get("token");

    if (!urlToken) {
      setStatus("error");
      setErrorMessage("Lien d'accès invalide");
      return;
    }

    // Validate the token
    validateToken(urlToken).then(async (success) => {
      if (success) {
        setStatus("success");
        // Fetch overview data
        try {
          const { data, error } = await supabase.functions.invoke("public-data", {
            body: null,
            method: "GET",
          });
          // Use query params for GET
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-data?token=${urlToken}&type=overview`,
            {
              headers: {
                "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
            }
          );
          const result = await response.json();
          if (result.success && result.data) {
            setOverview(result.data);
          }
        } catch (e) {
          console.error("Error fetching overview:", e);
        }
      } else {
        setStatus("error");
        setErrorMessage("Ce lien n'est plus valide ou a expiré");
      }
    });
  }, [searchParams, validateToken]);

  const handleContinue = () => {
    if (categoryId) {
      // Navigate to the real category page (public context allows access)
      navigate(`/categories/${categoryId}`);
    } else if (clubId) {
      // Navigate to the real club page
      navigate(`/clubs/${clubId}`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Eye className="h-5 w-5" />
            Accès Consultation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Validation du lien d'accès...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-lg">Accès autorisé</p>
                <p className="text-muted-foreground">
                  Vous avez accès en consultation à :
                </p>
                <div className="bg-muted/50 rounded-lg p-3 mt-2">
                  {(categoryName || overview?.categoryName) && (
                    <p className="font-semibold">{categoryName || overview?.categoryName}</p>
                  )}
                  {(clubName || overview?.clubName) && (
                    <p className="text-sm text-muted-foreground">{clubName || overview?.clubName}</p>
                  )}
                </div>
              </div>

              {overview && (
                <div className="grid grid-cols-3 gap-3 w-full">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{overview.totalPlayers}</p>
                    <p className="text-xs text-muted-foreground">Joueurs</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{overview.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">Séances</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <Activity className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-bold">{overview.activeInjuries}</p>
                    <p className="text-xs text-muted-foreground">Blessures</p>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200 w-full">
                <p className="font-medium mb-1 flex items-center gap-2">
                  <Badge variant="secondary">Viewer</Badge>
                  Mode consultation
                </p>
                <p className="text-xs">
                  Vous pouvez consulter les données mais pas les modifier.
                </p>
              </div>
              <Button onClick={handleContinue} className="w-full gap-2">
                Accéder aux données
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center font-medium text-destructive">
                {errorMessage}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Demandez un nouveau lien d'accès à l'administrateur.
              </p>
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Se connecter
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
