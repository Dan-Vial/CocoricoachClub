import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Users, User, AlertTriangle, TrendingDown, TrendingUp, Minus, ArrowUp, ArrowDown } from "lucide-react";
import {
  getGpsPositionGroups,
  getPlayerPositionGroup,
  getObjectiveStatus,
  getDeviationPercent,
  getLoadDirection,
  type ObjectiveStatus,
  type LoadDirection,
} from "@/lib/constants/gpsPositionGroups";

interface GpsObjectivesDashboardProps {
  categoryId: string;
  trainingSessionId: string;
  sportType: string;
  sessionDate: string;
}

function LoadArrow({ direction }: { direction: LoadDirection }) {
  switch (direction) {
    case "over":
      return <ArrowUp className="h-3.5 w-3.5 text-red-500" />;
    case "under":
      return <ArrowDown className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return <Minus className="h-3.5 w-3.5 text-emerald-500" />;
  }
}

function StatusBadge({ status, deviation }: { status: ObjectiveStatus; deviation: number | null }) {
  if (status === "none") return <span className="text-muted-foreground text-xs">—</span>;

  const colors: Record<ObjectiveStatus, string> = {
    green: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300",
    orange: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300",
    red: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-300",
    none: "",
  };

  const sign = deviation != null && deviation > 0 ? "+" : "";

  return (
    <Badge variant="outline" className={`text-xs font-mono ${colors[status]}`}>
      {deviation != null ? `${sign}${deviation}%` : "—"}
    </Badge>
  );
}

function MetricCell({
  actual,
  target,
  toleranceGreen,
  toleranceOrange,
  unit = "",
}: {
  actual: number | null | undefined;
  target: number | null | undefined;
  toleranceGreen: number;
  toleranceOrange: number;
  unit?: string;
}) {
  const status = getObjectiveStatus(actual, target, toleranceGreen, toleranceOrange);
  const deviation = getDeviationPercent(actual, target);
  const direction = getLoadDirection(actual, target, toleranceGreen);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">
          {actual != null ? `${Math.round(actual)}${unit}` : "—"}
        </span>
        {actual != null && target != null && <LoadArrow direction={direction} />}
      </div>
      <StatusBadge status={status} deviation={deviation} />
    </div>
  );
}

export function GpsObjectivesDashboard({
  categoryId,
  trainingSessionId,
  sportType,
  sessionDate,
}: GpsObjectivesDashboardProps) {
  const positionGroups = getGpsPositionGroups(sportType);

  const { data: objectives } = useQuery({
    queryKey: ["gps-objectives", trainingSessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_session_objectives")
        .select("*")
        .eq("training_session_id", trainingSessionId);
      if (error) throw error;
      return data;
    },
  });

  const { data: gpsData } = useQuery({
    queryKey: ["gps-sessions-for-objectives", trainingSessionId, sessionDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gps_sessions")
        .select("*, players(id, name, first_name, position)")
        .eq("category_id", categoryId)
        .or(`training_session_id.eq.${trainingSessionId},session_date.eq.${sessionDate}`);
      if (error) throw error;
      return data;
    },
    enabled: !!sessionDate,
  });

  const playerAnalysis = useMemo(() => {
    if (!gpsData || !objectives || objectives.length === 0) return [];

    return gpsData.map(gps => {
      const player = gps.players as { id: string; name: string; first_name: string | null; position: string | null } | null;
      const playerGroup = getPlayerPositionGroup(player?.position, positionGroups);

      // Priority: specific position group objective > Global fallback
      const specificObjective = playerGroup 
        ? objectives.find(o => o.position_group === playerGroup.label)
        : null;
      const globalObjective = objectives.find(o => o.position_group === "Global");
      const objective = specificObjective || globalObjective || null;

      if (!objective) return { gps, player, objective: null, statuses: {}, directions: {} };

      const tGreen = Number(objective.tolerance_green) || 15;
      const tOrange = Number(objective.tolerance_orange) || 30;

      // Use sprint_count if available, otherwise fall back to sprint_distance_m
      const actualSprint = gps.sprint_count != null 
        ? Number(gps.sprint_count) 
        : (gps.sprint_distance_m != null ? Number(gps.sprint_distance_m) : null);
      const targetSprint = objective.target_sprint_count;

      const statuses = {
        distance: getObjectiveStatus(
          gps.total_distance_m ? Number(gps.total_distance_m) : null,
          objective.target_total_distance_m ? Number(objective.target_total_distance_m) : null,
          tGreen, tOrange
        ),
        hsr: getObjectiveStatus(
          gps.high_speed_distance_m ? Number(gps.high_speed_distance_m) : null,
          objective.target_high_speed_distance_m ? Number(objective.target_high_speed_distance_m) : null,
          tGreen, tOrange
        ),
        sprints: getObjectiveStatus(
          actualSprint,
          targetSprint,
          tGreen, tOrange
        ),
      };

      const directions = {
        distance: getLoadDirection(
          gps.total_distance_m ? Number(gps.total_distance_m) : null,
          objective.target_total_distance_m ? Number(objective.target_total_distance_m) : null,
          tGreen
        ),
        hsr: getLoadDirection(
          gps.high_speed_distance_m ? Number(gps.high_speed_distance_m) : null,
          objective.target_high_speed_distance_m ? Number(objective.target_high_speed_distance_m) : null,
          tGreen
        ),
        sprints: getLoadDirection(
          actualSprint,
          targetSprint,
          tGreen
        ),
      };

      return { gps, player, objective, statuses, directions, actualSprint };
    });
  }, [gpsData, objectives, positionGroups]);

  const teamStats = useMemo(() => {
    if (playerAnalysis.length === 0) return null;

    const withObjectives = playerAnalysis.filter(p => p.objective);
    if (withObjectives.length === 0) return null;

    const allStatuses = withObjectives.flatMap(p => Object.values(p.statuses));
    const validStatuses = allStatuses.filter(s => s !== "none");
    const greenCount = validStatuses.filter(s => s === "green").length;
    const orangeCount = validStatuses.filter(s => s === "orange").length;
    const redCount = validStatuses.filter(s => s === "red").length;
    const total = validStatuses.length;

    const underExposed = withObjectives.filter(p => {
      const deviations = [
        getDeviationPercent(
          p.gps.total_distance_m ? Number(p.gps.total_distance_m) : null,
          p.objective?.target_total_distance_m ? Number(p.objective.target_total_distance_m) : null
        ),
      ].filter(d => d !== null);
      return deviations.some(d => d! < -15);
    });

    const overExposed = withObjectives.filter(p => {
      const deviations = [
        getDeviationPercent(
          p.gps.total_distance_m ? Number(p.gps.total_distance_m) : null,
          p.objective?.target_total_distance_m ? Number(p.objective.target_total_distance_m) : null
        ),
      ].filter(d => d !== null);
      return deviations.some(d => d! > 15);
    });

    return {
      globalCompliance: total > 0 ? Math.round((greenCount / total) * 100) : 0,
      greenCount,
      orangeCount,
      redCount,
      underExposed,
      overExposed,
    };
  }, [playerAnalysis]);

  const positionGroupAnalysis = useMemo(() => {
    if (!objectives || objectives.length === 0) return [];

    return objectives
      .filter(o => o.position_group !== "Global")
      .map(objective => {
        const players = playerAnalysis.filter(p => {
          const group = getPlayerPositionGroup(p.player?.position, positionGroups);
          return group?.label === objective.position_group;
        });

        const withData = players.filter(p => p.gps.total_distance_m != null);
        const avgDistance = withData.length > 0
          ? withData.reduce((acc, p) => acc + (Number(p.gps.total_distance_m) || 0), 0) / withData.length
          : null;
        const avgHsr = withData.length > 0
          ? withData.reduce((acc, p) => acc + (Number(p.gps.high_speed_distance_m) || 0), 0) / withData.length
          : null;

        const inTarget = withData.filter(p => {
          const allGreen = Object.values(p.statuses).every(s => s === "green" || s === "none");
          return allGreen;
        }).length;

        return {
          name: objective.position_group,
          objective,
          playerCount: players.length,
          avgDistance,
          avgHsr,
          inTargetPercent: withData.length > 0 ? Math.round((inTarget / withData.length) * 100) : 0,
        };
      });
  }, [objectives, playerAnalysis, positionGroups]);

  if (!objectives || objectives.length === 0) return null;

  if (!gpsData || gpsData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Objectifs GPS définis — Importez les données GPS pour voir la comparaison</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Objectifs GPS — Résultats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team overview */}
        {teamStats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{teamStats.globalCompliance}%</p>
              <p className="text-xs text-muted-foreground">Conformité</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
              <p className="text-2xl font-bold text-emerald-600">{teamStats.greenCount}</p>
              <p className="text-xs text-muted-foreground">Dans la cible</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
              <p className="text-2xl font-bold text-amber-600">{teamStats.orangeCount}</p>
              <p className="text-xs text-muted-foreground">Attention</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-center">
              <p className="text-2xl font-bold text-red-600">{teamStats.redCount}</p>
              <p className="text-xs text-muted-foreground">Hors cible</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{playerAnalysis.length}</p>
              <p className="text-xs text-muted-foreground">Joueurs</p>
            </div>
          </div>
        )}

        {/* Under/Over exposed alerts */}
        {teamStats && (teamStats.underExposed.length > 0 || teamStats.overExposed.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {teamStats.underExposed.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded">
                <TrendingDown className="h-3 w-3" />
                Sous-exposés: {teamStats.underExposed.map(p => p.player ? (p.player.first_name ? `${p.player.first_name} ${p.player.name}` : p.player.name) : '').join(", ")}
              </div>
            )}
            {teamStats.overExposed.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
                <TrendingUp className="h-3 w-3" />
                Sur-exposés: {teamStats.overExposed.map(p => p.player ? (p.player.first_name ? `${p.player.first_name} ${p.player.name}` : p.player.name) : '').join(", ")}
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="players">
          <TabsList className="grid grid-cols-3 w-full max-w-sm">
            <TabsTrigger value="players" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              Joueurs
            </TabsTrigger>
            <TabsTrigger value="positions" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Postes
            </TabsTrigger>
            <TabsTrigger value="team" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Équipe
            </TabsTrigger>
          </TabsList>

          {/* Player view */}
          <TabsContent value="players">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joueur</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead className="text-center">Distance</TableHead>
                    <TableHead className="text-center">Dist. HI</TableHead>
                    <TableHead className="text-center">Sprint (dist/nb)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerAnalysis.map((p, i) => {
                    const tGreen = p.objective ? Number(p.objective.tolerance_green) || 15 : 15;
                    const tOrange = p.objective ? Number(p.objective.tolerance_orange) || 30 : 30;

                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{p.player ? (p.player.first_name ? `${p.player.first_name} ${p.player.name}` : p.player.name) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getPlayerPositionGroup(p.player?.position, positionGroups)?.label || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <MetricCell
                            actual={p.gps.total_distance_m ? Number(p.gps.total_distance_m) : null}
                            target={p.objective?.target_total_distance_m ? Number(p.objective.target_total_distance_m) : null}
                            toleranceGreen={tGreen}
                            toleranceOrange={tOrange}
                            unit="m"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <MetricCell
                            actual={p.gps.high_speed_distance_m ? Number(p.gps.high_speed_distance_m) : null}
                            target={p.objective?.target_high_speed_distance_m ? Number(p.objective.target_high_speed_distance_m) : null}
                            toleranceGreen={tGreen}
                            toleranceOrange={tOrange}
                            unit="m"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <MetricCell
                            actual={p.actualSprint ?? null}
                            target={p.objective?.target_sprint_count}
                            toleranceGreen={tGreen}
                            toleranceOrange={tOrange}
                            unit={p.gps.sprint_count != null ? "" : "m"}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Position view */}
          <TabsContent value="positions">
            <div className="grid gap-3">
              {positionGroupAnalysis.map(group => (
                <div key={group.name} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{group.name}</Badge>
                    <Badge
                      variant="outline"
                      className={
                        group.inTargetPercent >= 75
                          ? "text-emerald-600 border-emerald-300"
                          : group.inTargetPercent >= 50
                          ? "text-amber-600 border-amber-300"
                          : "text-red-600 border-red-300"
                      }
                    >
                      {group.inTargetPercent}% dans la cible
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Distance moy.</span>
                      <p className="font-medium">{group.avgDistance ? `${Math.round(group.avgDistance)}m` : "—"}</p>
                      <span className="text-xs text-muted-foreground">
                        Cible: {group.objective.target_total_distance_m ? `${Number(group.objective.target_total_distance_m)}m` : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Dist. HI moy.</span>
                      <p className="font-medium">{group.avgHsr ? `${Math.round(group.avgHsr)}m` : "—"}</p>
                      <span className="text-xs text-muted-foreground">
                        Cible: {group.objective.target_high_speed_distance_m ? `${Number(group.objective.target_high_speed_distance_m)}m` : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Joueurs</span>
                      <p className="font-medium">{group.playerCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Team view */}
          <TabsContent value="team">
            {teamStats && (
              <div className="space-y-4">
                <div className="text-center p-6 border rounded-lg">
                  <p className="text-4xl font-bold">{teamStats.globalCompliance}%</p>
                  <p className="text-muted-foreground mt-1">Respect global des objectifs</p>
                </div>

                {teamStats.underExposed.length > 0 && (
                  <div className="p-3 border rounded-lg">
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-blue-500" />
                      Joueurs sous-exposés
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {teamStats.underExposed.map((p, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {p.player?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {teamStats.overExposed.length > 0 && (
                  <div className="p-3 border rounded-lg">
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Joueurs sur-exposés
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {teamStats.overExposed.map((p, i) => (
                        <Badge key={i} variant="outline" className="text-xs text-red-600">
                          {p.player?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
