import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GraduationCap, Users, Target, Trash2, Award, Star } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { SelectionsSection } from "./academy/SelectionsSection";
import { EvaluationsSection } from "./academy/EvaluationsSection";

interface AcademyTabProps {
  categoryId: string;
}

const STAFF_ROLES = [
  { value: "medecin", label: "Médecin" },
  { value: "kine", label: "Kinésithérapeute" },
  { value: "preparateur", label: "Préparateur physique" },
  { value: "tuteur", label: "Tuteur scolaire" },
  { value: "coach", label: "Coach" },
];

export function AcademyTab({ categoryId }: AcademyTabProps) {
  const queryClient = useQueryClient();
  const [academicDialogOpen, setAcademicDialogOpen] = useState(false);
  const [staffNoteDialogOpen, setStaffNoteDialogOpen] = useState(false);
  const [developmentDialogOpen, setDevelopmentDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");

  // Form states
  const [absenceHours, setAbsenceHours] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [academicGrade, setAcademicGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [academicNotes, setAcademicNotes] = useState("");

  const [staffRole, setStaffRole] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear().toString());
  const [physicalObj, setPhysicalObj] = useState("");
  const [technicalObj, setTechnicalObj] = useState("");
  const [tacticalObj, setTacticalObj] = useState("");
  const [mentalObj, setMentalObj] = useState("");
  const [academicObj, setAcademicObj] = useState("");

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: academicData } = useQuery({
    queryKey: ["academic_tracking", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_academic_tracking")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("tracking_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: staffNotes } = useQuery({
    queryKey: ["staff_notes", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_notes")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("note_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: developmentPlans } = useQuery({
    queryKey: ["development_plans", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_development_plans")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("season_year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addAcademicTracking = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_academic_tracking").insert({
        player_id: selectedPlayer,
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
      queryClient.invalidateQueries({ queryKey: ["academic_tracking", categoryId] });
      toast.success("Suivi scolaire ajouté");
      resetAcademicForm();
      setAcademicDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const addStaffNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff_notes").insert({
        player_id: selectedPlayer,
        category_id: categoryId,
        staff_role: staffRole,
        note_content: noteContent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff_notes", categoryId] });
      toast.success("Note ajoutée");
      resetStaffNoteForm();
      setStaffNoteDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const addDevelopmentPlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_development_plans").insert({
        player_id: selectedPlayer,
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
      queryClient.invalidateQueries({ queryKey: ["development_plans", categoryId] });
      toast.success("Plan de développement créé");
      resetDevelopmentForm();
      setDevelopmentDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const resetAcademicForm = () => {
    setSelectedPlayer("");
    setAbsenceHours("");
    setAbsenceReason("");
    setAcademicGrade("");
    setSubject("");
    setAcademicNotes("");
  };

  const resetStaffNoteForm = () => {
    setSelectedPlayer("");
    setStaffRole("");
    setNoteContent("");
  };

  const resetDevelopmentForm = () => {
    setSelectedPlayer("");
    setSeasonYear(new Date().getFullYear().toString());
    setPhysicalObj("");
    setTechnicalObj("");
    setTacticalObj("");
    setMentalObj("");
    setAcademicObj("");
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
        <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
          <ColoredSubTabsList colorKey="academy" className="inline-flex w-max">
            <ColoredSubTabsTrigger value="academic" colorKey="academy" icon={<GraduationCap className="h-4 w-4" />}>
              Suivi Scolaire
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="staff" colorKey="academy" icon={<Users className="h-4 w-4" />}>
              Notes Staff
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="development" colorKey="academy" icon={<Target className="h-4 w-4" />}>
              Plans de Développement
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="selections" colorKey="academy" icon={<Award className="h-4 w-4" />}>
              Sélections
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="evaluations" colorKey="academy" icon={<Star className="h-4 w-4" />}>
              Évaluations
            </ColoredSubTabsTrigger>
          </ColoredSubTabsList>
        </div>

        {/* Academic Tracking Tab */}
        <TabsContent value="academic">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Suivi Scolaire</CardTitle>
                  <CardDescription>Absences, notes et suivi académique</CardDescription>
                </div>
                <Button onClick={() => setAcademicDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle entrée
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!academicData || academicData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun suivi scolaire enregistré.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Joueur</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Heures Absence</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Matière</TableHead>
                        <TableHead>Commentaires</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {academicData.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.players?.name}</TableCell>
                          <TableCell>{format(new Date(entry.tracking_date), "dd MMM yyyy", { locale: fr })}</TableCell>
                          <TableCell>{entry.school_absence_hours || 0}h</TableCell>
                          <TableCell className="max-w-32 truncate">{entry.absence_reason || "-"}</TableCell>
                          <TableCell>{entry.academic_grade ? `${entry.academic_grade}/20` : "-"}</TableCell>
                          <TableCell>{entry.subject || "-"}</TableCell>
                          <TableCell className="max-w-40 truncate">{entry.notes || "-"}</TableCell>
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
                  <CardTitle>Notes du Staff</CardTitle>
                  <CardDescription>Commentaires médecin, kiné, préparateur, tuteur</CardDescription>
                </div>
                <Button onClick={() => setStaffNoteDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!staffNotes || staffNotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune note enregistrée.</p>
              ) : (
                <div className="space-y-4">
                  {staffNotes.map((note) => (
                    <div key={note.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{note.players?.name}</span>
                          <Badge className={`${getRoleBadgeColor(note.staff_role)} text-white`}>
                            {STAFF_ROLES.find((r) => r.value === note.staff_role)?.label || note.staff_role}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
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
                  <CardTitle>Plans de Développement Individuel</CardTitle>
                  <CardDescription>Objectifs annuels et bilans par joueur</CardDescription>
                </div>
                <Button onClick={() => setDevelopmentDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau plan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!developmentPlans || developmentPlans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun plan de développement enregistré.</p>
              ) : (
                <div className="space-y-4">
                  {developmentPlans.map((plan) => (
                    <div key={plan.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-lg">{plan.players?.name}</span>
                          <Badge variant="outline">Saison {plan.season_year}/{plan.season_year + 1}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {plan.physical_objectives && (
                          <div className="p-3 bg-muted rounded">
                            <span className="font-medium text-primary">Physique:</span>
                            <p className="mt-1">{plan.physical_objectives}</p>
                          </div>
                        )}
                        {plan.technical_objectives && (
                          <div className="p-3 bg-muted rounded">
                            <span className="font-medium text-primary">Technique:</span>
                            <p className="mt-1">{plan.technical_objectives}</p>
                          </div>
                        )}
                        {plan.tactical_objectives && (
                          <div className="p-3 bg-muted rounded">
                            <span className="font-medium text-primary">Tactique:</span>
                            <p className="mt-1">{plan.tactical_objectives}</p>
                          </div>
                        )}
                        {plan.mental_objectives && (
                          <div className="p-3 bg-muted rounded">
                            <span className="font-medium text-primary">Mental:</span>
                            <p className="mt-1">{plan.mental_objectives}</p>
                          </div>
                        )}
                        {plan.academic_objectives && (
                          <div className="p-3 bg-muted rounded">
                            <span className="font-medium text-primary">Scolaire:</span>
                            <p className="mt-1">{plan.academic_objectives}</p>
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
          <SelectionsSection categoryId={categoryId} players={players} />
        </TabsContent>


        {/* Evaluations Tab */}
        <TabsContent value="evaluations">
          <EvaluationsSection categoryId={categoryId} players={players} />
        </TabsContent>
      </Tabs>

      {/* Academic Dialog */}
      <Dialog open={academicDialogOpen} onOpenChange={setAcademicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un suivi scolaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Joueur</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un joueur" /></SelectTrigger>
                <SelectContent>
                  {players?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name ? `${p.first_name} ${p.name}` : p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Heures d'absence</Label>
                <Input type="number" value={absenceHours} onChange={(e) => setAbsenceHours(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Raison absence</Label>
                <Input value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value)} placeholder="Compétition, blessure..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Note (/20)</Label>
                <Input type="number" value={academicGrade} onChange={(e) => setAcademicGrade(e.target.value)} placeholder="15" />
              </div>
              <div>
                <Label>Matière</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mathématiques" />
              </div>
            </div>
            <div>
              <Label>Commentaires</Label>
              <Textarea value={academicNotes} onChange={(e) => setAcademicNotes(e.target.value)} placeholder="Notes additionnelles..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcademicDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addAcademicTracking.mutate()} disabled={!selectedPlayer || addAcademicTracking.isPending}>
              {addAcademicTracking.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Note Dialog */}
      <Dialog open={staffNoteDialogOpen} onOpenChange={setStaffNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Joueur</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un joueur" /></SelectTrigger>
                <SelectContent>
                  {players?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name ? `${p.first_name} ${p.name}` : p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rôle</Label>
              <Select value={staffRole} onValueChange={setStaffRole}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Contenu de la note..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffNoteDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addStaffNote.mutate()} disabled={!selectedPlayer || !staffRole || !noteContent || addStaffNote.isPending}>
              {addStaffNote.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Development Plan Dialog */}
      <Dialog open={developmentDialogOpen} onOpenChange={setDevelopmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un plan de développement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Joueur</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un joueur" /></SelectTrigger>
                  <SelectContent>
                    {players?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.first_name ? `${p.first_name} ${p.name}` : p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Année de saison</Label>
                <Input type="number" value={seasonYear} onChange={(e) => setSeasonYear(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Objectifs Physiques</Label>
                <Textarea value={physicalObj} onChange={(e) => setPhysicalObj(e.target.value)} placeholder="Ex: Améliorer la VMA de 10%..." rows={2} />
              </div>
              <div>
                <Label>Objectifs Techniques</Label>
                <Textarea value={technicalObj} onChange={(e) => setTechnicalObj(e.target.value)} placeholder="Ex: Travailler le jeu au pied..." rows={2} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Objectifs Tactiques</Label>
                <Textarea value={tacticalObj} onChange={(e) => setTacticalObj(e.target.value)} placeholder="Ex: Améliorer la lecture du jeu..." rows={2} />
              </div>
              <div>
                <Label>Objectifs Mentaux</Label>
                <Textarea value={mentalObj} onChange={(e) => setMentalObj(e.target.value)} placeholder="Ex: Gestion du stress en match..." rows={2} />
              </div>
            </div>
            <div>
              <Label>Objectifs Scolaires</Label>
              <Textarea value={academicObj} onChange={(e) => setAcademicObj(e.target.value)} placeholder="Ex: Maintenir une moyenne > 12..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDevelopmentDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addDevelopmentPlan.mutate()} disabled={!selectedPlayer || addDevelopmentPlan.isPending}>
              {addDevelopmentPlan.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
