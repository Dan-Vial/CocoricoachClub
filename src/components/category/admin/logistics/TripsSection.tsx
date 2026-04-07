import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bus, MapPin, Calendar, Clock, Users, Trash2, Hotel, Utensils } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { fr } from "date-fns/locale";

interface TripsSectionProps {
  categoryId: string;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  departure_date: string;
  departure_time: string | null;
  return_date: string | null;
  return_time: string | null;
  transport_type: string;
  transport_details: string | null;
  accommodation: string | null;
  meal_plan: string | null;
  meeting_point: string | null;
  notes: string | null;
  match_id: string | null;
}

const TRANSPORT_TYPES = [
  { value: "bus", label: "Bus", icon: Bus },
  { value: "car", label: "Voitures", icon: Bus },
  { value: "train", label: "Train", icon: Bus },
  { value: "plane", label: "Avion", icon: Bus },
  { value: "other", label: "Autre", icon: Bus },
];

export function TripsSection({ categoryId }: TripsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    departure_date: "",
    departure_time: "",
    return_date: "",
    return_time: "",
    transport_type: "bus",
    transport_details: "",
    accommodation: "",
    meal_plan: "",
    meeting_point: "",
    notes: "",
  });

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_trips" as any)
        .select("*")
        .eq("category_id", categoryId)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return data as unknown as Trip[];
    },
  });

  const addTripMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("team_trips" as any).insert({
        category_id: categoryId,
        created_by: user?.id,
        title: data.title,
        destination: data.destination,
        departure_date: data.departure_date,
        departure_time: data.departure_time || null,
        return_date: data.return_date || null,
        return_time: data.return_time || null,
        transport_type: data.transport_type,
        transport_details: data.transport_details || null,
        accommodation: data.accommodation || null,
        meal_plan: data.meal_plan || null,
        meeting_point: data.meeting_point || null,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", categoryId] });
      setShowAddDialog(false);
      setFormData({
        title: "", destination: "", departure_date: "", departure_time: "",
        return_date: "", return_time: "", transport_type: "bus",
        transport_details: "", accommodation: "", meal_plan: "", meeting_point: "", notes: "",
      });
      toast({ title: "Déplacement créé" });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_trips" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", categoryId] });
      toast({ title: "Déplacement supprimé" });
    },
  });

  const filteredTrips = trips?.filter((trip) => {
    const tripDate = new Date(trip.departure_date);
    return filter === "upcoming" ? isFuture(tripDate) || format(tripDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") : isPast(tripDate);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("upcoming")}
          >
            À venir
          </Button>
          <Button
            variant={filter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("past")}
          >
            Passés
          </Button>
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau déplacement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau Déplacement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titre *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ex: Match à Lyon"
                />
              </div>
              <div>
                <Label>Destination *</Label>
                <Input
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="ex: Stade de Gerland, Lyon"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date départ *</Label>
                  <Input
                    type="date"
                    value={formData.departure_date}
                    onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Heure départ</Label>
                  <Input
                    type="time"
                    value={formData.departure_time}
                    onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date retour</Label>
                  <Input
                    type="date"
                    min={formData.departure_date || undefined}
                    value={formData.return_date}
                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Heure retour</Label>
                  <Input
                    type="time"
                    value={formData.return_time}
                    onChange={(e) => setFormData({ ...formData, return_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Transport</Label>
                <Select value={formData.transport_type} onValueChange={(v) => setFormData({ ...formData, transport_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Détails transport</Label>
                <Input
                  value={formData.transport_details}
                  onChange={(e) => setFormData({ ...formData, transport_details: e.target.value })}
                  placeholder="ex: Bus 52 places - Transdev"
                />
              </div>

              <div>
                <Label>Point de rendez-vous</Label>
                <Input
                  value={formData.meeting_point}
                  onChange={(e) => setFormData({ ...formData, meeting_point: e.target.value })}
                  placeholder="ex: Parking stade principal"
                />
              </div>

              <div>
                <Label>Hébergement</Label>
                <Input
                  value={formData.accommodation}
                  onChange={(e) => setFormData({ ...formData, accommodation: e.target.value })}
                  placeholder="ex: Hôtel Ibis Lyon Centre"
                />
              </div>

              <div>
                <Label>Restauration</Label>
                <Input
                  value={formData.meal_plan}
                  onChange={(e) => setFormData({ ...formData, meal_plan: e.target.value })}
                  placeholder="ex: Repas d'avant-match à l'hôtel"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informations complémentaires..."
                  rows={2}
                />
              </div>

              <Button
                onClick={() => addTripMutation.mutate(formData)}
                disabled={!formData.title || !formData.destination || !formData.departure_date}
                className="w-full"
              >
                Créer le déplacement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des déplacements */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : filteredTrips?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Bus className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Aucun déplacement {filter === "upcoming" ? "à venir" : "passé"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTrips?.map((trip) => (
            <Card key={trip.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{trip.title}</h4>
                      <Badge variant="outline">
                        {TRANSPORT_TYPES.find((t) => t.value === trip.transport_type)?.label}
                      </Badge>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{trip.destination}</span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(trip.departure_date), "EEEE d MMMM", { locale: fr })}
                          {trip.departure_time && ` à ${trip.departure_time.slice(0, 5)}`}
                        </span>
                      </div>

                      {trip.return_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            Retour: {format(new Date(trip.return_date), "d MMM", { locale: fr })}
                            {trip.return_time && ` à ${trip.return_time.slice(0, 5)}`}
                          </span>
                        </div>
                      )}

                      {trip.meeting_point && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>RDV: {trip.meeting_point}</span>
                        </div>
                      )}

                      {trip.accommodation && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Hotel className="h-4 w-4" />
                          <span>{trip.accommodation}</span>
                        </div>
                      )}

                      {trip.meal_plan && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Utensils className="h-4 w-4" />
                          <span>{trip.meal_plan}</span>
                        </div>
                      )}
                    </div>

                    {trip.notes && (
                      <p className="mt-3 text-sm text-muted-foreground border-t pt-2">{trip.notes}</p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteTripMutation.mutate(trip.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
