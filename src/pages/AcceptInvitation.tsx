import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setMessage("Lien d'invitation invalide");
      return;
    }

    if (authLoading) return;

    if (!user) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=/accept-invitation?token=${token}`);
      return;
    }

    acceptInvitation(token);
  }, [user, authLoading, searchParams, navigate]);

  const acceptInvitation = async (token: string) => {
    try {
      const { data, error } = await (supabase as any).rpc("accept_club_invitation", {
        _token: token,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; club_id?: string };

      if (result.success && result.club_id) {
        setStatus("success");
        setMessage("Invitation acceptée avec succès !");
        setTimeout(() => {
          navigate(`/clubs/${result.club_id}`);
        }, 2000);
      } else {
        setStatus("error");
        setMessage(result.error || "Erreur lors de l'acceptation de l'invitation");
      }
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      setStatus("error");
      setMessage("Une erreur est survenue");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="text-center">Invitation au Club</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Traitement de votre invitation...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-center font-medium">{message}</p>
              <p className="text-sm text-muted-foreground">
                Redirection vers le club...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center font-medium text-destructive">{message}</p>
              <Button onClick={() => navigate("/")}>
                Retour à l'accueil
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
