import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Zap, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatarUpload } from "./PlayerAvatarUpload";

interface PlayerProfileProps {
  playerId: string;
  categoryId: string;
  playerName: string;
  avatarUrl?: string | null;
}

type ProfileType = "vitesse" | "mixte" | "endurance" | "insufficient_data";

export function PlayerProfile({ playerId, categoryId, playerName, avatarUrl }: PlayerProfileProps) {
  const { data: speedTests } = useQuery({
    queryKey: ["player_speed_profile", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("*")
        .eq("player_id", playerId)
        .order("test_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calculate profile based on latest tests
  const getPlayerProfile = (): {
    type: ProfileType;
    vma: number | null;
    vmax: number | null;
    ratio: number | null;
  } => {
    const latest40m = speedTests?.find(t => t.test_type === "40m_sprint" && t.speed_kmh);
    const latest1600m = speedTests?.find(t => t.test_type === "1600m_run" && t.vma_kmh);

    if (!latest40m || !latest1600m) {
      return { type: "insufficient_data", vma: null, vmax: null, ratio: null };
    }

    const vmax = latest40m.speed_kmh!;
    const vma = latest1600m.vma_kmh!;
    
    // Ratio VMA/Vmax (en %)
    // Plus le ratio est élevé, plus le joueur est orienté endurance
    // Typiquement:
    // - < 70% : Profil Vitesse (explosif mais moins d'endurance)
    // - 70-80% : Profil Mixte (équilibré)
    // - > 80% : Profil Endurance (excellente endurance aérobie)
    const ratio = (vma / vmax) * 100;

    let type: ProfileType;
    if (ratio < 70) {
      type = "vitesse";
    } else if (ratio >= 70 && ratio <= 80) {
      type = "mixte";
    } else {
      type = "endurance";
    }

    return { type, vma, vmax, ratio };
  };

  const profile = getPlayerProfile();

  const getProfileConfig = () => {
    switch (profile.type) {
      case "vitesse":
        return {
          label: "Profil Vitesse",
          icon: Zap,
          color: "bg-primary text-primary-foreground",
          description: "Explosif et puissant sur courtes distances",
          recommendations: [
            "Travail de vitesse maximale et accélérations",
            "Renforcement musculaire explosif",
            "Améliorer l'endurance pour équilibrer le profil"
          ]
        };
      case "mixte":
        return {
          label: "Profil Mixte",
          icon: Users,
          color: "bg-accent text-accent-foreground",
          description: "Équilibre entre vitesse et endurance",
          recommendations: [
            "Maintenir l'équilibre actuel",
            "Travail de vitesse répétée (RSA)",
            "Continuer le développement harmonieux"
          ]
        };
      case "endurance":
        return {
          label: "Profil Endurance",
          icon: Activity,
          color: "bg-secondary text-secondary-foreground",
          description: "Excellente capacité aérobie",
          recommendations: [
            "Développer la vitesse maximale",
            "Travail de puissance et explosivité",
            "Maintenir le niveau d'endurance élevé"
          ]
        };
      default:
        return {
          label: "Données insuffisantes",
          icon: Activity,
          color: "bg-muted text-muted-foreground",
          description: "Tests VMA et sprint 40m requis",
          recommendations: [
            "Effectuer un test de sprint 40m",
            "Effectuer un test de course 1600m"
          ]
        };
    }
  };

  const config = getProfileConfig();
  const Icon = config.icon;

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          Profil Athlétique
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Analyse basée sur les derniers tests VMA et Vitesse Maximale
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <PlayerAvatarUpload
          playerId={playerId}
          playerName={playerName}
          currentAvatarUrl={avatarUrl}
        />
        <div className="flex items-center justify-between">
          <Badge className={`${config.color} text-lg py-2 px-4`}>
            {config.label}
          </Badge>
          {profile.ratio && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Ratio VMA/Vmax</p>
              <p className="text-2xl font-bold">{profile.ratio.toFixed(1)}%</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground">{config.description}</p>
          
          {profile.vma && profile.vmax && (
            <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">VMA (Endurance)</p>
                <p className="text-xl font-bold text-primary">{profile.vma.toFixed(1)} km/h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vmax (Sprint 40m)</p>
                <p className="text-xl font-bold text-primary">{profile.vmax.toFixed(1)} km/h</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">Recommandations d'entraînement:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {config.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>

        {profile.type === "insufficient_data" && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Pour déterminer le profil athlétique, il faut au minimum:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
              <li>Un test de sprint 40m (pour la Vmax)</li>
              <li>Un test de course 1600m (pour la VMA)</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
