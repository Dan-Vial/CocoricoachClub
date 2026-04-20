import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Activity, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Dumbbell,
  Plus,
  TrendingUp,
  User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface ActiveProtocolsDashboardProps {
  categoryId: string;
}

// State for quick protocol assignment
interface AssignState {
  injuryId: string;
  playerId: string;
  protocolId: string;
}

const EVENT_TYPES = [
  { value: "exercise", label: "Exercice / Séance réhab" },
  { value: "checkpoint", label: "Bilan / Checkpoint" },
  { value: "medical", label: "Rendez-vous médical" },
  { value: "test", label: "Test de validation" },
  { value: "return_training", label: "Retour entraînement" },
  { value: "return_competition", label: "Retour compétition" },
];

export function ActiveProtocolsDashboard({ categoryId }: ActiveProtocolsDashboardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventPlayerId, setEventPlayerId] = useState("");
  const [eventProtocolId, setEventProtocolId] = useState("");
  const [eventType, setEventType] = useState("exercise");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [eventDescription, setEventDescription] = useState("");
  const [assignState, setAssignState] = useState<AssignState | null>(null);

  // Fetch injury protocols for quick assignment dropdown
  const { data: availableProtocols } = useQuery({
    queryKey: ["injury-protocols-for-assign", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injury_protocols")
        .select("id, name, injury_category")
        .order("injury_category, name");
      if (error) throw error;
      return data || [];
    },
  });

  // Assign protocol mutation
  const assignProtocol = useMutation({
    mutationFn: async ({ injuryId, playerId, protocolId }: AssignState) => {
      const { error } = await supabase
        .from("player_rehab_protocols")
        .insert({
          player_id: playerId,
          injury_id: injuryId,
          category_id: categoryId,
          protocol_id: protocolId,
          status: "in_progress",
          current_phase: 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-rehab-protocols", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["recovering-injuries-no-protocol", categoryId] });
      toast.success("Protocole assigné avec succès");
      setAssignState(null);
    },
    onError: (err: any) => {
      toast.error("Erreur: " + err.message);
    },
  });

  // Fetch all active player rehab protocols for this category
  const { data: activeProtocols, isLoading: protocolsLoading } = useQuery({
    queryKey: ["active-rehab-protocols", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_rehab_protocols")
        .select(`
          *,
          players (
            id,
            name,
            avatar_url,
            position
          ),
          injury_protocols (
            name,
            injury_category,
            typical_duration_days_min,
            typical_duration_days_max,
            protocol_phases (
              id,
              phase_number,
              name
            )
          ),
          injuries (
            injury_type,
            injury_date,
            estimated_return_date
          )
        `)
        .eq("category_id", categoryId)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch recovering injuries that may NOT have a rehab protocol yet
  const { data: recoveringInjuries, isLoading: injuriesLoading } = useQuery({
    queryKey: ["recovering-injuries-no-protocol", categoryId],
    queryFn: async () => {
      const { data: injuries, error } = await supabase
        .from("injuries")
        .select(`
          *,
          players (
            id,
            name,
            avatar_url,
            position
          )
        `)
        .eq("category_id", categoryId)
        .eq("status", "recovering")
        .order("injury_date", { ascending: false });

      if (error) throw error;

      const protocolInjuryIds = new Set(activeProtocols?.map(p => p.injury_id) || []);
      return (injuries || []).filter(inj => !protocolInjuryIds.has(inj.id));
    },
    enabled: !protocolsLoading,
  });

  // Fetch calendar events for progress calculation
  const { data: allRehabEvents } = useQuery({
    queryKey: ["all-rehab-events-category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rehab_calendar_events")
        .select("*")
        .eq("category_id", categoryId);

      if (error) throw error;
      return data;
    },
  });

  // Fetch upcoming events (next 7 days)
  const { data: upcomingEvents } = useQuery({
    queryKey: ["upcoming-rehab-events", categoryId],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data, error } = await supabase
        .from("rehab_calendar_events")
        .select(`
          *,
          players (
            id,
            name
          )
        `)
        .eq("category_id", categoryId)
        .eq("is_completed", false)
        .gte("event_date", format(today, "yyyy-MM-dd"))
        .lte("event_date", format(nextWeek, "yyyy-MM-dd"))
        .order("event_date", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Create event mutation
  const createEvent = useMutation({
    mutationFn: async () => {
      const protocol = activeProtocols?.find(p => p.id === eventProtocolId);
      if (!protocol) throw new Error("Protocole non trouvé");

      const injuryProtocol = protocol.injury_protocols as any;
      const phases = injuryProtocol?.protocol_phases || [];
      const currentPhase = phases.find((ph: any) => ph.phase_number === protocol.current_phase) || phases[0];

      const { error } = await supabase
        .from("rehab_calendar_events")
        .insert({
          category_id: categoryId,
          player_id: protocol.player_id,
          player_rehab_protocol_id: eventProtocolId,
          event_type: eventType,
          title: eventTitle,
          description: eventDescription || null,
          event_date: eventDate,
          phase_number: currentPhase?.phase_number || protocol.current_phase || 1,
          phase_name: currentPhase?.name || `Phase ${protocol.current_phase || 1}`,
          phase_id: currentPhase?.id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-rehab-events", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["all-rehab-events-category", categoryId] });
      toast.success("Événement de réhabilitation ajouté");
      resetEventForm();
      setIsAddEventOpen(false);
    },
    onError: (err: any) => {
      toast.error("Erreur: " + err.message);
    },
  });

  const resetEventForm = () => {
    setEventPlayerId("");
    setEventProtocolId("");
    setEventType("exercise");
    setEventTitle("");
    setEventDate(format(new Date(), "yyyy-MM-dd"));
    setEventDescription("");
  };

  const handleProtocolSelect = (protocolId: string) => {
    setEventProtocolId(protocolId);
    const protocol = activeProtocols?.find(p => p.id === protocolId);
    if (protocol) {
      setEventPlayerId(protocol.player_id);
      const eventTypeLabel = EVENT_TYPES.find(t => t.value === eventType)?.label || "";
      const player = protocol.players as any;
      setEventTitle(`${eventTypeLabel} - ${player?.name || ""}`);
    }
  };

  const isLoading = protocolsLoading || injuriesLoading;

  const getProtocolProgress = (protocolId: string) => {
    const events = allRehabEvents?.filter(e => e.player_rehab_protocol_id === protocolId) || [];
    const total = events.length;
    const completed = events.filter(e => e.is_completed).length;
    return { total, completed, percent: total > 0 ? (completed / total) * 100 : 0 };
  };

  const getStatusBadge = (progress: number, estimatedReturn?: string | null) => {
    if (progress === 100) {
      return <Badge className="bg-green-500">Terminé</Badge>;
    }
    if (estimatedReturn) {
      const daysLeft = differenceInDays(parseISO(estimatedReturn), new Date());
      if (daysLeft < 0) {
        return <Badge variant="destructive">En retard</Badge>;
      }
      if (daysLeft <= 7) {
        return <Badge className="bg-amber-500">Retour proche</Badge>;
      }
    }
    return <Badge variant="secondary">En cours</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const totalWithProtocol = activeProtocols?.length || 0;
  const totalWithoutProtocol = recoveringInjuries?.length || 0;
  const totalPlayers = totalWithProtocol + totalWithoutProtocol;

  const averageProgress = activeProtocols?.reduce((acc, p) => {
    return acc + getProtocolProgress(p.id).percent;
  }, 0) || 0;
  const avgProgressPercent = totalWithProtocol > 0 ? averageProgress / totalWithProtocol : 0;

  return (
    <div className="space-y-6">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Réhabilitation
          </h2>
          <p className="text-sm text-muted-foreground">Suivi des joueurs blessés et événements de réhab</p>
        </div>
        <Button 
          onClick={() => setIsAddEventOpen(true)}
          disabled={!activeProtocols || activeProtocols.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un événement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Dumbbell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPlayers}</p>
                <p className="text-sm text-muted-foreground">Athlètes en réhab</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(avgProgressPercent)}%</p>
                <p className="text-sm text-muted-foreground">Progression moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingEvents?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Événements à venir</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(activeProtocols?.filter(p => {
                    const injury = p.injuries as any;
                    if (!injury?.estimated_return_date) return false;
                    return differenceInDays(parseISO(injury.estimated_return_date), new Date()) < 0;
                  }).length || 0) + (recoveringInjuries?.filter(inj => {
                    if (!inj.estimated_return_date) return false;
                    return differenceInDays(parseISO(inj.estimated_return_date), new Date()) < 0;
                  }).length || 0)}
                </p>
                <p className="text-sm text-muted-foreground">En retard</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Active Protocols + Recovering Injuries List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Joueurs en réhabilitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalPlayers > 0 ? (
              <div className="space-y-4">
                {activeProtocols?.map((protocol) => {
                  const player = protocol.players as any;
                  const injuryProtocol = protocol.injury_protocols as any;
                  const injury = protocol.injuries as any;
                  const progress = getProtocolProgress(protocol.id);

                  return (
                    <div
                      key={protocol.id}
                      className="p-4 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/players/${player?.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player?.avatar_url} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{player?.name}</p>
                            {getStatusBadge(progress.percent, injury?.estimated_return_date)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {injuryProtocol?.name} - {injury?.injury_type}
                          </p>
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Phase {protocol.current_phase}</span>
                              <span>{Math.round(progress.percent)}%</span>
                            </div>
                            <Progress value={progress.percent} className="h-1.5" />
                          </div>
                          {injury?.estimated_return_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 inline mr-1" />
                              Retour estimé: {format(parseISO(injury.estimated_return_date), "d MMM yyyy", { locale: fr })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {recoveringInjuries?.map((injury) => {
                  const player = injury.players as any;

                  return (
                    <div
                      key={injury.id}
                      className="p-4 border border-dashed border-amber-300 rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/players/${player?.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player?.avatar_url} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{player?.name}</p>
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              En réhabilitation
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {injury.injury_type}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Blessure depuis le {format(parseISO(injury.injury_date), "d MMM yyyy", { locale: fr })}
                          </p>
                          {injury.estimated_return_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 inline mr-1" />
                              Retour estimé: {format(parseISO(injury.estimated_return_date), "d MMM yyyy", { locale: fr })}
                            </p>
                          )}
                          <p className="text-xs text-amber-600 mt-2 font-medium">
                            Assigner un protocole :
                          </p>
                          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={assignState?.injuryId === injury.id ? assignState.protocolId : ""}
                              onValueChange={(protocolId) => {
                                setAssignState({ injuryId: injury.id, playerId: player?.id, protocolId });
                                assignProtocol.mutate({ injuryId: injury.id, playerId: player?.id, protocolId });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Choisir un protocole..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProtocols && availableProtocols.length > 0 ? (
                                  (() => {
                                    const grouped = availableProtocols.reduce((acc, p) => {
                                      const cat = p.injury_category || "Autre";
                                      if (!acc[cat]) acc[cat] = [];
                                      acc[cat].push(p);
                                      return acc;
                                    }, {} as Record<string, typeof availableProtocols>);
                                    return Object.entries(grouped).map(([category, protocols]) => (
                                      <div key={category}>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{category}</div>
                                        {protocols.map((protocol) => (
                                          <SelectItem key={protocol.id} value={protocol.id}>
                                            {protocol.name}
                                          </SelectItem>
                                        ))}
                                      </div>
                                    ));
                                  })()
                                ) : (
                                  <SelectItem value="__none__" disabled>Aucun protocole disponible</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun joueur en réhabilitation</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prochaines échéances
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const player = event.players as any;
                  const eventDate = parseISO(event.event_date);
                  const daysUntil = differenceInDays(eventDate, new Date());

                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/players/${player?.id}`)}
                    >
                      <div className={`p-2 rounded-lg ${
                        event.event_type === 'checkpoint' 
                          ? 'bg-amber-500/10' 
                          : 'bg-blue-500/10'
                      }`}>
                        {event.event_type === 'checkpoint' 
                          ? <CheckCircle2 className="h-4 w-4 text-amber-600" />
                          : <Dumbbell className="h-4 w-4 text-blue-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{player?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {daysUntil === 0 
                            ? "Aujourd'hui" 
                            : daysUntil === 1 
                              ? "Demain" 
                              : `Dans ${daysUntil}j`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(eventDate, "d MMM", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun événement à venir</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Rehab Event Dialog */}
      <Dialog open={isAddEventOpen} onOpenChange={(open) => { if (!open) resetEventForm(); setIsAddEventOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un événement de réhabilitation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Joueur / Protocole actif *</Label>
              <Select value={eventProtocolId} onValueChange={handleProtocolSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un joueur blessé..." />
                </SelectTrigger>
                <SelectContent>
                  {activeProtocols?.map((protocol) => {
                    const player = protocol.players as any;
                    const injury = protocol.injuries as any;
                    return (
                      <SelectItem key={protocol.id} value={protocol.id}>
                        {player?.name} — {injury?.injury_type} (Phase {protocol.current_phase})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type d'événement *</Label>
              <Select value={eventType} onValueChange={(val) => {
                setEventType(val);
                // Auto-update title
                if (eventProtocolId) {
                  const protocol = activeProtocols?.find(p => p.id === eventProtocolId);
                  const player = protocol?.players as any;
                  const label = EVENT_TYPES.find(t => t.value === val)?.label || "";
                  setEventTitle(`${label} - ${player?.name || ""}`);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Titre de l'événement"
              />
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Détails de l'événement..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => createEvent.mutate()}
              disabled={!eventProtocolId || !eventTitle || !eventDate || createEvent.isPending}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
