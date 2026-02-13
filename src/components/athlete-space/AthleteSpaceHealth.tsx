import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  playerId: string;
  categoryId: string;
}

const REHAB_PHASES = [
  { phase: 1, label: "Protection", description: "Repos, soins, réduction inflammation" },
  { phase: 2, label: "Mobilité", description: "Récupération amplitude articulaire" },
  { phase: 3, label: "Renforcement", description: "Travail musculaire progressif" },
  { phase: 4, label: "Réathlétisation", description: "Retour progressif à l'activité sportive" },
  { phase: 5, label: "Performance", description: "Retour compétition" },
];

export function AthleteSpaceHealth({ playerId, categoryId }: Props) {
  const { data: injuries = [] } = useQuery({
    queryKey: ["athlete-space-injuries-detail", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injuries")
        .select("*")
        .eq("player_id", playerId)
        .in("status", ["active", "recovering"])
        .order("injury_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rehabProtocols = [] } = useQuery({
    queryKey: ["athlete-space-rehab", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rehab_protocols")
        .select("*")
        .eq("player_id", playerId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: concussions = [] } = useQuery({
    queryKey: ["athlete-space-concussions", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concussion_protocols")
        .select("*")
        .eq("player_id", playerId)
        .neq("status", "cleared")
        .order("incident_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const hasNoIssues = injuries.length === 0 && concussions.length === 0;

  const getHealthFeedback = (): string[] => {
    const msgs: string[] = [];
    if (hasNoIssues) {
      msgs.push("✅ Aucune blessure en cours. Tu es apte à l'entraînement complet.");
      return msgs;
    }

    injuries.forEach(inj => {
      if (inj.status === "active") {
        msgs.push(`🔴 ${inj.injury_type}: blessure active depuis le ${format(new Date(inj.injury_date), "dd/MM/yyyy")}.`);
        if (inj.estimated_return_date) {
          msgs.push(`📅 Retour estimé: ${format(new Date(inj.estimated_return_date), "dd MMM yyyy", { locale: fr })}`);
        }
      } else if (inj.status === "recovering") {
        msgs.push(`🟡 ${inj.injury_type}: en réathlétisation. Respecte les consignes de ton staff médical.`);
      }
    });

    return msgs;
  };

  const getAuthorizations = () => {
    if (hasNoIssues) {
      return [
        { label: "Musculation", authorized: true },
        { label: "Sprint", authorized: true },
        { label: "Contact", authorized: true },
        { label: "Match", authorized: true },
      ];
    }

    const hasActive = injuries.some(i => i.status === "active");
    const currentPhase = rehabProtocols.length > 0 ? (rehabProtocols[0].current_phase || 1) : hasActive ? 1 : 3;

    return [
      { label: "Musculation", authorized: currentPhase >= 3 },
      { label: "Sprint", authorized: currentPhase >= 4 },
      { label: "Contact", authorized: currentPhase >= 4 && !hasActive },
      { label: "Match", authorized: currentPhase >= 5 && !hasActive },
    ];
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-status-optimal" />
            État de santé
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getHealthFeedback().map((msg, i) => (
            <p key={i} className="text-sm leading-relaxed mb-1">{msg}</p>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Autorisations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {getAuthorizations().map(auth => (
              <div key={auth.label} className={`flex items-center gap-2 p-3 rounded-lg ${
                auth.authorized ? "bg-status-optimal/10" : "bg-destructive/10"
              }`}>
                {auth.authorized ? (
                  <CheckCircle2 className="h-4 w-4 text-status-optimal flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                )}
                <span className="text-sm font-medium">{auth.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {injuries.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Étapes de rééducation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {REHAB_PHASES.map((phase) => {
                const currentPhase = rehabProtocols.length > 0 ? (rehabProtocols[0].current_phase || 1) : 1;
                const isActive = phase.phase === currentPhase;
                const isDone = phase.phase < currentPhase;

                return (
                  <div key={phase.phase} className={`flex items-center gap-3 p-2 rounded-lg ${
                    isActive ? "bg-accent/10 border border-accent/30" : isDone ? "bg-status-optimal/5" : "opacity-50"
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone ? "bg-status-optimal text-white" : isActive ? "bg-accent text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {isDone ? "✓" : phase.phase}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{phase.label}</p>
                      <p className="text-[11px] text-muted-foreground">{phase.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {concussions.length > 0 && (
        <Card className="bg-gradient-card shadow-md border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Protocole commotion
            </CardTitle>
          </CardHeader>
          <CardContent>
            {concussions.map((c) => (
              <div key={c.id} className="space-y-1">
                <p className="text-sm">Phase actuelle: <strong>{c.return_to_play_phase || 1}/6</strong></p>
                <p className="text-xs text-muted-foreground">
                  Incident: {format(new Date(c.incident_date), "dd MMM yyyy", { locale: fr })}
                </p>
                {c.medical_notes && (
                  <p className="text-xs text-muted-foreground mt-1">Notes: {c.medical_notes}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
