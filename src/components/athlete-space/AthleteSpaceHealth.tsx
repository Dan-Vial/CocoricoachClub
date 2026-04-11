import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

const PHASE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-red-500/20", text: "text-red-700 dark:text-red-400", border: "border-red-500/30" },
  2: { bg: "bg-orange-500/20", text: "text-orange-700 dark:text-orange-400", border: "border-orange-500/30" },
  3: { bg: "bg-yellow-500/20", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-500/30" },
  4: { bg: "bg-blue-500/20", text: "text-blue-700 dark:text-blue-400", border: "border-blue-500/30" },
  5: { bg: "bg-green-500/20", text: "text-green-700 dark:text-green-400", border: "border-green-500/30" },
};

export function AthleteSpaceHealth({ playerId, categoryId }: Props) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

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
        .select(`
          *,
          injury_protocols (
            id,
            name,
            injury_category,
            protocol_phases (
              id,
              phase_number,
              name,
              description,
              objectives,
              care_instructions,
              taping_instructions,
              taping_diagram_url,
              duration_days_min,
              duration_days_max
            )
          )
        `)
        .eq("player_id", playerId)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: playerExercises = [] } = useQuery({
    queryKey: ["athlete-rehab-exercises", rehabProtocols?.[0]?.id],
    queryFn: async () => {
      if (!rehabProtocols?.[0]?.id) return [];
      const { data, error } = await supabase
        .from("player_rehab_exercises")
        .select("*")
        .eq("player_rehab_protocol_id", rehabProtocols[0].id)
        .order("exercise_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!rehabProtocols?.[0]?.id,
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
  const activeProtocol = rehabProtocols[0];
  const protocolPhases = activeProtocol?.injury_protocols
    ? ((activeProtocol.injury_protocols as any)?.protocol_phases || []).sort((a: any, b: any) => a.phase_number - b.phase_number)
    : [];
  const currentPhaseNumber = activeProtocol?.current_phase || 1;

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

    return [
      { label: "Musculation", authorized: currentPhaseNumber >= 3 },
      { label: "Sprint", authorized: currentPhaseNumber >= 4 },
      { label: "Contact", authorized: currentPhaseNumber >= 4 && !hasActive },
      { label: "Match", authorized: currentPhaseNumber >= 5 && !hasActive },
    ];
  };

  // Use protocol phases if available, otherwise fall back to generic ones
  const displayPhases = protocolPhases.length > 0 ? protocolPhases : (injuries.length > 0 ? REHAB_PHASES.map(p => ({
    phase_number: p.phase,
    name: p.label,
    description: p.description,
    taping_instructions: null,
    taping_diagram_url: null,
    care_instructions: null,
    objectives: null,
  })) : []);

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

      {/* Rehab protocol phases with taping details */}
      {displayPhases.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              {activeProtocol ? (activeProtocol.injury_protocols as any)?.name || "Protocole de réhabilitation" : "Étapes de rééducation"}
            </CardTitle>
            {activeProtocol && (
              <p className="text-xs text-muted-foreground">
                Phase actuelle : {currentPhaseNumber} / {displayPhases.length}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {displayPhases.map((phase: any) => {
                const phaseNum = phase.phase_number || phase.phase;
                const isActive = phaseNum === currentPhaseNumber;
                const isDone = phaseNum < currentPhaseNumber;
                const colors = PHASE_COLORS[phaseNum] || PHASE_COLORS[1];
                const hasTaping = phase.taping_instructions?.length > 0 || phase.taping_diagram_url;
                const hasCare = phase.care_instructions?.length > 0;
                const hasObjectives = phase.objectives?.length > 0;
                const hasDetails = hasTaping || hasCare || hasObjectives;
                const phaseExercises = playerExercises.filter((e: any) => e.phase_number === phaseNum);
                const isExpanded = expandedPhase === phaseNum;

                return (
                  <Collapsible
                    key={phaseNum}
                    open={isExpanded || isActive}
                    onOpenChange={(open) => setExpandedPhase(open ? phaseNum : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        isActive ? `${colors.bg} border ${colors.border}` : isDone ? "bg-status-optimal/5" : "opacity-50"
                      } ${hasDetails || phaseExercises.length > 0 ? "cursor-pointer hover:bg-muted/50" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isDone ? "bg-status-optimal text-white" : isActive ? "bg-accent text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          {isDone ? "✓" : phaseNum}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{phase.name || phase.label}</p>
                            {isActive && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">En cours</Badge>}
                            {hasTaping && <Badge variant="outline" className="text-[10px] px-1.5 py-0">🏷️ Tape</Badge>}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{phase.description}</p>
                        </div>
                        {(hasDetails || phaseExercises.length > 0) && (
                          isExpanded || isActive ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="pl-10 pr-2 pb-2 space-y-3">
                      {/* Objectives */}
                      {hasObjectives && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">🎯 Objectifs</p>
                          <ul className="text-sm space-y-0.5">
                            {(phase.objectives as string[]).map((obj: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className={`mt-1 ${colors.text}`}>•</span>
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Care instructions */}
                      {hasCare && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">🩹 Soins</p>
                          <ul className="text-sm space-y-0.5">
                            {(phase.care_instructions as string[]).map((care: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{care}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Taping / Strapping section */}
                      {hasTaping && (
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                            🏷️ Taping / Strapping
                          </p>
                          {phase.taping_instructions && phase.taping_instructions.length > 0 && (
                            <ul className="text-sm space-y-1 mb-3">
                              {(phase.taping_instructions as string[]).map((instr: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-accent mt-0.5 font-bold">{i + 1}.</span>
                                  <span>{instr}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {phase.taping_diagram_url && (
                            <div>
                              <img
                                src={phase.taping_diagram_url}
                                alt="Schéma de taping"
                                className="w-full max-h-64 object-contain rounded-lg border bg-white cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(phase.taping_diagram_url, '_blank')}
                              />
                              <p className="text-[10px] text-muted-foreground mt-1 text-center">
                                Appuie pour agrandir le schéma
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Exercises for this phase */}
                      {phaseExercises.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">💪 Exercices</p>
                          <div className="space-y-1">
                            {phaseExercises.map((ex: any) => (
                              <div key={ex.id} className="text-sm p-2 bg-background rounded border flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{ex.name}</p>
                                  {ex.description && <p className="text-[11px] text-muted-foreground">{ex.description}</p>}
                                </div>
                                {ex.sets && ex.reps && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {ex.sets}×{ex.reps}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Duration info */}
                      {(phase.duration_days_min || phase.duration_days_max) && (
                        <p className="text-[11px] text-muted-foreground">
                          ⏱ Durée estimée : {phase.duration_days_min}-{phase.duration_days_max} jours
                        </p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
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
