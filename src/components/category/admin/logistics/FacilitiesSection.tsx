import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Clock, Calendar, MapPin, Users, Trash2 } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

interface FacilitiesSectionProps {
  categoryId: string;
}

interface Facility {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  location: string | null;
}

interface Booking {
  id: string;
  facility_id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  facilities?: Facility;
}

const FACILITY_TYPES = [
  { value: "field", label: "Terrain" },
  { value: "gym", label: "Salle de musculation" },
  { value: "pool", label: "Piscine" },
  { value: "meeting_room", label: "Salle de réunion" },
  { value: "video_room", label: "Salle vidéo" },
  { value: "medical_room", label: "Cabinet médical" },
  { value: "other", label: "Autre" },
];

export function FacilitiesSection({ categoryId }: FacilitiesSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddFacilityDialog, setShowAddFacilityDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const [facilityForm, setFacilityForm] = useState({
    name: "",
    type: "field",
    capacity: "",
    location: "",
  });

  const [bookingForm, setBookingForm] = useState({
    facility_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    end_time: "10:00",
    title: "",
  });

  const { data: facilities } = useQuery({
    queryKey: ["facilities", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data as Facility[];
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["facility-bookings", categoryId, format(currentWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const { data, error } = await supabase
        .from("facility_bookings")
        .select("*, facilities(*)")
        .eq("category_id", categoryId)
        .gte("date", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .order("date")
        .order("start_time");
      if (error) throw error;
      return data as Booking[];
    },
  });

  const addFacilityMutation = useMutation({
    mutationFn: async (data: typeof facilityForm) => {
      const { error } = await supabase.from("facilities").insert({
        category_id: categoryId,
        name: data.name,
        type: data.type,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        location: data.location || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities", categoryId] });
      setShowAddFacilityDialog(false);
      setFacilityForm({ name: "", type: "field", capacity: "", location: "" });
      toast({ title: "Infrastructure ajoutée" });
    },
  });

  const addBookingMutation = useMutation({
    mutationFn: async (data: typeof bookingForm) => {
      const { error } = await supabase.from("facility_bookings").insert({
        category_id: categoryId,
        created_by: user?.id,
        facility_id: data.facility_id,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        title: data.title,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-bookings"] });
      setShowBookingDialog(false);
      setBookingForm({ facility_id: "", date: format(new Date(), "yyyy-MM-dd"), start_time: "09:00", end_time: "10:00", title: "" });
      toast({ title: "Réservation créée" });
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("facility_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-bookings"] });
      toast({ title: "Réservation supprimée" });
    },
  });

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  const getBookingsForDay = (date: Date) =>
    bookings?.filter((b) => isSameDay(new Date(b.date), date)) || [];

  return (
    <div className="space-y-6">
      {/* Liste des infrastructures */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Infrastructures</h3>
        <div className="flex gap-2">
          <Dialog open={showAddFacilityDialog} onOpenChange={setShowAddFacilityDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Infrastructure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle Infrastructure</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={facilityForm.name}
                    onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                    placeholder="ex: Terrain A"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={facilityForm.type} onValueChange={(v) => setFacilityForm({ ...facilityForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Capacité</Label>
                    <Input
                      type="number"
                      value={facilityForm.capacity}
                      onChange={(e) => setFacilityForm({ ...facilityForm, capacity: e.target.value })}
                      placeholder="ex: 22"
                    />
                  </div>
                  <div>
                    <Label>Localisation</Label>
                    <Input
                      value={facilityForm.location}
                      onChange={(e) => setFacilityForm({ ...facilityForm, location: e.target.value })}
                      placeholder="ex: Complexe sportif"
                    />
                  </div>
                </div>
                <Button onClick={() => addFacilityMutation.mutate(facilityForm)} disabled={!facilityForm.name} className="w-full">
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Réserver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle Réservation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Infrastructure *</Label>
                  <Select value={bookingForm.facility_id} onValueChange={(v) => setBookingForm({ ...bookingForm, facility_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {facilities?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Début</Label>
                    <Input
                      type="time"
                      value={bookingForm.start_time}
                      onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fin</Label>
                    <Input
                      type="time"
                      value={bookingForm.end_time}
                      onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Motif *</Label>
                  <Input
                    value={bookingForm.title}
                    onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                    placeholder="ex: Entraînement équipe A"
                  />
                </div>
                <Button
                  onClick={() => addBookingMutation.mutate(bookingForm)}
                  disabled={!bookingForm.facility_id || !bookingForm.title}
                  className="w-full"
                >
                  Réserver
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grille des infrastructures */}
      {facilities && facilities.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => (
            <Card key={facility.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{facility.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {FACILITY_TYPES.find((t) => t.value === facility.type)?.label}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
                  {facility.capacity && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {facility.capacity}
                    </span>
                  )}
                  {facility.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {facility.location}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Aucune infrastructure enregistrée</p>
            <Button variant="link" onClick={() => setShowAddFacilityDialog(true)}>
              Ajouter une infrastructure
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Calendrier des réservations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Planning de la semaine</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
              Semaine précédente
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
              Semaine suivante
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="min-h-[120px]">
              <div className={`text-center p-2 rounded-t-lg font-medium text-sm ${isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div>{format(day, "EEE", { locale: fr })}</div>
                <div className="text-xs">{format(day, "d MMM", { locale: fr })}</div>
              </div>
              <div className="border rounded-b-lg p-1 space-y-1 min-h-[80px]">
                {getBookingsForDay(day).map((booking) => (
                  <div
                    key={booking.id}
                    className="text-xs p-1.5 rounded bg-primary/10 border border-primary/20 group relative"
                  >
                    <div className="font-medium truncate">{booking.title}</div>
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                    </div>
                    <div className="text-muted-foreground truncate">{booking.facilities?.name}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteBookingMutation.mutate(booking.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
