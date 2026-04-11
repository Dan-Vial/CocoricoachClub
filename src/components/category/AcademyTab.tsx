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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { GraduationCap, Award, Star, BookOpen, Clock, BarChart3, CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { SelectionsSection } from "./academy/SelectionsSection";
import { EvaluationsSection } from "./academy/EvaluationsSection";
import { AcademicStatsSection } from "./academy/AcademicStatsSection";

interface AcademyTabProps {
  categoryId: string;
}


export function AcademyTab({ categoryId }: AcademyTabProps) {
  const queryClient = useQueryClient();
  const [academicDialogOpen, setAcademicDialogOpen] = useState(false);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  
  
  const [selectedPlayer, setSelectedPlayer] = useState("");

  // Form states
  const [absenceHours, setAbsenceHours] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [academicGrade, setAcademicGrade] = useState("");
  const [gradeScale, setGradeScale] = useState("20");
  const [subject, setSubject] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [gradeDate, setGradeDate] = useState<Date>(new Date());
  const [academicNotes, setAcademicNotes] = useState("");



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



  const addAcademicGrade = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_academic_tracking").insert({
        player_id: selectedPlayer,
        category_id: categoryId,
        school_absence_hours: 0,
        academic_grade: gradeScale !== "letter" && academicGrade ? parseFloat(academicGrade) : null,
        grade_scale: gradeScale,
        subject: subject || null,
        notes: gradeScale === "letter" ? `${academicGrade}${academicNotes ? ` - ${academicNotes}` : ""}` : (academicNotes || null),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_tracking", categoryId] });
      toast.success("Note scolaire ajoutée");
      resetAcademicForm();
      setAcademicDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const addAbsence = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_academic_tracking").insert({
        player_id: selectedPlayer,
        category_id: categoryId,
        school_absence_hours: absenceHours ? parseFloat(absenceHours) : 0,
        absence_reason: absenceReason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_tracking", categoryId] });
      toast.success("Absence enregistrée");
      resetAbsenceForm();
      setAbsenceDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });


  const resetAcademicForm = () => {
    setSelectedPlayer("");
    setAcademicGrade("");
    setGradeScale("20");
    setSubject("");
    setAcademicNotes("");
  };

  const resetAbsenceForm = () => {
    setSelectedPlayer("");
    setAbsenceHours("");
    setAbsenceReason("");
  };


  const { data: existingSubjects } = useQuery({
    queryKey: ["academic_subjects", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_academic_tracking")
        .select("subject")
        .eq("category_id", categoryId)
        .not("subject", "is", null);
      if (error) throw error;
      const subjects = [...new Set(data.map(d => d.subject).filter(Boolean))] as string[];
      return subjects.sort();
    },
  });


  return (
    <div className="space-y-6">
      <Tabs defaultValue="academic" className="space-y-4">
        <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
          <ColoredSubTabsList colorKey="academy" className="inline-flex w-max">
            <ColoredSubTabsTrigger value="academic" colorKey="academy" icon={<GraduationCap className="h-4 w-4" />}>
              Suivi Scolaire
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="selections" colorKey="academy" icon={<Award className="h-4 w-4" />}>
              Sélections
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="evaluations" colorKey="academy" icon={<Star className="h-4 w-4" />}>
              Évaluations
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger value="stats" colorKey="academy" icon={<BarChart3 className="h-4 w-4" />}>
              Statistiques
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
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAbsenceDialogOpen(true)}>
                    <Clock className="h-4 w-4 mr-2" />
                    Ajouter une absence
                  </Button>
                  <Button onClick={() => setAcademicDialogOpen(true)}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Ajouter une note
                  </Button>
                </div>
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
                          <TableCell>
                            {entry.academic_grade 
                              ? `${entry.academic_grade}/${(entry as any).grade_scale || "20"}`
                              : ((entry as any).grade_scale === "letter" && entry.notes) 
                                ? entry.notes.split(" - ")[0]
                                : "-"
                            }
                          </TableCell>
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

        {/* Selections Tab */}
        <TabsContent value="selections">
          <SelectionsSection categoryId={categoryId} players={players} />
        </TabsContent>


        {/* Evaluations Tab */}
        <TabsContent value="evaluations">
          <EvaluationsSection categoryId={categoryId} players={players} />
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <AcademicStatsSection categoryId={categoryId} />
        </TabsContent>
      </Tabs>

      {/* Grade Dialog */}
      <Dialog open={academicDialogOpen} onOpenChange={setAcademicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une note scolaire</DialogTitle>
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
              <Label>Barème</Label>
              <Select value={gradeScale} onValueChange={(val) => { setGradeScale(val); setAcademicGrade(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Sur 5</SelectItem>
                  <SelectItem value="10">Sur 10</SelectItem>
                  <SelectItem value="20">Sur 20</SelectItem>
                  <SelectItem value="letter">Lettres (A, B, C, D)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Note</Label>
                {gradeScale === "letter" ? (
                  <Select value={academicGrade} onValueChange={setAcademicGrade}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input type="number" value={academicGrade} onChange={(e) => setAcademicGrade(e.target.value)} placeholder={`/${gradeScale}`} min="0" max={gradeScale} />
                )}
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
            <Button onClick={() => addAcademicGrade.mutate()} disabled={!selectedPlayer || !academicGrade || addAcademicGrade.isPending}>
              {addAcademicGrade.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Absence Dialog */}
      <Dialog open={absenceDialogOpen} onOpenChange={setAbsenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une absence</DialogTitle>
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
                <Label>Raison</Label>
                <Input value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value)} placeholder="Compétition, blessure..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsenceDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => addAbsence.mutate()} disabled={!selectedPlayer || !absenceHours || addAbsence.isPending}>
              {addAbsence.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
