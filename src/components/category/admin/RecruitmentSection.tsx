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
import { Plus, Search, User, Phone, Mail, MapPin, Calendar, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

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
  contacted: "bg-blue-100 text-blue-700",
  interested: "bg-amber-100 text-amber-700",
  evaluation: "bg-purple-100 text-purple-700",
  negotiation: "bg-orange-100 text-orange-700",
  signed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  contacted: "Contacté",
  interested: "Intéressé",
  evaluation: "En évaluation",
  negotiation: "Négociation",
  signed: "Signé",
  rejected: "Refusé",
};

const PIPELINE_STATUSES = ["contacted", "interested", "evaluation", "negotiation", "signed"];

function DroppableColumn({ status, children }: { status: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`bg-muted/30 rounded-b-lg p-1.5 min-h-[250px] space-y-1.5 transition-colors ${isOver ? "bg-primary/10 ring-2 ring-primary/30" : ""}`}
    >
      {children}
    </div>
  );
}

function DraggableProspectCard({ prospect, onClick }: { prospect: Prospect; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prospect.id,
    data: { status: prospect.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow touch-none"
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <CardContent className="p-2.5 text-center border-primary border border-solid">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-medium text-xs truncate">{prospect.name}</h4>
            {prospect.rating && (
              <span className="text-amber-500 text-[10px] ml-1 flex-shrink-0">
                {"★".repeat(prospect.rating)}
              </span>
            )}
          </div>
          {prospect.position && (
            <p className="text-[10px] text-muted-foreground mb-0.5 truncate">{prospect.position}</p>
          )}
          {prospect.current_club && (
            <p className="text-[10px] text-muted-foreground truncate">{prospect.current_club}</p>
          )}
          {prospect.city && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground mt-1">
              <MapPin className="h-2.5 w-2.5" />
              <span className="truncate">{prospect.city}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecruitmentSection({ categoryId }: RecruitmentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<typeof formData>({ name: "", position: "", current_club: "", birth_date: "", phone: "", email: "", city: "", status: "contacted", rating: "", notes: "", source: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    position: "",
    current_club: "",
    birth_date: "",
    phone: "",
    email: "",
    city: "",
    status: "contacted",
    rating: "",
    notes: "",
    source: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: prospects, isLoading } = useQuery({
    queryKey: ["prospects", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_prospects" as any)
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Prospect[];
    },
  });

  const addProspectMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("recruitment_prospects" as any).insert({
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
        .from("recruitment_prospects" as any)
        .update({ status, last_contact: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects", categoryId] });
      toast({ title: "Statut mis à jour" });
    },
  });

  const updateProspectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("recruitment_prospects" as any).update({
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
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects", categoryId] });
      setIsEditing(false);
      setSelectedProspect(null);
      toast({ title: "Prospect mis à jour" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteProspectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recruitment_prospects" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects", categoryId] });
      setSelectedProspect(null);
      toast({ title: "Prospect supprimé" });
    },
  });

  const startEditing = (prospect: Prospect) => {
    setEditData({
      name: prospect.name,
      position: prospect.position || "",
      current_club: prospect.current_club || "",
      birth_date: prospect.birth_date || "",
      phone: prospect.phone || "",
      email: prospect.email || "",
      city: prospect.city || "",
      status: prospect.status,
      rating: prospect.rating ? String(prospect.rating) : "",
      notes: prospect.notes || "",
      source: prospect.source || "",
    });
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({
      name: "", position: "", current_club: "", birth_date: "",
      phone: "", email: "", city: "", status: "contacted",
      rating: "", notes: "", source: "",
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

  const activeProspect = activeId ? prospects?.find((p) => p.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const prospectId = active.id as string;
    const prospect = prospects?.find((p) => p.id === prospectId);
    if (!prospect) return;

    // over.id is the droppable column status
    const newStatus = over.id as string;
    if (PIPELINE_STATUSES.includes(newStatus) && newStatus !== prospect.status) {
      updateStatusMutation.mutate({ id: prospectId, status: newStatus });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
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
            <SelectTrigger className="w-[140px]">
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
            <Button size="sm">
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
                <div>
                  <Label>Statut initial</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
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

      {/* Pipeline Kanban avec drag & drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-5 gap-2">
          {PIPELINE_STATUSES.map((status) => (
            <div key={status} className="min-w-0">
              <div className={`rounded-t-lg px-2 py-1.5 ${STATUS_COLORS[status]}`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-xs truncate">{STATUS_LABELS[status]}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-1">
                    {getProspectsByStatus(status).length}
                  </Badge>
                </div>
              </div>
              <DroppableColumn status={status}>
                {getProspectsByStatus(status).map((prospect) => (
                  <DraggableProspectCard
                    key={prospect.id}
                    prospect={prospect}
                    onClick={() => setSelectedProspect(prospect)}
                  />
                ))}
                {getProspectsByStatus(status).length === 0 && (
                  <div className="text-center text-muted-foreground text-[10px] py-6">
                    Aucun prospect
                  </div>
                )}
              </DroppableColumn>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeProspect && (
            <Card className="shadow-lg w-48 rotate-2">
              <CardContent className="p-2.5">
                <h4 className="font-medium text-xs">{activeProspect.name}</h4>
                {activeProspect.position && (
                  <p className="text-[10px] text-muted-foreground">{activeProspect.position}</p>
                )}
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      {/* Dialog détails prospect */}
      <Dialog open={!!selectedProspect} onOpenChange={() => { setSelectedProspect(null); setIsEditing(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {isEditing ? "Modifier le prospect" : selectedProspect?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProspect && !isEditing && (
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
                  variant="outline"
                  size="sm"
                  onClick={() => startEditing(selectedProspect)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
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
          {selectedProspect && isEditing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nom complet *</Label>
                  <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                </div>
                <div>
                  <Label>Poste</Label>
                  <Input value={editData.position} onChange={(e) => setEditData({ ...editData, position: e.target.value })} />
                </div>
                <div>
                  <Label>Club actuel</Label>
                  <Input value={editData.current_club} onChange={(e) => setEditData({ ...editData, current_club: e.target.value })} />
                </div>
                <div>
                  <Label>Date de naissance</Label>
                  <Input type="date" value={editData.birth_date} onChange={(e) => setEditData({ ...editData, birth_date: e.target.value })} />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input value={editData.city} onChange={(e) => setEditData({ ...editData, city: e.target.value })} />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                </div>
                <div>
                  <Label>Source</Label>
                  <Input value={editData.source} onChange={(e) => setEditData({ ...editData, source: e.target.value })} />
                </div>
                <div>
                  <Label>Note (1-5)</Label>
                  <Select value={editData.rating} onValueChange={(v) => setEditData({ ...editData, rating: v })}>
                    <SelectTrigger><SelectValue placeholder="Note" /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>{"★".repeat(n)}{"☆".repeat(5 - n)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes / Observations</Label>
                <Textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Annuler</Button>
                <Button
                  size="sm"
                  disabled={!editData.name || updateProspectMutation.isPending}
                  onClick={() => updateProspectMutation.mutate({ id: selectedProspect.id, data: editData })}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
