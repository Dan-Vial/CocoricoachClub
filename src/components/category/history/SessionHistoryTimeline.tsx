import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Calendar, Clock, Dumbbell, Activity, Brain, Heart, 
  ChevronDown, ChevronRight, Filter, Search,
  MapPin, TestTube, Zap, TrendingUp, Moon, AlertTriangle, Target
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  calculateBlocksSummary, getSessionTypeLabel, getObjectiveLabel, 
  getIntensityLabel, getVolumeLabel, getContactChargeLabel 
} from "@/lib/constants/sessionBlockOptions";

interface SessionHistoryTimelineProps {
  categoryId: string;
  playerId?: string; // Optional: filter by player
}

interface TimelineEvent {
  id: string;
  date: string;
  type: "training" | "gym" | "reathletisation" | "test" | "match";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  data: any;
  wellness?: any;
  awcr?: any;
  attendance?: any;
  gymExercises?: any[];
  blocks?: any[];
}

export function SessionHistoryTimeline({ categoryId, playerId }: SessionHistoryTimelineProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState(30); // days

  const startDate = format(subDays(new Date(), dateRange), "yyyy-MM-dd");

  // Fetch training sessions
  const { data: sessions } = useQuery({
    queryKey: ["session-history-sessions", categoryId, startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .gte("session_date", startDate)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch attendance
  const { data: attendance } = useQuery({
    queryKey: ["session-history-attendance", categoryId, startDate, playerId],
    queryFn: async () => {
      let query = supabase
        .from("training_attendance")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .gte("attendance_date", startDate);
      
      if (playerId) query = query.eq("player_id", playerId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch wellness data
  const { data: wellness } = useQuery({
    queryKey: ["session-history-wellness", categoryId, startDate, playerId],
    queryFn: async () => {
      let query = supabase
        .from("wellness_tracking")
        .select("*")
        .eq("category_id", categoryId)
        .gte("tracking_date", startDate);
      
      if (playerId) query = query.eq("player_id", playerId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch AWCR data
  const { data: awcrData } = useQuery({
    queryKey: ["session-history-awcr", categoryId, startDate, playerId],
    queryFn: async () => {
      let query = supabase
        .from("awcr_tracking")
        .select("*")
        .eq("category_id", categoryId)
        .gte("session_date", startDate);
      
      if (playerId) query = query.eq("player_id", playerId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch session blocks
  const { data: sessionBlocks } = useQuery({
    queryKey: ["session-history-blocks", categoryId, startDate],
    queryFn: async () => {
      if (!sessions || sessions.length === 0) return [];
      const sessionIds = sessions.map(s => s.id);
      const { data, error } = await supabase
        .from("training_session_blocks")
        .select("*")
        .in("training_session_id", sessionIds)
        .order("block_order");
      if (error) throw error;
      return data;
    },
    enabled: !!sessions && sessions.length > 0,
  });

  // Fetch gym exercises
  const { data: gymExercises } = useQuery({
    queryKey: ["session-history-gym", categoryId, playerId],
    queryFn: async () => {
      let query = supabase
        .from("gym_session_exercises")
        .select("*")
        .eq("category_id", categoryId)
        .order("order_index");
      
      if (playerId) query = query.eq("player_id", playerId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch tests (speed, jump, etc.)
  const { data: speedTests } = useQuery({
    queryKey: ["session-history-speed", categoryId, startDate, playerId],
    queryFn: async () => {
      let query = supabase
        .from("speed_tests")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .gte("test_date", startDate);
      
      if (playerId) query = query.eq("player_id", playerId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: jumpTests } = useQuery({
    queryKey: ["session-history-jump", categoryId, startDate, playerId],
    queryFn: async () => {
      let query = supabase
        .from("jump_tests")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .gte("test_date", startDate);
      
      if (playerId) query = query.eq("player_id", playerId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch generic tests (from session builder)
  const { data: genericTests } = useQuery({
    queryKey: ["session-history-generic-tests", categoryId, startDate, playerId],
    queryFn: async () => {
      let query = supabase
        .from("generic_tests")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .gte("test_date", startDate);
      
      if (playerId) query = query.eq("player_id", playerId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch matches
  const { data: matches } = useQuery({
    queryKey: ["session-history-matches", categoryId, startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("category_id", categoryId)
        .gte("match_date", startDate)
        .order("match_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Build timeline events
  const buildTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Training sessions
    sessions?.forEach((session) => {
      const sessionAttendance = attendance?.filter(
        (a) => a.training_session_id === session.id || a.attendance_date === session.session_date
      );
      const sessionWellness = wellness?.filter((w) => w.tracking_date === session.session_date);
      const sessionAwcr = awcrData?.filter((a) => a.session_date === session.session_date);
      const sessionGym = gymExercises?.filter((g) => g.training_session_id === session.id);
      const sessionBlocksData = sessionBlocks?.filter((b) => b.training_session_id === session.id) || [];

      let type: "training" | "gym" | "reathletisation" = "training";
      let icon = <MapPin className="h-4 w-4" />;
      let color = "bg-green-500";

      if (session.training_type === "musculation") {
        type = "gym";
        icon = <Dumbbell className="h-4 w-4" />;
        color = "bg-blue-500";
      } else if (session.training_type === "reathlétisation") {
        type = "reathletisation";
        icon = <Heart className="h-4 w-4" />;
        color = "bg-purple-500";
      }

      const typeLabels: Record<string, string> = {
        collectif: "Collectif",
        musculation: "Musculation",
        physique: "Prépa physique",
        reathlétisation: "Réathlétisation",
        technique_individuelle: "Technique",
        test: "Test",
        repos: "Repos",
      };

      events.push({
        id: session.id,
        date: session.session_date,
        type,
        title: typeLabels[session.training_type] || session.training_type,
        subtitle: session.session_start_time?.slice(0, 5),
        icon,
        color,
        data: session,
        wellness: sessionWellness,
        awcr: sessionAwcr,
        attendance: sessionAttendance,
        gymExercises: sessionGym,
        blocks: sessionBlocksData,
      });
    });

    // Tests
    speedTests?.forEach((test) => {
      const testLabel = test.test_type === "40m" ? "40m" : "1600m";
      const timeValue = test.test_type === "40m" 
        ? `${test.time_40m_seconds}s` 
        : `${test.time_1600m_minutes}'${test.time_1600m_seconds}"`;
      
      events.push({
        id: `speed-${test.id}`,
        date: test.test_date,
        type: "test",
        title: `Test Vitesse ${testLabel}`,
        subtitle: timeValue,
        icon: <Zap className="h-4 w-4" />,
        color: "bg-amber-500",
        data: test,
      });
    });

    jumpTests?.forEach((test) => {
      events.push({
        id: `jump-${test.id}`,
        date: test.test_date,
        type: "test",
        title: `Test ${test.test_type}`,
        subtitle: `${test.result_cm}cm`,
        icon: <TrendingUp className="h-4 w-4" />,
        color: "bg-amber-500",
        data: test,
      });
    });

    // Generic tests (from session builder)
    genericTests?.forEach((test) => {
      const testLabel = test.test_type?.replace(/_/g, " ") || test.test_category;
      const resultValue = `${test.result_value}${test.result_unit ? ` ${test.result_unit}` : ""}`;
      
      events.push({
        id: `generic-${test.id}`,
        date: test.test_date,
        type: "test",
        title: `Test ${testLabel}`,
        subtitle: resultValue,
        icon: <TestTube className="h-4 w-4" />,
        color: "bg-emerald-500",
        data: test,
      });
    });

    // Matches
    matches?.forEach((match) => {
      events.push({
        id: `match-${match.id}`,
        date: match.match_date,
        type: "match",
        title: `Match vs ${match.opponent}`,
        subtitle: match.score_home !== null ? `${match.score_home} - ${match.score_away}` : undefined,
        icon: <Activity className="h-4 w-4" />,
        color: "bg-red-500",
        data: match,
      });
    });

    // Sort by date descending
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const timeline = buildTimeline();

  // Filter timeline
  const filteredTimeline = timeline.filter((event) => {
    if (typeFilter !== "all" && event.type !== typeFilter) return false;
    if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by date
  const groupedByDate = filteredTimeline.reduce((acc, event) => {
    const dateKey = event.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  const calculateTonnage = (exercises: any[]) => {
    return exercises.reduce((total, ex) => {
      const weight = ex.weight_kg || 0;
      const sets = ex.sets || 0;
      const reps = ex.reps || 0;
      return total + (weight * sets * reps);
    }, 0);
  };

  const getWellnessScore = (wellnessData: any) => {
    if (!wellnessData) return null;
    const scores = [
      wellnessData.sleep_quality,
      wellnessData.sleep_duration,
      wellnessData.general_fatigue,
      wellnessData.stress_level,
    ].filter(Boolean);
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Historique des Séances
        </CardTitle>
        <CardDescription>
          Timeline chronologique avec données de charge, wellness et détails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout</SelectItem>
              <SelectItem value="training">Terrain</SelectItem>
              <SelectItem value="gym">Musculation</SelectItem>
              <SelectItem value="reathletisation">Réathlé</SelectItem>
              <SelectItem value="test">Tests</SelectItem>
              <SelectItem value="match">Matchs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
            <SelectTrigger className="w-[130px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">3 mois</SelectItem>
              <SelectItem value="180">6 mois</SelectItem>
              <SelectItem value="365">1 an</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">
              {timeline.filter((e) => e.type === "training").length}
            </p>
            <p className="text-xs text-green-700">Terrain</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">
              {timeline.filter((e) => e.type === "gym").length}
            </p>
            <p className="text-xs text-blue-700">Musculation</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-amber-600">
              {timeline.filter((e) => e.type === "test").length}
            </p>
            <p className="text-xs text-amber-700">Tests</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-600">
              {timeline.filter((e) => e.type === "match").length}
            </p>
            <p className="text-xs text-red-700">Matchs</p>
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[500px]">
          <div className="space-y-4 pr-4">
            {Object.entries(groupedByDate).map(([date, events]) => (
              <div key={date} className="relative">
                {/* Date header */}
                <div className="sticky top-0 bg-background z-10 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm font-medium text-muted-foreground px-2">
                      {format(new Date(date), "EEEE d MMMM", { locale: fr })}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                </div>

                {/* Events for this date */}
                <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
                  {events.map((event) => {
                    const isExpanded = expandedEvent === event.id;

                    return (
                      <Collapsible
                        key={event.id}
                        open={isExpanded}
                        onOpenChange={(open) => setExpandedEvent(open ? event.id : null)}
                      >
                        <div className="relative">
                          {/* Timeline dot */}
                          <div className={cn(
                            "absolute -left-[21px] w-4 h-4 rounded-full flex items-center justify-center",
                            event.color
                          )}>
                            <div className="text-white scale-75">{event.icon}</div>
                          </div>

                          {/* Event card */}
                          <CollapsibleTrigger asChild>
                            <div className={cn(
                              "ml-4 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                              isExpanded && "bg-muted/50"
                            )}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{event.title}</span>
                                  {event.subtitle && (
                                    <span className="text-sm text-muted-foreground">
                                      {event.subtitle}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Quick badges */}
                                  {event.attendance && event.attendance.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {event.attendance.filter((a: any) => a.status === "present").length} présents
                                    </Badge>
                                  )}
                                  {event.awcr && event.awcr.length > 0 && (
                                    <Badge variant="outline" className="text-xs bg-orange-50">
                                      AWCR {(event.awcr.reduce((acc: number, a: any) => acc + (a.awcr || 0), 0) / event.awcr.length).toFixed(2)}
                                    </Badge>
                                  )}
                                  {event.gymExercises && event.gymExercises.length > 0 && (
                                    <Badge variant="outline" className="text-xs bg-blue-50">
                                      {calculateTonnage(event.gymExercises).toLocaleString()}kg
                                    </Badge>
                                  )}
                                  <ChevronDown className={cn(
                                    "h-4 w-4 transition-transform",
                                    isExpanded && "rotate-180"
                                  )} />
                                </div>
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          {/* Expanded content */}
                          <CollapsibleContent>
                            <div className="ml-4 mt-2 p-4 rounded-lg bg-muted/30 border space-y-4">
                              {/* Block summary */}
                              {event.blocks && event.blocks.length > 0 && (() => {
                                const summary = calculateBlocksSummary(event.blocks);
                                return (
                                  <div>
                                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                      <Target className="h-4 w-4" />
                                      Paramètres de séance
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {summary.mainSessionType && (
                                        <Badge variant="secondary">
                                          Type: {getSessionTypeLabel(summary.mainSessionType)}
                                        </Badge>
                                      )}
                                      {summary.secondarySessionTypes.length > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          ({summary.secondarySessionTypes.map(t => getSessionTypeLabel(t)).join(", ")})
                                        </Badge>
                                      )}
                                      {summary.avgIntensity && (
                                        <Badge variant="outline">
                                          Intensité: {getIntensityLabel(summary.avgIntensity)}
                                        </Badge>
                                      )}
                                      {summary.avgVolume && (
                                        <Badge variant="outline">
                                          Volume: {getVolumeLabel(summary.avgVolume)}
                                        </Badge>
                                      )}
                                      {summary.avgContactCharge && (
                                        <Badge variant="outline">
                                          Contact: {getContactChargeLabel(summary.avgContactCharge)}
                                        </Badge>
                                      )}
                                      {summary.dominantObjectives.length > 0 && (
                                        <Badge variant="outline">
                                          Objectifs: {summary.dominantObjectives.map(o => getObjectiveLabel(o)).join(", ")}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Session details */}
                              {event.data.notes && (
                                <p className="text-sm text-muted-foreground">{event.data.notes}</p>
                              )}

                              {/* Gym exercises */}
                              {event.gymExercises && event.gymExercises.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                    <Dumbbell className="h-4 w-4" />
                                    Exercices ({event.gymExercises.length})
                                  </h4>
                                  <div className="space-y-1">
                                    {event.gymExercises.map((ex: any) => (
                                      <div key={ex.id} className="flex justify-between text-sm p-2 bg-background rounded">
                                        <span className="font-medium">{ex.exercise_name}</span>
                                        <span className="text-muted-foreground">
                                          {ex.sets}×{ex.reps} @ {ex.weight_kg}kg
                                          {ex.rpe && <span className="ml-2 text-orange-600">RPE {ex.rpe}</span>}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 text-right">
                                    <Badge className="bg-blue-100 text-blue-700">
                                      Tonnage total: {calculateTonnage(event.gymExercises).toLocaleString()}kg
                                    </Badge>
                                  </div>
                                </div>
                              )}

                              {/* AWCR & Load */}
                              {event.awcr && event.awcr.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Charge d'entraînement
                                  </h4>
                                  <div className="grid grid-cols-3 gap-2">
                                    {event.awcr.slice(0, 6).map((a: any) => (
                                      <div key={a.id} className="p-2 bg-background rounded text-center">
                                        <p className="text-xs text-muted-foreground truncate">
                                          {a.player_id.slice(0, 8)}
                                        </p>
                                        <p className="font-bold">{a.training_load}</p>
                                        <p className={cn(
                                          "text-xs",
                                          a.awcr > 1.3 ? "text-red-600" : 
                                          a.awcr < 0.8 ? "text-amber-600" : "text-green-600"
                                        )}>
                                          AWCR {a.awcr?.toFixed(2)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Wellness */}
                              {event.wellness && event.wellness.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                    <Moon className="h-4 w-4" />
                                    Wellness du jour
                                  </h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {event.wellness.slice(0, 4).map((w: any) => (
                                      <div key={w.id} className="p-2 bg-background rounded">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs">Score</span>
                                          <span className={cn(
                                            "font-bold",
                                            parseFloat(getWellnessScore(w) || "3") <= 2 ? "text-green-600" :
                                            parseFloat(getWellnessScore(w) || "3") >= 4 ? "text-red-600" : 
                                            "text-amber-600"
                                          )}>
                                            {getWellnessScore(w)}/5
                                          </span>
                                        </div>
                                        {w.has_specific_pain && (
                                          <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            {w.pain_location || "Douleur"}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Attendance */}
                              {event.attendance && event.attendance.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                    <Activity className="h-4 w-4" />
                                    Présences ({event.attendance.length})
                                  </h4>
                                  <div className="flex flex-wrap gap-1">
                                    {event.attendance.map((a: any) => (
                                      <Badge
                                        key={a.id}
                                        variant="outline"
                                        className={cn(
                                          "text-xs",
                                          a.status === "present" && "bg-green-50 text-green-700",
                                          a.status === "absent" && "bg-red-50 text-red-700",
                                          a.status === "excused" && "bg-amber-50 text-amber-700",
                                          a.status === "late" && "bg-orange-50 text-orange-700"
                                        )}
                                      >
                                        {a.players?.name || a.player_id.slice(0, 8)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredTimeline.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucune séance trouvée pour cette période</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
