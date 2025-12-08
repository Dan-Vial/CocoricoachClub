import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GraduationCap, Users, Target, Award, Phone, Star, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface PlayerAcademyTabProps {
  playerId: string;
  categoryId: string;
  playerName: string;
}

const STAFF_ROLES = [
  { value: "medecin", label: "Médecin" },
  { value: "kine", label: "Kinésithérapeute" },
  { value: "preparateur", label: "Préparateur physique" },
  { value: "tuteur", label: "Tuteur scolaire" },
  { value: "coach", label: "Coach" },
];

const SELECTION_TYPES = [
  { value: "equipe_france_u16", label: "Équipe de France U16" },
  { value: "equipe_france_u18", label: "Équipe de France U18" },
  { value: "equipe_france_u20", label: "Équipe de France U20" },
  { value: "pole_france", label: "Pôle France" },
  { value: "selection_regionale", label: "Sélection Régionale" },
];

export function PlayerAcademyTab({ playerId, categoryId, playerName }: PlayerAcademyTabProps) {
  const queryClient = useQueryClient();
  const [academicDialogOpen, setAcademicDialogOpen] = useState(false);
  const [staffNoteDialogOpen, setStaffNoteDialogOpen] = useState(false);
  const [developmentDialogOpen, setDevelopmentDialogOpen] = useState(false);
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  // Form states - Academic
  const [absenceHours, setAbsenceHours] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [academicGrade, setAcademicGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [academicNotes, setAcademicNotes] = useState("");

  // Form states - Staff Notes
  const [staffRole, setStaffRole] = useState("");
  const [noteContent, setNoteContent] = useState("");

  // Form states - Development
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear().toString());
  const [physicalObj, setPhysicalObj] = useState("");
  const [technicalObj, setTechnicalObj] = useState("");
  const [tacticalObj, setTacticalObj] = useState("");
  const [mentalObj, setMentalObj] = useState("");
  const [academicObj, setAcademicObj] = useState("");

  // Form states - Selection
  const [selectionType, setSelectionType] = useState("");
  const [selectionDate, setSelectionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [competitionName, setCompetitionName] = useState("");
  const [selectionNotes, setSelectionNotes] = useState("");

  // Form states - Contact
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRelationship, setContactRelationship] = useState("");

  // Queries
  const { data: academicData } = useQuery({
    queryKey: ["player_academic", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_academic_tracking")
        .select("*")
        .eq("player_id", playerId)
        .order("tracking_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: staffNotes } = useQuery({
    queryKey: ["player_staff_notes", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_notes")
        .select("*")
        .eq("player_id", playerId)
        .order("note_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: developmentPlans } = useQuery({
    queryKey: ["player_development_plans", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_development_plans")
        .select("*")
        .eq("player_id", playerId)
        .order("season_year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: selections } = useQuery({
    queryKey: ["player_selections", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_selections")
        .select("*")
        .eq("player_id", playerId)
        .order("selection_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["player_contacts", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_contacts")
        .select("*")
        .eq("player_id", playerId)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const addAcademicTracking = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_academic_tracking").insert({
        player_id: playerId,
        category_id: categoryId,
        school_absence_hours: absenceHours ? parseFloat(absenceHours) : 0,
        absence_reason: absenceReason || null,
        academic_grade: academicGrade ? parseFloat(academicGrade) : null,
        subject: subject || null,
        notes: academicNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_academic", playerId] });
      toast.success("Suivi scolaire ajouté");
      resetAcademicForm();
      setAcademicDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const addStaffNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff_notes").insert({
        player_id: playerId,
        category_id: categoryId,
        staff_role: staffRole,
        note_content: noteContent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_staff_notes", playerId] });
      toast.success("Note ajoutée");
      resetStaffNoteForm();
      setStaffNoteDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const addDevelopmentPlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_development_plans").insert({
        player_id: playerId,
        category_id: categoryId,
        season_year: parseInt(seasonYear),
        physical_objectives: physicalObj || null,
        technical_objectives: technicalObj || null,
        tactical_objectives: tacticalObj || null,
        mental_objectives: mentalObj || null,
        academic_objectives: academicObj || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_development_plans", playerId] });
      toast.success("Plan de développement créé");
      resetDevelopmentForm();
      setDevelopmentDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const addSelection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_selections").insert({
        player_id: playerId,
        category_id: categoryId,
        selection_type: selectionType,
        selection_date: selectionDate,
        competition_name: competitionName || null,
        notes: selectionNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_selections", playerId] });
      toast.success("Sélection ajoutée");
      resetSelectionForm();
      setSelectionDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_contacts").insert({
        player_id: playerId,
        category_id: categoryId,
        first_name: contactFirstName,
        last_name: contactLastName,
        phone: contactPhone || null,
        email: contactEmail || null,
        relationship: contactRelationship || null,
        contact_type: "parent",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_contacts", playerId] });
      toast.success("Contact ajouté");
      resetContactForm();
      setContactDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  // Reset functions
  const resetAcademicForm = () => {
    setAbsenceHours("");
    setAbsenceReason("");
    setAcademicGrade("");
    setSubject("");
    setAcademicNotes("");
  };

  const resetStaffNoteForm = () => {
    setStaffRole("");
    setNoteContent("");
  };

  const resetDevelopmentForm = () => {
    setSeasonYear(new Date().getFullYear().toString());
    setPhysicalObj("");
    setTechnicalObj("");
    setTacticalObj("");
    setMentalObj("");
    setAcademicObj("");
  };

  const resetSelectionForm = () => {
    setSelectionType("");
    setSelectionDate(format(new Date(), "yyyy-MM-dd"));
    setCompetitionName("");
    setSelectionNotes("");
  };

  const resetContactForm = () => {
    setContactFirstName("");
    setContactLastName("");
    setContactPhone("");
    setContactEmail("");
    setContactRelationship("");
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      medecin: "bg-red-500",
      kine: "bg-blue-500",
      preparateur: "bg-green-500",
      tuteur: "bg-purple-500",
      coach: "bg-orange-500",
    };
    return colors[role] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="academic" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="academic" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Scolaire
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="h-4 w-4" />
            Notes Staff
          </TabsTrigger>
          <TabsTrigger value="development" className="gap-2">
            <Target className="h-4 w-4" />
            Développement
          </TabsTrigger>
          <TabsTrigger value="selections" className="gap-2">
            <Award className="h-4 w-4" />
            Sélections
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Phone className="h-4 w-4" />
            Contacts
          </TabsTrigger>
        </TabsList>

        {/* Academic Tab */}
        <TabsContent value="academic">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Suivi Scolaire</CardTitle>
                  <CardDescription>Absences et notes académiques</CardDescription>
                </div>
                <Button size="sm" onClick={() => setAcademicDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!academicData || academicData.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">Aucun suivi scolaire.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Heures Absence</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Matière</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {academicData.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{format(new Date(entry.tracking_date), "dd MMM yyyy", { locale: fr })}</TableCell>
                          <TableCell>{entry.school_absence_hours || 0}h</TableCell>
                          <TableCell className="max-w-32 truncate">{entry.absence_reason || "-"}</TableCell>
                          <TableCell>{entry.academic_grade ? `${entry.academic_grade}/20` : "-"}</TableCell>
                          <TableCell>{entry.subject || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Notes Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Notes du Staff</CardTitle>
                  <CardDescription>Médecin, kiné, préparateur, tuteur</CardDescription>
                </div>
                <Button size="sm" onClick={() => setStaffNoteDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!staffNotes || staffNotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">Aucune note.</p>
              ) : (
                <div className="space-y-3">
                  {staffNotes.map((note) => (
                    <div key={note.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`${getRoleBadgeColor(note.staff_role)} text-white`}>
                          {STAFF_ROLES.find((r) => r.value === note.staff_role)?.label || note.staff_role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.note_date), "dd MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm">{note.note_content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Development Plans Tab */}
        <TabsContent value="development">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Plan de Développement</CardTitle>
                  <CardDescription>Objectifs annuels</CardDescription>
                </div>
                <Button size="sm" onClick={() => setDevelopmentDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!developmentPlans || developmentPlans.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">Aucun plan de développement.</p>
              ) : (
                <div className="space-y-4">
                  {developmentPlans.map((plan) => (
                    <div key={plan.id} className="p-4 border rounded-lg">
                      <Badge variant="outline" className="mb-3">
                        Saison {plan.season_year}/{plan.season_year + 1}
                      </Badge>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {plan.physical_objectives && (
                          <div className="p-2 bg-muted rounded">
                            <span className="font-medium text-primary">Physique:</span>
                            <p className="mt-1 text-muted-foreground">{plan.physical_objectives}</p>
                          </div>
                        )}
                        {plan.technical_objectives && (
                          <div className="p-2 bg-muted rounded">
                            <span className="font-medium text-primary">Technique:</span>
                            <p className="mt-1 text-muted-foreground">{plan.technical_objectives}</p>
                          </div>
                        )}
                        {plan.tactical_objectives && (
                          <div className="p-2 bg-muted rounded">
                            <span className="font-medium text-primary">Tactique:</span>
                            <p className="mt-1 text-muted-foreground">{plan.tactical_objectives}</p>
                          </div>
                        )}
                        {plan.mental_objectives && (
                          <div className="p-2 bg-muted rounded">
                            <span className="font-medium text-primary">Mental:</span>
                            <p className="mt-1 text-muted-foreground">{plan.mental_objectives}</p>
                          </div>
                        )}
                        {plan.academic_objectives && (
                          <div className="p-2 bg-muted rounded">
                            <span className="font-medium text-primary">Scolaire:</span>
                            <p className="mt-1 text-muted-foreground">{plan.academic_objectives}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Selections Tab */}
        <TabsContent value="selections">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Sélections</CardTitle>
                  <CardDescription>Équipes nationales et régionales</CardDescription>
                </div>
                <Button size="sm" onClick={() => setSelectionDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!selections || selections.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">Aucune sélection.</p>
              ) : (
                <div className="space-y-3">
                  {selections.map((sel) => (
                    <div key={sel.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div>
                        <Badge variant="secondary">
                          {SELECTION_TYPES.find((t) => t.value === sel.selection_type)?.label || sel.selection_type}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(sel.selection_date), "dd MMMM yyyy", { locale: fr })}
                          {sel.competition_name && ` - ${sel.competition_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Contacts</CardTitle>
                  <CardDescription>Parents et tuteurs légaux</CardDescription>
                </div>
                <Button size="sm" onClick={() => setContactDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!contacts || contacts.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">Aucun contact.</p>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{contact.first_name} {contact.last_name}</span>
                        {contact.is_primary && <Badge variant="default">Principal</Badge>}
                        {contact.relationship && (
                          <Badge variant="outline">{contact.relationship}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {contact.phone && <p>📞 {contact.phone}</p>}
                        {contact.email && <p>✉️ {contact.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={academicDialogOpen} onOpenChange={setAcademicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un suivi scolaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Heures d'absence</Label>
                <Input type="number" value={absenceHours} onChange={(e) => setAbsenceHours(e.target.value)} />
              </div>
              <div>
                <Label>Note (/20)</Label>
                <Input type="number" value={academicGrade} onChange={(e) => setAcademicGrade(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Raison absence</Label>
              <Input value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value)} />
            </div>
            <div>
              <Label>Matière</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={academicNotes} onChange={(e) => setAcademicNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcademicDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addAcademicTracking.mutate()}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={staffNoteDialogOpen} onOpenChange={setStaffNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rôle</Label>
              <Select value={staffRole} onValueChange={setStaffRole}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contenu</Label>
              <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffNoteDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addStaffNote.mutate()} disabled={!staffRole || !noteContent}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={developmentDialogOpen} onOpenChange={setDevelopmentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau plan de développement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Saison</Label>
              <Input type="number" value={seasonYear} onChange={(e) => setSeasonYear(e.target.value)} />
            </div>
            <div>
              <Label>Objectifs physiques</Label>
              <Textarea value={physicalObj} onChange={(e) => setPhysicalObj(e.target.value)} />
            </div>
            <div>
              <Label>Objectifs techniques</Label>
              <Textarea value={technicalObj} onChange={(e) => setTechnicalObj(e.target.value)} />
            </div>
            <div>
              <Label>Objectifs tactiques</Label>
              <Textarea value={tacticalObj} onChange={(e) => setTacticalObj(e.target.value)} />
            </div>
            <div>
              <Label>Objectifs mentaux</Label>
              <Textarea value={mentalObj} onChange={(e) => setMentalObj(e.target.value)} />
            </div>
            <div>
              <Label>Objectifs scolaires</Label>
              <Textarea value={academicObj} onChange={(e) => setAcademicObj(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDevelopmentDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addDevelopmentPlan.mutate()}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectionDialogOpen} onOpenChange={setSelectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une sélection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de sélection</Label>
              <Select value={selectionType} onValueChange={setSelectionType}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {SELECTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={selectionDate} onChange={(e) => setSelectionDate(e.target.value)} />
            </div>
            <div>
              <Label>Compétition</Label>
              <Input value={competitionName} onChange={(e) => setCompetitionName(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={selectionNotes} onChange={(e) => setSelectionNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectionDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addSelection.mutate()} disabled={!selectionType}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prénom</Label>
                <Input value={contactFirstName} onChange={(e) => setContactFirstName(e.target.value)} />
              </div>
              <div>
                <Label>Nom</Label>
                <Input value={contactLastName} onChange={(e) => setContactLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div>
              <Label>Relation</Label>
              <Input value={contactRelationship} onChange={(e) => setContactRelationship(e.target.value)} placeholder="Père, Mère, Tuteur..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addContact.mutate()} disabled={!contactFirstName || !contactLastName}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
