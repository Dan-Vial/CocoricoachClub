import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Shield, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type InvitationStatus = "loading" | "valid" | "invalid" | "expired" | "already_used" | "accepting" | "success";

interface InvitationData {
  email: string;
  name: string | null;
  expires_at: string;
}

export default function AcceptAmbassadorInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<InvitationStatus>("loading");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isSignUp, setIsSignUp] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    checkInvitation();
  }, [token]);

  useEffect(() => {
    // If user is already logged in, try to accept immediately
    if (user && status === "valid") {
      acceptInvitation();
    }
  }, [user, status]);

  const checkInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from("ambassador_invitations")
        .select("email, name, status, expires_at")
        .eq("token", token)
        .maybeSingle();

      if (error || !data) {
        setStatus("invalid");
        return;
      }

      if (data.status === "accepted") {
        setStatus("already_used");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setStatus("expired");
        return;
      }

      setInvitation({ email: data.email, name: data.name, expires_at: data.expires_at });
      setFormData(prev => ({ ...prev, email: data.email, fullName: data.name || "" }));
      setStatus("valid");
    } catch (err) {
      console.error("Error checking invitation:", err);
      setStatus("invalid");
    }
  };

  const acceptInvitation = async () => {
    setStatus("accepting");
    try {
      const { data, error } = await supabase.rpc("accept_ambassador_invitation", {
        invitation_token: token,
      });

      if (error) throw error;

      setStatus("success");
      toast.success("Bienvenue ! Vous êtes maintenant ambassadeur.");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast.error(err.message || "Erreur lors de l'acceptation");
      setStatus("valid");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        // Sign up new user
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.fullName },
            emailRedirectTo: `${window.location.origin}/ambassador-invitation?token=${token}`,
          },
        });

        if (error) throw error;

        toast.success("Compte créé ! Vérifiez votre email ou connectez-vous.");
      } else {
        // Sign in existing user
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        // The useEffect will handle accepting the invitation when user state updates
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      toast.error(err.message || "Erreur d'authentification");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "invalid" || status === "expired" || status === "already_used") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>
              {status === "invalid" && "Lien invalide"}
              {status === "expired" && "Lien expiré"}
              {status === "already_used" && "Invitation déjà utilisée"}
            </CardTitle>
            <CardDescription>
              {status === "invalid" && "Ce lien d'invitation n'est pas valide."}
              {status === "expired" && "Ce lien d'invitation a expiré."}
              {status === "already_used" && "Cette invitation a déjà été acceptée."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/auth">Retour à la connexion</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Bienvenue, Ambassadeur !</CardTitle>
            <CardDescription>
              Votre compte ambassadeur a été activé avec succès. Redirection en cours...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "accepting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <CardTitle>Activation en cours...</CardTitle>
            <CardDescription>
              Configuration de votre compte ambassadeur...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Invitation Ambassadeur</CardTitle>
          <CardDescription>
            {invitation?.name ? `Bienvenue ${invitation.name} !` : "Bienvenue !"} Créez votre compte pour devenir ambassadeur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled
              />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Votre nom"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSignUp ? "Créer mon compte" : "Se connecter"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {isSignUp ? (
                <>
                  Déjà un compte ?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="text-primary hover:underline"
                  >
                    Se connecter
                  </button>
                </>
              ) : (
                <>
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="text-primary hover:underline"
                  >
                    Créer un compte
                  </button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
