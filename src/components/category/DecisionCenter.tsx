import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
  import { 
    Users, 
    AlertTriangle, 
    Calendar, 
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    TrendingUp,
    Brain,
    FileWarning,
    Pencil,
    Bell,
    User,
    ChevronRight,
    Heart,
    ClipboardCheck,
    Swords,
    MapPin
  } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  calculateWeightedWellnessScore, 
  getWellnessRiskLevel,
  type WellnessEntry 
} from "@/lib/wellnessCalculations";
import { calculateEWMASeries, transformToDailyLoadData } from "@/lib/trainingLoadCalculations";
import { SessionFormDialog } from "./sessions/SessionFormDialog";
import { NotifyAthletesDialog } from "@/components/notifications/NotifyAthletesDialog";
import { parseTestsFromNotes } from "@/lib/utils/sessionNotes";
import { getTestCategoriesForSport } from "@/lib/constants/testCategories";
import { AddWellnessDialog } from "./AddWellnessDialog";
import { SessionFeedbackDialog } from "./calendar/SessionFeedbackDialog";
import { isIndividualSport } from "@/lib/constants/sportTypes";
 
 interface DecisionCenterProps {
   categoryId: string;
   categoryName?: string;
 }
 
  interface GroupStatus {
    total: number;
    available: number;
    atRisk: number;
    injured: number;
    uncertain: number;
    atRiskPlayers: { id: string; name: string; reason: string }[];
    injuredPlayers: { id: string; name: string }[];
    uncertainPlayers: { id: string; name: string }[];
  }
 
 interface PriorityAlert {
   id: string;
   type: "overload" | "fatigue" | "injury_return" | "admin";
   severity: "critical" | "high" | "medium";
   playerId: string;
   playerName: string;
   message: string;
   action?: string;
 }
 
 interface SessionInfo {
   id: string;
   name: string;
   type: string;
   time: string;
   targetLoad: number;
   playersToAdapt: { id: string; name: string; reason: string }[];
 }
 
 export function DecisionCenter({ categoryId, categoryName }: DecisionCenterProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const today = format(new Date(), "yyyy-MM-dd");
   const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [athleteSelectOpen, setAthleteSelectOpen] = useState(false);
  const [wellnessDialogOpen, setWellnessDialogOpen] = useState(false);
  const [attendanceDetailOpen, setAttendanceDetailOpen] = useState(false);
  const [adaptChargeOpen, setAdaptChargeOpen] = useState(false);
  const [rpeDialogOpen, setRpeDialogOpen] = useState(false);
  const [rpeDialogSessionId, setRpeDialogSessionId] = useState<string | null>(null);
 
    // Fetch players
    const { data: players = [] } = useQuery({
      queryKey: ["players", categoryId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("players")
          .select("id, name, first_name, position")
          .eq("category_id", categoryId);
        if (error) throw error;
        return data;
      },
    });

    const getFullName = (player: { first_name?: string | null; name: string }) =>
      [player.first_name, player.name].filter(Boolean).join(" ");

    // Fetch category sport type for test labels
    const { data: categoryData } = useQuery({
      queryKey: ["category-sport-type", categoryId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("categories")
          .select("rugby_type")
          .eq("id", categoryId)
          .single();
        if (error) throw error;
        return data;
      },
    });

    const sportType = categoryData?.rugby_type || "";
    const isIndividual = isIndividualSport(sportType);
    const matchLabel = isIndividual ? "Compétition" : "Match";
    const testCategories = useMemo(() => getTestCategoriesForSport(sportType), [sportType]);

    // Fetch upcoming matches/competitions
    const { data: upcomingMatches = [] } = useQuery({
      queryKey: ["upcoming_matches_decision", categoryId, today],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("matches")
          .select("*")
          .eq("category_id", categoryId)
          .gte("match_date", today)
          .order("match_date")
          .order("match_time")
          .limit(3);
        if (error) throw error;
        return data;
      },
    });

    const getTestNamesFromSession = (session: any): string[] => {
      const tests = parseTestsFromNotes(session.notes);
      return tests.map(t => {
        const cat = testCategories.find(c => c.value === t.test_category);
        const test = cat?.tests.find(tt => tt.value === t.test_type);
        return test?.label || t.test_type;
      }).filter(Boolean);
    };
 
   // Fetch active injuries
   const { data: injuries = [] } = useQuery({
     queryKey: ["active_injuries", categoryId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("injuries")
         .select("player_id, status, estimated_return_date")
         .eq("category_id", categoryId)
         .in("status", ["active", "recovering"]);
       if (error) throw error;
       return data;
     },
   });
 
   // Fetch AWCR data for EWMA calculation (need 90 days for proper chronic load)
   const { data: awcrDataFull = [] } = useQuery({
     queryKey: ["awcr_decision_full", categoryId],
     queryFn: async () => {
       const ninetyDaysAgo = subDays(new Date(), 90).toISOString().split("T")[0];
       const { data, error } = await supabase
         .from("awcr_tracking")
         .select("player_id, training_load, rpe, duration_minutes, session_date")
         .eq("category_id", categoryId)
         .gte("session_date", ninetyDaysAgo)
         .order("session_date", { ascending: true });
       if (error) throw error;
       return data;
     },
   });

   // Calculate per-player EWMA ratios
   const playerEwmaMap = useMemo(() => {
     const map = new Map<string, number>();
     if (awcrDataFull.length === 0) return map;
     
     // Group by player
     const byPlayer = new Map<string, typeof awcrDataFull>();
     awcrDataFull.forEach(entry => {
       if (!byPlayer.has(entry.player_id)) byPlayer.set(entry.player_id, []);
       byPlayer.get(entry.player_id)!.push(entry);
     });
     
     byPlayer.forEach((entries, playerId) => {
       const dailyData = transformToDailyLoadData(entries, []);
       const ewmaResults = calculateEWMASeries(dailyData, "sRPE");
       if (ewmaResults.length > 0) {
         map.set(playerId, ewmaResults[ewmaResults.length - 1].ratio);
       }
     });
     
     return map;
   }, [awcrDataFull]);
 
  // Fetch wellness data
    const { data: wellnessData = [], refetch: refetchWellness } = useQuery({
      queryKey: ["wellness_decision", categoryId],
      queryFn: async () => {
        const weekAgo = subDays(new Date(), 7).toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("wellness_tracking")
          .select("*")
          .eq("category_id", categoryId)
          .gte("tracking_date", weekAgo)
          .order("tracking_date", { ascending: false });
        if (error) throw error;
        return data;
      },
    });

    // Subscribe to wellness changes for real-time updates
    useEffect(() => {
      const channel = supabase
        .channel(`wellness_${categoryId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wellness_tracking',
            filter: `category_id=eq.${categoryId}`,
          },
          () => {
            refetchWellness();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }, [categoryId, refetchWellness]);

    // Subscribe to training/AWCR changes for real-time updates
    useEffect(() => {
      const channel = supabase
        .channel(`training_decision_${categoryId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'training_sessions',
            filter: `category_id=eq.${categoryId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["today_sessions_decision", categoryId] });
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'awcr_tracking',
            filter: `category_id=eq.${categoryId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["awcr_decision_full", categoryId] });
            queryClient.invalidateQueries({ queryKey: ["priority_alerts_decision", categoryId] });
            queryClient.invalidateQueries({ queryKey: ["ewma_summary", categoryId] });
            queryClient.invalidateQueries({ queryKey: ["awcr-risk", categoryId] });
            queryClient.invalidateQueries({ queryKey: ["training-load-awcr", categoryId] });
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }, [categoryId, queryClient]);

   // Fetch today's sessions
   const { data: todaySessions = [] } = useQuery({
     queryKey: ["today_sessions_decision", categoryId, today],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("training_sessions")
         .select("*")
         .eq("category_id", categoryId)
         .eq("session_date", today)
         .order("session_start_time");
       if (error) throw error;
       return data;
     },
   });
 
   // Fetch tomorrow's sessions
   const { data: tomorrowSessions = [] } = useQuery({
     queryKey: ["tomorrow_sessions_decision", categoryId, tomorrow],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("training_sessions")
         .select("*")
         .eq("category_id", categoryId)
         .eq("session_date", tomorrow)
         .order("session_start_time");
       if (error) throw error;
       return data;
     },
   });
 
    // Fetch today's attendance with session info
    const { data: todayAttendance = [] } = useQuery({
      queryKey: ["today_attendance_decision", categoryId, today],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("training_attendance")
          .select("*, players(name, first_name), training_sessions(id, training_type, session_start_time)")
          .eq("category_id", categoryId)
          .eq("attendance_date", today);
        if (error) throw error;
        return data;
      },
    });

    // Fetch today's RPE data
    const { data: todayRpeData = [] } = useQuery({
      queryKey: ["today_rpe_decision", categoryId, today],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("awcr_tracking")
          .select("player_id, rpe, training_session_id")
          .eq("category_id", categoryId)
          .eq("session_date", today);
        if (error) throw error;
        return data;
      },
    });

    // Subscribe to RPE changes for real-time updates
    useEffect(() => {
      const channel = supabase
        .channel(`rpe_decision_${categoryId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'awcr_tracking',
            filter: `category_id=eq.${categoryId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["today_rpe_decision", categoryId] });
          }
        )
        .subscribe();

      return () => { channel.unsubscribe(); };
    }, [categoryId, queryClient]);


    const { data: expiredDocs = [] } = useQuery({
      queryKey: ["expired_docs", categoryId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("admin_documents")
          .select("*, players(name, first_name)")
          .eq("category_id", categoryId)
          .lte("expiry_date", today)
          .eq("status", "pending");
        if (error) throw error;
        return data || [];
      },
    });
 
   // Calculate group status
    const calculateGroupStatus = (): GroupStatus => {
      const total = players.length;
      const injuredPlayerIds = new Set(injuries.filter(i => i.status === "active").map(i => i.player_id));
      const uncertainPlayerIds = new Set(injuries.filter(i => i.status === "recovering").map(i => i.player_id));
      
      const atRiskPlayersList: { id: string; name: string; reason: string }[] = [];
      
      players.forEach(player => {
        if (injuredPlayerIds.has(player.id) || uncertainPlayerIds.has(player.id)) return;
        
        const ewmaRatio = playerEwmaMap.get(player.id);
        const playerWellness = wellnessData.find(w => w.player_id === player.id);
        
        let reason = "";
        if (ewmaRatio != null && (ewmaRatio > 1.5 || ewmaRatio < 0.8)) {
          reason = `EWMA ${ewmaRatio.toFixed(2)}`;
        }
        
        if (playerWellness) {
          const score = calculateWeightedWellnessScore(playerWellness as WellnessEntry);
          const risk = getWellnessRiskLevel(score, playerWellness.has_specific_pain);
          if (risk === "critical" || risk === "high") {
            reason = reason ? `${reason} + Wellness ${score.toFixed(1)}` : `Wellness ${score.toFixed(1)}/5`;
          }
        }
        
        if (reason) {
          atRiskPlayersList.push({ id: player.id, name: getFullName(player), reason });
        }
      });

      const injuredPlayers = injuries
        .filter(i => i.status === "active")
        .map(i => {
          const p = players.find(pl => pl.id === i.player_id);
          return { id: i.player_id, name: p ? getFullName(p) : "Inconnu" };
        });

      const uncertainPlayers = injuries
        .filter(i => i.status === "recovering")
        .map(i => {
          const p = players.find(pl => pl.id === i.player_id);
          return { id: i.player_id, name: p ? getFullName(p) : "Inconnu" };
        });

      const injured = injuredPlayerIds.size;
      const uncertain = uncertainPlayerIds.size;
      const atRisk = atRiskPlayersList.length;
      const available = total - injured - uncertain;
  
      return { total, available, atRisk, injured, uncertain, atRiskPlayers: atRiskPlayersList, injuredPlayers, uncertainPlayers };
    };
 
   // Calculate priority alerts
   const calculatePriorityAlerts = (): PriorityAlert[] => {
     const alerts: PriorityAlert[] = [];
 
     players.forEach(player => {
       // Overload alerts (EWMA > 1.5)
       const ewmaRatio = playerEwmaMap.get(player.id);
       if (ewmaRatio != null && ewmaRatio > 1.5) {
          alerts.push({
            id: `overload-${player.id}`,
            type: "overload",
            severity: ewmaRatio > 1.8 ? "critical" : "high",
            playerId: player.id,
            playerName: getFullName(player),
            message: `Ratio EWMA à ${ewmaRatio.toFixed(2)} - Réduire la charge`,
            action: "Adapter charge",
          });
       }
 
       // Mental fatigue (wellness > 3.5 = bad state, scale: 1=excellent, 5=very bad)
       const playerWellness = wellnessData.find(w => w.player_id === player.id);
       if (playerWellness) {
         const score = calculateWeightedWellnessScore(playerWellness as WellnessEntry);
         if (score > 3.5) {
           alerts.push({
             id: `fatigue-${player.id}`,
             type: "fatigue",
             severity: score > 4.2 ? "critical" : "high",
             playerId: player.id,
              playerName: getFullName(player),
             message: `Fatigue détectée (${score.toFixed(1)}/5)`,
             action: "Voir fiche",
           });
         }
       }
 
       // Injury return alerts
       const playerInjury = injuries.find(i => i.player_id === player.id && i.status === "recovering");
       if (playerInjury?.estimated_return_date) {
         const returnDate = new Date(playerInjury.estimated_return_date);
         const daysUntil = Math.ceil((returnDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
         if (daysUntil <= 3 && daysUntil >= 0) {
           alerts.push({
             id: `return-${player.id}`,
             type: "injury_return",
             severity: "medium",
             playerId: player.id,
             playerName: getFullName(player),
             message: `Retour prévu ${daysUntil === 0 ? "aujourd'hui" : `dans ${daysUntil}j`}`,
             action: "Valider reprise",
           });
         }
       }
     });
 
     // Admin alerts (expired documents)
     expiredDocs.forEach(doc => {
       alerts.push({
         id: `admin-${doc.id}`,
         type: "admin",
         severity: "medium",
         playerId: doc.player_id || "",
         playerName: doc.players?.name || "Équipe",
         message: `${doc.title} - Document expiré`,
         action: "Régulariser",
       });
     });
 
     // Sort by severity
     return alerts.sort((a, b) => {
       const order = { critical: 0, high: 1, medium: 2 };
       return order[a.severity] - order[b.severity];
     }).slice(0, 6); // Show max 6 alerts
   };
 
   // Calculate players to adapt for a session
   const getPlayersToAdapt = (): { id: string; name: string; reason: string }[] => {
     const toAdapt: { id: string; name: string; reason: string }[] = [];
     
      players.forEach(player => {
        const ewmaRatio = playerEwmaMap.get(player.id);
        const playerWellness = wellnessData.find(w => w.player_id === player.id);
        
        if (ewmaRatio != null && ewmaRatio > 1.3) {
          toAdapt.push({
            id: player.id,
            name: getFullName(player),
            reason: `EWMA ${ewmaRatio.toFixed(2)}`,
         });
       } else if (playerWellness) {
         const score = calculateWeightedWellnessScore(playerWellness as WellnessEntry);
         if (score > 3) {
            toAdapt.push({
              id: player.id,
              name: getFullName(player),
              reason: `Wellness ${score.toFixed(1)}/5`,
           });
         }
       }
     });
     
     return toAdapt;
   };
 
    const groupStatus = calculateGroupStatus();
    const priorityAlerts = calculatePriorityAlerts();
    const playersToAdapt = getPlayersToAdapt();
    const availabilityPercent = groupStatus.total > 0 ? Math.round((groupStatus.available / groupStatus.total) * 100) : 100;

    // Calculate today's wellness status
    const getTodayWellnessStatus = () => {
      const todayWellness = wellnessData.filter(w => w.tracking_date === today);
      const filledPlayerIds = new Set(todayWellness.map(w => w.player_id));
      const filledCount = filledPlayerIds.size;
      const filledPercent = players.length > 0 ? Math.round((filledCount / players.length) * 100) : 0;
      
       const filledPlayers = players.filter(p => filledPlayerIds.has(p.id)).map(p => getFullName(p));
       const missingPlayers = players.filter(p => !filledPlayerIds.has(p.id)).map(p => getFullName(p));
      
      return { filledCount, filledPercent, filledPlayers, missingPlayers };
    };
    
    const wellnessStatus = getTodayWellnessStatus();

    // Calculate today's RPE status per session
    const getTodayRpeStatus = () => {
      if (todaySessions.length === 0) return [];
      
      return todaySessions.map(session => {
        // Get participants for this session (from attendance or all players)
        const sessionAttendance = todayAttendance.filter(
          a => a.training_session_id === session.id && (a.status === "present" || a.status === "late")
        );
        const participantIds = sessionAttendance.length > 0 
          ? sessionAttendance.map(a => a.player_id)
          : players.map(p => p.id);
        
        const totalParticipants = participantIds.length;
        const sessionRpe = todayRpeData.filter(r => r.training_session_id === session.id);
        const filledIds = new Set(sessionRpe.map(r => r.player_id));
        const filledCount = participantIds.filter(id => filledIds.has(id)).length;
        const filledPercent = totalParticipants > 0 ? Math.round((filledCount / totalParticipants) * 100) : 0;
        
        const missingPlayers = players
          .filter(p => participantIds.includes(p.id) && !filledIds.has(p.id))
          .map(p => getFullName(p));
        const filledPlayers = players
          .filter(p => participantIds.includes(p.id) && filledIds.has(p.id))
          .map(p => getFullName(p));
        
        return {
          sessionId: session.id,
          sessionName: session.training_type,
          sessionTime: session.session_start_time?.slice(0, 5) || "",
          plannedIntensity: session.planned_intensity || 5,
          totalParticipants,
          filledCount,
          filledPercent,
          filledPlayers,
          missingPlayers,
        };
      });
    };

    const rpeStatus = getTodayRpeStatus();


   const getAlertIcon = (type: PriorityAlert["type"]) => {
     switch (type) {
       case "overload": return <TrendingUp className="h-4 w-4" />;
       case "fatigue": return <Brain className="h-4 w-4" />;
       case "injury_return": return <Activity className="h-4 w-4" />;
       case "admin": return <FileWarning className="h-4 w-4" />;
     }
   };
 
   const getSeverityColor = (severity: PriorityAlert["severity"]) => {
     switch (severity) {
       case "critical": return "text-red-600 bg-red-100 dark:bg-red-900/30";
       case "high": return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
       case "medium": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
     }
   };
 
   const handleEditSession = (session: any) => {
     setEditingSession(session);
     setEditSessionOpen(true);
   };
 
   return (
     <div className="space-y-4">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h2 className="text-2xl font-bold">Centre de décision</h2>
           <p className="text-muted-foreground text-sm">
             {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
           </p>
         </div>
       </div>
 
        {/* 1️⃣ ÉTAT DU GROUPE - 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Col 1: État du groupe */}
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                État du groupe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Disponibilité</span>
                  <span className={cn(
                    "text-2xl font-bold",
                    availabilityPercent >= 80 ? "text-green-600" : 
                    availabilityPercent >= 60 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {availabilityPercent}%
                  </span>
                </div>
                <Progress 
                  value={availabilityPercent} 
                  className={cn(
                    "h-3",
                    availabilityPercent >= 80 ? "[&>div]:bg-green-500" : 
                    availabilityPercent >= 60 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {groupStatus.available} / {groupStatus.total} athlètes disponibles
                </p>
                {groupStatus.atRisk === 0 && groupStatus.injured === 0 && groupStatus.uncertain === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400 text-sm">
                      Groupe au complet
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Col 2: Joueurs à risque */}
          <Card className="border-2 border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                À risque
                {groupStatus.atRisk > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {groupStatus.atRisk}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupStatus.atRiskPlayers.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Aucun joueur à risque</p>
                </div>
              ) : (
                <ScrollArea className={groupStatus.atRiskPlayers.length > 4 ? "h-[180px]" : ""}>
                  <div className="space-y-1.5">
                    {groupStatus.atRiskPlayers.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-900/10 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"
                        onClick={() => navigate(`/players/${p.id}`)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-[11px] text-orange-600 dark:text-orange-400">{p.reason}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Col 3: Blessés */}
          <Card className="border-2 border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Blessés / Incertains
                {(groupStatus.injured + groupStatus.uncertain) > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {groupStatus.injured + groupStatus.uncertain}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupStatus.injuredPlayers.length === 0 && groupStatus.uncertainPlayers.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Aucun blessé</p>
                </div>
              ) : (
                <ScrollArea className={(groupStatus.injuredPlayers.length + groupStatus.uncertainPlayers.length) > 4 ? "h-[180px]" : ""}>
                  <div className="space-y-1.5">
                    {groupStatus.injuredPlayers.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/10 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        onClick={() => navigate(`/players/${p.id}`)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <p className="text-sm font-medium truncate">{p.name}</p>
                        </div>
                        <Badge className="text-[10px] bg-red-500 text-white shrink-0">Blessé</Badge>
                      </div>
                    ))}
                    {groupStatus.uncertainPlayers.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
                        onClick={() => navigate(`/players/${p.id}`)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                          <p className="text-sm font-medium truncate">{p.name}</p>
                        </div>
                        <Badge className="text-[10px] bg-yellow-500 text-white shrink-0">Réathléti.</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 1.5️⃣ WELLNESS DU JOUR */}
        <Card className="border-2 border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-600" />
              Wellness du jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Taux de remplissage</span>
                  <span className={cn(
                    "text-2xl font-bold",
                    wellnessStatus.filledPercent >= 80 ? "text-green-600" : 
                    wellnessStatus.filledPercent >= 50 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {wellnessStatus.filledPercent}%
                  </span>
                </div>
                <Progress 
                  value={wellnessStatus.filledPercent} 
                  className={cn(
                    "h-3",
                    wellnessStatus.filledPercent >= 80 ? "[&>div]:bg-green-500" : 
                    wellnessStatus.filledPercent >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {wellnessStatus.filledCount} / {players.length} ont rempli leur wellness
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                {wellnessStatus.filledPercent === 100 ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400 text-sm">
                      Tous complétés
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="font-semibold text-orange-700 dark:text-orange-400 text-sm">
                      {wellnessStatus.missingPlayers.length} en attente
                    </span>
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={() => setWellnessDialogOpen(true)}
                  className="w-full"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Ajouter manuel
                </Button>
              </div>
            </div>
            
            {/* Missing players list */}
            {wellnessStatus.missingPlayers.length > 0 && wellnessStatus.missingPlayers.length <= 6 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">En attente :</p>
                <div className="flex flex-wrap gap-1">
                  {wellnessStatus.missingPlayers.slice(0, 6).map((name, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {wellnessStatus.missingPlayers.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{wellnessStatus.missingPlayers.length - 6}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 1.55️⃣ RPE DU JOUR */}
        {rpeStatus.length > 0 && (() => {
          const completedSessions = rpeStatus.filter(s => s.filledPercent === 100).length;
          const totalSessions = rpeStatus.length;
          const globalPercent = totalSessions > 0
            ? Math.round(rpeStatus.reduce((sum, s) => sum + s.filledPercent, 0) / totalSessions)
            : 0;
          
          return (
            <Card className="border-2 border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  RPE post-séance du jour
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {completedSessions}/{totalSessions} séance{totalSessions > 1 ? "s" : ""} complétée{completedSessions > 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Global summary when multiple sessions */}
                {totalSessions > 1 && (
                  <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200/50 dark:border-indigo-800/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Progression globale</span>
                      <span className={cn(
                        "text-lg font-bold",
                        globalPercent >= 80 ? "text-green-600" : 
                        globalPercent >= 50 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {globalPercent}%
                      </span>
                    </div>
                    <Progress 
                      value={globalPercent} 
                      className={cn(
                        "h-2",
                        globalPercent >= 80 ? "[&>div]:bg-green-500" : 
                        globalPercent >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                      )}
                    />
                  </div>
                )}

                {/* Per-session details */}
                <Accordion type="multiple" defaultValue={rpeStatus.filter(s => s.filledPercent < 100).map(s => s.sessionId)} className="space-y-2">
                  {rpeStatus.map(session => (
                    <AccordionItem key={session.sessionId} value={session.sessionId} className="border rounded-lg px-3 data-[state=open]:bg-muted/30">
                      <AccordionTrigger className="py-2.5 hover:no-underline gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {session.filledPercent === 100 ? (
                            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <div className={cn(
                              "h-4 w-4 rounded-full border-2 shrink-0",
                              session.filledPercent >= 50 ? "border-yellow-500 bg-yellow-100" : "border-red-400 bg-red-50"
                            )} />
                          )}
                          <span className="text-sm font-medium truncate">{session.sessionName}</span>
                          {session.sessionTime && (
                            <Badge variant="outline" className="text-[10px] shrink-0">{session.sessionTime}</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            Cible: {session.plannedIntensity}/10
                          </span>
                          <span className={cn(
                            "ml-auto text-sm font-bold shrink-0",
                            session.filledPercent >= 80 ? "text-green-600" : 
                            session.filledPercent >= 50 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {session.filledCount}/{session.totalParticipants}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 space-y-2">
                        <Progress 
                          value={session.filledPercent} 
                          className={cn(
                            "h-2.5",
                            session.filledPercent >= 80 ? "[&>div]:bg-green-500" : 
                            session.filledPercent >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                          )}
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {session.filledCount} / {session.totalParticipants} ont rempli leur RPE
                          </p>
                          {session.filledPercent < 100 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setRpeDialogSessionId(session.sessionId);
                                setRpeDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Saisir RPE
                            </Button>
                          )}
                        </div>
                        {session.missingPlayers.length > 0 && (
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-1">Non rempli :</p>
                            <div className="flex flex-wrap gap-1">
                              {session.missingPlayers.slice(0, 10).map((name, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] text-orange-600 border-orange-200 dark:border-orange-800">
                                  {name}
                                </Badge>
                              ))}
                              {session.missingPlayers.length > 10 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{session.missingPlayers.length - 10}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        {session.filledPlayers.length > 0 && (
                          <Collapsible>
                            <CollapsibleTrigger className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                              <ChevronRight className="h-3 w-3" />
                              Voir les {session.filledPlayers.length} complétés
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-1">
                              <div className="flex flex-wrap gap-1">
                                {session.filledPlayers.map((name, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[10px]">
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })()}

        {/* 1.6️⃣ PRÉSENCES DU JOUR */}
          <Card className="border-2 border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
                Présences du jour
                {todayAttendance.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {todayAttendance.length} / {players.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  Aucune présence enregistrée pour aujourd'hui
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Summary badges */}
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const present = todayAttendance.filter(a => a.status === "present").length;
                      const late = todayAttendance.filter(a => a.status === "late").length;
                      const absent = todayAttendance.filter(a => a.status === "absent").length;
                      const excused = todayAttendance.filter(a => a.status === "excused").length;
                      const notMarked = players.length - todayAttendance.length;
                      return (
                        <>
                          {present > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-xs font-semibold text-green-700 dark:text-green-400">{present} présent{present > 1 ? "s" : ""}</span>
                            </div>
                          )}
                          {late > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                              <Clock className="h-3.5 w-3.5 text-orange-600" />
                              <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">{late} en retard</span>
                            </div>
                          )}
                          {absent > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                              <XCircle className="h-3.5 w-3.5 text-red-600" />
                              <span className="text-xs font-semibold text-red-700 dark:text-red-400">{absent} absent{absent > 1 ? "s" : ""}</span>
                            </div>
                          )}
                          {excused > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{excused} excusé{excused > 1 ? "s" : ""}</span>
                            </div>
                          )}
                          {notMarked > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted">
                              <span className="text-xs font-semibold text-muted-foreground">{notMarked} non pointé{notMarked > 1 ? "s" : ""}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Detail list for absent/late/excused with reasons */}
                  {todayAttendance.filter(a => a.status !== "present").length > 0 && (
                    <div className="border-t pt-3 space-y-1.5">
                      {todayAttendance
                        .filter(a => a.status !== "present")
                        .map(entry => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {entry.status === "absent" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                              {entry.status === "late" && <Clock className="h-4 w-4 text-orange-500 shrink-0" />}
                              {entry.status === "excused" && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                              <div className="min-w-0">
                                <span className="font-medium truncate block">{entry.players?.name}</span>
                                {entry.status === "late" && entry.late_minutes && (
                                  <span className="text-xs text-orange-600 dark:text-orange-400">+{entry.late_minutes} min</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                className={cn(
                                  "text-xs text-white",
                                  entry.status === "absent" ? "bg-red-500" :
                                  entry.status === "late" ? "bg-orange-500" : "bg-amber-500"
                                )}
                              >
                                {entry.status === "absent" ? "Absent" : entry.status === "late" ? `Retard${entry.late_minutes ? ` ${entry.late_minutes}min` : ""}` : "Excusé"}
                              </Badge>
                              {entry.status === "late" && entry.late_reason && (
                                <span className="text-xs text-muted-foreground max-w-[150px] truncate" title={entry.late_reason}>
                                  {entry.late_reason}
                                </span>
                              )}
                              {entry.status !== "late" && entry.absence_reason && (
                                <span className="text-xs text-muted-foreground max-w-[150px] truncate" title={entry.absence_reason}>
                                  {entry.absence_reason}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                </div>
               )}

                  {/* Button to view full attendance details */}
                  <div className="border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => setAttendanceDetailOpen(true)}
                    >
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Voir le détail des présences
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        {/* 1.7️⃣ PROCHAIN MATCH / COMPÉTITION */}
        {upcomingMatches.length > 0 && (
          <Card className="border-2 border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Swords className="h-5 w-5 text-purple-600" />
                {upcomingMatches.length === 1 
                  ? `Prochain ${matchLabel.toLowerCase()}`
                  : `Prochains ${matchLabel.toLowerCase()}s`}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {upcomingMatches.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingMatches.map((match, idx) => {
                  const matchDate = new Date(match.match_date);
                  const isToday = match.match_date === today;
                  const isTomorrow = match.match_date === format(addDays(new Date(), 1), "yyyy-MM-dd");
                  const daysUntil = Math.ceil((matchDate.getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div 
                      key={match.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg transition-colors",
                        isToday 
                          ? "bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700" 
                          : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "flex flex-col items-center justify-center w-12 h-12 rounded-lg text-center shrink-0",
                          isToday 
                            ? "bg-purple-600 text-white" 
                            : "bg-muted"
                        )}>
                          <span className="text-xs font-medium leading-none">
                            {format(matchDate, "EEE", { locale: fr })}
                          </span>
                          <span className="text-lg font-bold leading-none">
                            {format(matchDate, "d")}
                          </span>
                          <span className="text-[10px] leading-none">
                            {format(matchDate, "MMM", { locale: fr })}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">
                              {match.is_home != null 
                                ? (match.is_home ? `vs ${match.opponent}` : `@ ${match.opponent}`)
                                : match.opponent}
                            </p>
                            {match.is_home != null && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px] px-1.5 py-0 shrink-0",
                                  match.is_home 
                                    ? "border-green-500 text-green-600" 
                                    : "border-blue-500 text-blue-600"
                                )}
                              >
                                {match.is_home ? "DOM" : "EXT"}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {match.match_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {match.match_time.slice(0, 5)}
                              </span>
                            )}
                            {match.location && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3" />
                                {match.location}
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5">
                            {isToday ? (
                              <span className="font-semibold text-purple-600 dark:text-purple-400">Aujourd'hui</span>
                            ) : isTomorrow ? (
                              <span className="font-medium text-orange-600 dark:text-orange-400">Demain</span>
                            ) : (
                              <span className="text-muted-foreground">Dans {daysUntil} jour{daysUntil > 1 ? "s" : ""}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
  
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         {/* 2️⃣ AUJOURD'HUI / DEMAIN */}
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-base flex items-center gap-2">
               <Calendar className="h-5 w-5 text-primary" />
               Séances prévues
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             {/* Today */}
             <div>
               <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                 Aujourd'hui
               </p>
               {todaySessions.length === 0 ? (
                 <p className="text-sm text-muted-foreground italic">Pas de séance prévue</p>
               ) : (
                 <div className="space-y-2">
                    {todaySessions.slice(0, 2).map(session => {
                      const testNames = getTestNamesFromSession(session);
                      return (
                        <div 
                          key={session.id} 
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <div>
                              <p className="font-medium text-sm">{session.training_type}</p>
                              <p className="text-xs text-muted-foreground">
                                {session.session_start_time?.slice(0, 5)} • Charge cible: {session.planned_intensity || 5}/10
                              </p>
                              {testNames.length > 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                  🧪 Test : {testNames.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2"
                            onClick={() => handleEditSession(session)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                 </div>
               )}
             </div>
 
             {/* Tomorrow */}
             <div>
               <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                 Demain
               </p>
               {tomorrowSessions.length === 0 ? (
                 <p className="text-sm text-muted-foreground italic">Pas de séance prévue</p>
               ) : (
                 <div className="space-y-2">
                    {tomorrowSessions.slice(0, 2).map(session => {
                      const testNames = getTestNamesFromSession(session);
                      return (
                        <div 
                          key={session.id} 
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{session.training_type}</p>
                              <p className="text-xs text-muted-foreground">
                                {session.session_start_time?.slice(0, 5)} • Charge cible: {session.planned_intensity || 5}/10
                              </p>
                              {testNames.length > 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                  🧪 Test : {testNames.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                 </div>
               )}
             </div>
 
             {/* Players to adapt */}
             {playersToAdapt.length > 0 && (
               <div className="pt-2 border-t">
                 <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">
                   ⚠️ À adapter ({playersToAdapt.length})
                 </p>
                 <div className="flex flex-wrap gap-1">
                   {playersToAdapt.map(p => (
                     <Badge 
                       key={p.id} 
                       variant="outline" 
                       className="text-xs cursor-pointer hover:bg-muted"
                       onClick={() => navigate(`/players/${p.id}`)}
                     >
                       {p.name.split(" ")[0]} • {p.reason}
                     </Badge>
                   ))}
                 </div>
               </div>
             )}
           </CardContent>
         </Card>
 
         {/* 3️⃣ ALERTES PRIORITAIRES */}
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-base flex items-center gap-2">
               <AlertTriangle className="h-5 w-5 text-destructive" />
               Alertes prioritaires
               {priorityAlerts.length > 0 && (
                 <Badge variant="destructive" className="ml-auto">
                   {priorityAlerts.length}
                 </Badge>
               )}
             </CardTitle>
           </CardHeader>
           <CardContent>
             {priorityAlerts.length === 0 ? (
               <div className="text-center py-6">
                 <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                 <p className="text-sm font-medium">Aucune alerte</p>
                 <p className="text-xs text-muted-foreground">Tous les voyants sont au vert</p>
               </div>
             ) : (
               <div className="space-y-2">
                 {priorityAlerts.map(alert => (
                   <div 
                     key={alert.id}
                     className={cn(
                       "flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer hover:opacity-80",
                       getSeverityColor(alert.severity)
                     )}
                     onClick={() => alert.playerId && navigate(`/players/${alert.playerId}`)}
                   >
                     <div className="flex items-center gap-2 flex-1 min-w-0">
                       {getAlertIcon(alert.type)}
                       <div className="min-w-0">
                         <p className="font-medium text-sm truncate">{alert.playerName}</p>
                         <p className="text-xs opacity-80 truncate">{alert.message}</p>
                       </div>
                     </div>
                     {alert.action && (
                       <Button variant="ghost" size="sm" className="h-6 px-2 text-xs shrink-0">
                         {alert.action}
                       </Button>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
       </div>
 
        {/* 4️⃣ RACCOURCIS ACTION */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => todaySessions[0] && handleEditSession(todaySessions[0])}
                disabled={todaySessions.length === 0}
              >
                <Pencil className="h-5 w-5 text-primary" />
                <span className="text-xs">Modifier séance</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => setAdaptChargeOpen(true)}
                disabled={playersToAdapt.length === 0}
              >
                <Activity className="h-5 w-5 text-orange-500" />
                <span className="text-xs">Adapter charge</span>
                {playersToAdapt.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1">
                    {playersToAdapt.length}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => setNotifyDialogOpen(true)}
              >
                <Bell className="h-5 w-5 text-blue-500" />
                <span className="text-xs">Notification</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => setAthleteSelectOpen(true)}
              >
                <User className="h-5 w-5 text-green-500" />
                <span className="text-xs">Fiche athlète</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit Session Dialog - Using SessionFormDialog for full editing */}
        <SessionFormDialog
          open={editSessionOpen}
          onOpenChange={(open) => {
            setEditSessionOpen(open);
            if (!open) setEditingSession(null);
          }}
          categoryId={categoryId}
          editSession={editingSession}
        />

        {/* Notify Athletes Dialog */}
        <NotifyAthletesDialog
          open={notifyDialogOpen}
          onOpenChange={setNotifyDialogOpen}
          athletes={players.map(p => ({ id: p.id, name: p.name }))}
          eventType="custom"
          defaultSubject="Message de l'équipe"
        />

        {/* Athlete Selection Dialog */}
        <Dialog open={athleteSelectOpen} onOpenChange={setAthleteSelectOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Choisir un athlète
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-1 p-1">
                {players.map(player => (
                  <Button
                    key={player.id}
                    variant="ghost"
                    className="w-full justify-between h-auto py-3"
                    onClick={() => {
                      navigate(`/players/${player.id}`);
                      setAthleteSelectOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{player.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                ))}
                {players.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun athlète dans cette catégorie
                  </p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Wellness Dialog */}
        <AddWellnessDialog
          open={wellnessDialogOpen}
          onOpenChange={setWellnessDialogOpen}
          categoryId={categoryId}
        />

        {/* Adapt Charge Dialog */}
        <Dialog open={adaptChargeOpen} onOpenChange={setAdaptChargeOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Joueurs à adapter ({playersToAdapt.length})
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-1 p-1">
                {playersToAdapt.map(player => (
                  <Button
                    key={player.id}
                    variant="ghost"
                    className="w-full justify-between h-auto py-3"
                    onClick={() => {
                      navigate(`/players/${player.id}`);
                      setAdaptChargeOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-orange-500" />
                      <div className="text-left">
                        <p className="font-medium">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.reason}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                ))}
                {playersToAdapt.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun joueur ne nécessite d'adaptation
                  </p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>


        <Dialog open={attendanceDetailOpen} onOpenChange={setAttendanceDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
                Détail des présences — {format(new Date(), "dd MMMM yyyy", { locale: fr })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {todayAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune présence enregistrée pour aujourd'hui
                </p>
              ) : (
                (() => {
                  // Group attendance by session
                  const sessionGroups = new Map<string, { session: any; entries: typeof todayAttendance }>();
                  todayAttendance.forEach(entry => {
                    const sessionId = entry.training_session_id || "no-session";
                    if (!sessionGroups.has(sessionId)) {
                      sessionGroups.set(sessionId, { 
                        session: entry.training_sessions || null, 
                        entries: [] 
                      });
                    }
                    sessionGroups.get(sessionId)!.entries.push(entry);
                  });

                  return Array.from(sessionGroups.entries()).map(([sessionId, { session, entries }]) => {
                    const present = entries.filter(a => a.status === "present").length;
                    const late = entries.filter(a => a.status === "late").length;
                    const absent = entries.filter(a => a.status === "absent").length;
                    const excused = entries.filter(a => a.status === "excused").length;
                    const markedPlayerIds = new Set(entries.map(e => e.player_id));
                    const notMarked = players.filter(p => !markedPlayerIds.has(p.id));

                    return (
                      <div key={sessionId} className="space-y-3 border rounded-lg p-4 bg-muted/20">
                        {/* Session header */}
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Activity className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-sm">
                            {session ? `${session.training_type}` : "Séance non définie"}
                          </h4>
                          {session?.session_start_time && (
                            <Badge variant="outline" className="text-xs ml-auto">
                              {session.session_start_time.slice(0, 5)}
                            </Badge>
                          )}
                        </div>

                        {/* Summary badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: "Présents", count: present, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
                            { label: "Retards", count: late, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
                            { label: "Absents", count: absent, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
                            { label: "Excusés", count: excused, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
                          ].map(s => (
                            <div key={s.label} className={cn("rounded-lg p-2 text-center", s.color)}>
                              <p className="text-xl font-bold">{s.count}</p>
                              <p className="text-xs font-medium">{s.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Non-present details */}
                        {entries.filter(a => a.status !== "present").length > 0 && (
                          <div className="space-y-1.5">
                            {entries
                              .filter(a => a.status !== "present")
                              .map(entry => (
                                <div key={entry.id} className="flex items-start justify-between p-2.5 rounded-lg border bg-background text-sm">
                                  <div className="flex items-start gap-2 min-w-0">
                                    {entry.status === "absent" && <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                                    {entry.status === "late" && <Clock className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />}
                                    {entry.status === "excused" && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                                    <div>
                                      <span className="font-medium text-sm">{entry.players?.name}</span>
                                      {entry.status === "late" && (
                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                          {entry.late_minutes && (
                                            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">+{entry.late_minutes} min de retard</span>
                                          )}
                                          {entry.late_reason && (
                                            <p className="text-xs text-muted-foreground">{entry.late_reason}</p>
                                          )}
                                        </div>
                                      )}
                                      {entry.status !== "late" && entry.absence_reason && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{entry.absence_reason}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Badge className={cn("text-xs text-white shrink-0",
                                    entry.status === "absent" ? "bg-red-500" :
                                    entry.status === "late" ? "bg-orange-500" : "bg-amber-500"
                                  )}>
                                    {entry.status === "absent" ? "Absent" : entry.status === "late" ? `Retard${entry.late_minutes ? ` ${entry.late_minutes}min` : ""}` : "Excusé"}
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Present list */}
                        {present > 0 && (
                          <div className="space-y-1">
                            <h5 className="font-medium text-xs text-muted-foreground">Présents ({present})</h5>
                            <div className="flex flex-wrap gap-1.5">
                              {entries.filter(a => a.status === "present").map(entry => (
                                <Badge key={entry.id} variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20">
                                  <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                  {entry.players?.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Not marked */}
                        {notMarked.length > 0 && (
                          <div className="space-y-1">
                            <h5 className="font-medium text-xs text-muted-foreground">Non pointés ({notMarked.length})</h5>
                            <div className="flex flex-wrap gap-1.5">
                              {notMarked.map(p => (
                                <Badge key={p.id} variant="outline" className="text-xs text-muted-foreground">
                                  {p.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* RPE Feedback Dialog */}
        {rpeDialogSessionId && (
          <SessionFeedbackDialog
            open={rpeDialogOpen}
            onOpenChange={(open) => {
              setRpeDialogOpen(open);
              if (!open) setRpeDialogSessionId(null);
            }}
            sessionId={rpeDialogSessionId}
            sessionType={todaySessions.find(s => s.id === rpeDialogSessionId)?.training_type || "Séance"}
            categoryId={categoryId}
          />
        )}
      </div>
    );
  }