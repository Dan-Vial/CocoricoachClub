import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, Phone, Mail, MapPin, Calendar, Star, Eye, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RecruitmentSectionProps {
  categoryId: string;
}

interface Prospect {
  id: string;
  name: string;
  position: string | null;
  current_club: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: string;
  rating: number | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  last_contact: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  identified: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-700",
  interested: "bg-amber-100 text-amber-700",
  evaluation: "bg-purple-100 text-purple-700",
  negotiation: "bg-orange-100 text-orange-700",
  signed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  identified: "Identifié",
  contacted: "Contacté",
  interested: "Intéressé",
  evaluation: "En évaluation",
  negotiation: "Négociation",
  signed: "Signé",
  rejected: "Refusé",
};

export function RecruitmentSection({ categoryId }: RecruitmentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    name: "",
    position: "",
    current_club: "",
    birth_date: "",
    phone: "",
    email: "",
    city: "",
    status: "identified",
    rating: "",
    notes: "",
    source: "",
  });

  const { data: prospects, isLoading } = useQuery({
    queryKey: ["prospects", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_prospects")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Prospect[];
    },
  });

  const addProspectMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("recruitment_prospects").insert({
        category_id: categoryId,
        created_by: user?.id,
        name: data.name,
        position: data.position || null,
        current_club: data.current_club || null,
        birth_date: data.birth_date || null,
        phone: data.phone || null,
        email: data.email || null,
        city: data.city || null,
        status: data.status,
        rating: data.rating ? parseInt(data.rating) : null,
        notes: data.notes || null,
        source: data.source || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects", categoryId] });
      setShowAddDialog(false);
      resetForm();
      toast({ title: "Prospect ajouté", description: "Le prospect a été ajouté au pipeline" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("recruitment_prospects")
        .update({ status, last_contact: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects", categoryId] });
      toast({ title: "Statut mis à jour" });
    },
  });

  const deleteProspectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recruitment_prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects", categoryId] });
      setSelectedProspect(null);
      toast({ title: "Prospect supprimé" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      position: "",
      current_club: "",
      birth_date: "",
      phone: "",
      email: "",
      city: "",
      status: "identified",
      rating: "",
      notes: "",
      source: "",
    });
  };

  const filteredProspects = prospects?.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.current_club?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.position?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProspectsByStatus = (status: string) => 
    filteredProspects?.filter((p) => p.status === status) || [];

  const pipelineStatuses = ["identified", "contacted", "interested", "evaluation", "negotiation", "signed"];

  return (
    <div className="space-y-6">
      {/* Header avec recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un prospect..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un prospect
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau Prospect</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nom complet *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nom du joueur"
                  />
                </div>
                <div>
                  <Label>Poste</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="ex: Ailier"
                  />
                </div>
                <div>
                  <Label>Club actuel</Label>
                  <Input
                    value={formData.current_club}
                    onChange={(e) => setFormData({ ...formData, current_club: e.target.value })}
                    placeholder="ex: FC Lyon"
                  />
                </div>
                <div>
                  <Label>Date de naissance</Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="ex: Lyon"
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+33..."
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label>Source</Label>
                  <Input
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="ex: Recommandation, Match..."
                  />
                </div>
                <div>
                  <Label>Note (1-5)</Label>
                  <Select value={formData.rating} onValueChange={(v) => setFormData({ ...formData, rating: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Note" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {"★".repeat(n)}{"☆".repeat(5 - n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes / Observations</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observations, points forts, points à améliorer..."
                  rows={3}
                />
              </div>
              <Button
                onClick={() => addProspectMutation.mutate(formData)}
                disabled={!formData.name || addProspectMutation.isPending}
                className="w-full"
              >
                Ajouter le prospect
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vue Pipeline Kanban */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-4 min-w-max pb-4">
          {pipelineStatuses.map((status) => (
            <div key={status} className="w-72 flex-shrink-0">
              <div className={`rounded-t-lg px-3 py-2 ${STATUS_COLORS[status]}`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{STATUS_LABELS[status]}</span>
                  <Badge variant="secondary" className="text-xs">
                    {getProspectsByStatus(status).length}
                  </Badge>
                </div>
              </div>
              <div className="bg-muted/30 rounded-b-lg p-2 min-h-[300px] space-y-2">
                {getProspectsByStatus(status).map((prospect) => (
                  <Card
                    key={prospect.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedProspect(prospect)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{prospect.name}</h4>
                        {prospect.rating && (
                          <span className="text-amber-500 text-xs">
                            {"★".repeat(prospect.rating)}
                          </span>
                        )}
                      </div>
                      {prospect.position && (
                        <p className="text-xs text-muted-foreground mb-1">{prospect.position}</p>
                      )}
                      {prospect.current_club && (
                        <p className="text-xs text-muted-foreground">{prospect.current_club}</p>
                      )}
                      {prospect.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <MapPin className="h-3 w-3" />
                          {prospect.city}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {getProspectsByStatus(status).length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Aucun prospect
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog détails prospect */}
      <Dialog open={!!selectedProspect} onOpenChange={() => setSelectedProspect(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedProspect?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProspect && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[selectedProspect.status]}>
                  {STATUS_LABELS[selectedProspect.status]}
                </Badge>
                {selectedProspect.rating && (
                  <span className="text-amber-500">
                    {"★".repeat(selectedProspect.rating)}{"☆".repeat(5 - selectedProspect.rating)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedProspect.position && (
                  <div>
                    <span className="text-muted-foreground">Poste:</span>
                    <p className="font-medium">{selectedProspect.position}</p>
                  </div>
                )}
                {selectedProspect.current_club && (
                  <div>
                    <span className="text-muted-foreground">Club:</span>
                    <p className="font-medium">{selectedProspect.current_club}</p>
                  </div>
                )}
                {selectedProspect.birth_date && (
                  <div>
                    <span className="text-muted-foreground">Né le:</span>
                    <p className="font-medium">
                      {format(new Date(selectedProspect.birth_date), "d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                )}
                {selectedProspect.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedProspect.city}</span>
                  </div>
                )}
                {selectedProspect.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedProspect.phone}`} className="text-primary hover:underline">
                      {selectedProspect.phone}
                    </a>
                  </div>
                )}
                {selectedProspect.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedProspect.email}`} className="text-primary hover:underline text-xs">
                      {selectedProspect.email}
                    </a>
                  </div>
                )}
              </div>

              {selectedProspect.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedProspect.notes}</p>
                </div>
              )}

              {selectedProspect.source && (
                <div className="text-xs text-muted-foreground">
                  Source: {selectedProspect.source}
                </div>
              )}

              {selectedProspect.last_contact && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Dernier contact: {format(new Date(selectedProspect.last_contact), "d MMM yyyy", { locale: fr })}
                </div>
              )}

              {/* Actions rapides */}
              <div className="flex flex-wrap gap-2">
                <Label className="w-full text-muted-foreground">Changer le statut:</Label>
                {Object.entries(STATUS_LABELS)
                  .filter(([key]) => key !== selectedProspect.status)
                  .map(([key, label]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className={STATUS_COLORS[key]}
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedProspect.id, status: key });
                        setSelectedProspect({ ...selectedProspect, status: key });
                      }}
                    >
                      {label}
                    </Button>
                  ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteProspectMutation.mutate(selectedProspect.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
