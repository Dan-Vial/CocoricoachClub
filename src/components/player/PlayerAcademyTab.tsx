import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { GraduationCap, BookOpen, Clock, BarChart3, CalendarIcon, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { PlayerAcademicStats } from "./PlayerAcademicStats";

interface PlayerAcademyTabProps {
  playerId: string;
  categoryId: string;
  playerName: string;
  readOnly?: boolean;
}

export function PlayerAcademyTab({ playerId, categoryId, playerName, readOnly = false }: PlayerAcademyTabProps) {
  const { isViewer: contextViewer } = useViewerModeContext();
  const isViewer = contextViewer || readOnly;
  const queryClient = useQueryClient();
  const [academicDialogOpen, setAcademicDialogOpen] = useState(false);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

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

  const DEFAULT_SUBJECTS = [
    "Mathématiques", "Français", "Anglais", "Espagnol", "Allemand",
    "Histoire-Géographie", "Physique-Chimie", "SVT", "SES",
    "Philosophie", "EPS", "NSI", "EMC",
    "Arts Plastiques", "Musique", "Italien",
    "HGGSP", "HLP", "LLCE", "Maths Expertes", "Maths Complémentaires",
  ];

  const { data: dbSubjects } = useQuery({
    queryKey: ["academic_subjects_player", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_academic_tracking")
        .select("subject")
        .eq("player_id", playerId)
        .not("subject", "is", null);
      if (error) throw error;
      return [...new Set(data.map(d => d.subject).filter(Boolean))] as string[];
    },
  });

  const existingSubjects = [...new Set([...DEFAULT_SUBJECTS, ...(dbSubjects || [])])].sort();

  const addAcademicGrade = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_academic_tracking").insert({
        player_id: playerId,
        category_id: categoryId,
        school_absence_hours: 0,
        academic_grade: gradeScale !== "letter" && academicGrade ? parseFloat(academicGrade) : null,
        grade_scale: gradeScale,
        subject: subject || null,
        tracking_date: format(gradeDate, "yyyy-MM-dd"),
        notes: gradeScale === "letter" ? `${academicGrade}${academicNotes ? ` - ${academicNotes}` : ""}` : (academicNotes || null),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_academic", playerId] });
      queryClient.invalidateQueries({ queryKey: ["academic_subjects_player", playerId] });
      toast.success("Note scolaire ajoutée");
      resetAcademicForm();
      setAcademicDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const addAbsence = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("player_academic_tracking").insert({
        player_id: playerId,
        category_id: categoryId,
        school_absence_hours: absenceHours ? parseFloat(absenceHours) : 0,
        absence_reason: absenceReason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_academic", playerId] });
      toast.success("Absence enregistrée");
      resetAbsenceForm();
      setAbsenceDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const updateAcademicGrade = useMutation({
    mutationFn: async () => {
      if (!editingEntryId) return;
      const { error } = await supabase.from("player_academic_tracking").update({
        academic_grade: gradeScale !== "letter" && academicGrade ? parseFloat(academicGrade) : null,
        grade_scale: gradeScale,
        subject: subject || null,
        tracking_date: format(gradeDate, "yyyy-MM-dd"),
        notes: gradeScale === "letter" ? `${academicGrade}${academicNotes ? ` - ${academicNotes}` : ""}` : (academicNotes || null),
      }).eq("id", editingEntryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_academic", playerId] });
      queryClient.invalidateQueries({ queryKey: ["academic_subjects_player", playerId] });
      toast.success("Note modifiée");
      resetAcademicForm();
      setAcademicDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de la modification"),
  });

  const deleteAcademicEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from("player_academic_tracking").delete().eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_academic", playerId] });
      queryClient.invalidateQueries({ queryKey: ["academic_subjects_player", playerId] });
      toast.success("Entrée supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const handleEditEntry = (entry: any) => {
    setEditingEntryId(entry.id);
    setGradeScale(entry.grade_scale || "20");
    if (entry.grade_scale === "letter" && entry.notes) {
      setAcademicGrade(entry.notes.split(" - ")[0]);
      setAcademicNotes(entry.notes.includes(" - ") ? entry.notes.split(" - ").slice(1).join(" - ") : "");
    } else {
      setAcademicGrade(entry.academic_grade ? String(entry.academic_grade) : "");
      setAcademicNotes(entry.notes || "");
    }
    setSubject(entry.subject || "");
    setGradeDate(new Date(entry.tracking_date));
    setAcademicDialogOpen(true);
  };

  const resetAcademicForm = () => {
    setAcademicGrade("");
    setGradeScale("20");
    setSubject("");
    setNewSubject("");
    setIsAddingSubject(false);
    setGradeDate(new Date());
    setAcademicNotes("");
    setEditingEntryId(null);
  };

  const resetAbsenceForm = () => {
    setAbsenceHours("");
    setAbsenceReason("");
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="academic" className="space-y-4">
        <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
          <ColoredSubTabsList colorKey="academy" className="inline-flex w-max">
            <ColoredSubTabsTrigger value="academic" colorKey="academy" icon={<GraduationCap className="h-4 w-4" />}>
              Suivi Scolaire
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
                  <CardTitle>Suivi Scolaire — {playerName}</CardTitle>
                  <CardDescription>Absences, notes et suivi académique</CardDescription>
                </div>
                {!isViewer && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAbsenceDialogOpen(true)}>
                      <Clock className="h-4 w-4 mr-2" />
                      Absence
                    </Button>
                    <Button size="sm" onClick={() => setAcademicDialogOpen(true)}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Note
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notes section */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Notes</h3>
                {(!academicData || academicData.filter(e => e.academic_grade || (e as any).grade_scale === "letter").length === 0) ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">Aucune note enregistrée.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead>Matière</TableHead>
                          <TableHead>Commentaires</TableHead>
                          {!isViewer && <TableHead className="w-20">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {academicData.filter(e => e.academic_grade || (e as any).grade_scale === "letter").map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{format(new Date(entry.tracking_date), "dd MMM yyyy", { locale: fr })}</TableCell>
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
                            {!isViewer && (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEntry(entry)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => {
                                    if (confirm("Supprimer cette note ?")) deleteAcademicEntry.mutate(entry.id);
                                  }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Absences section */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Absences</h3>
                {(!academicData || academicData.filter(e => e.school_absence_hours && e.school_absence_hours > 0 && !e.academic_grade).length === 0) ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">Aucune absence enregistrée.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Heures</TableHead>
                          <TableHead>Raison</TableHead>
                          {!isViewer && <TableHead className="w-20">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {academicData.filter(e => e.school_absence_hours && e.school_absence_hours > 0 && !e.academic_grade).map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{format(new Date(entry.tracking_date), "dd MMM yyyy", { locale: fr })}</TableCell>
                            <TableCell>{entry.school_absence_hours}h</TableCell>
                            <TableCell className="max-w-40 truncate">{entry.absence_reason || "-"}</TableCell>
                            {!isViewer && (
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => {
                                  if (confirm("Supprimer cette absence ?")) deleteAcademicEntry.mutate(entry.id);
                                }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <PlayerAcademicStats playerId={playerId} categoryId={categoryId} playerName={playerName} />
        </TabsContent>
      </Tabs>

      {/* Grade Dialog */}
      <Dialog open={academicDialogOpen} onOpenChange={(open) => { setAcademicDialogOpen(open); if (!open) resetAcademicForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntryId ? "Modifier la note scolaire" : "Ajouter une note scolaire"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !gradeDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {gradeDate ? format(gradeDate, "dd MMM yyyy", { locale: fr }) : "Choisir une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={gradeDate} onSelect={(d) => d && setGradeDate(d)} initialFocus className="p-3 pointer-events-auto" locale={fr} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label>Matière</Label>
              {isAddingSubject ? (
                <div className="flex gap-2">
                  <Input 
                    value={newSubject} 
                    onChange={(e) => setNewSubject(e.target.value)} 
                    placeholder="Nouvelle matière..." 
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={() => {
                    if (newSubject.trim()) {
                      setSubject(newSubject.trim());
                      setIsAddingSubject(false);
                    }
                  }}>OK</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setIsAddingSubject(false); setNewSubject(""); }}>Annuler</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Sélectionner une matière" /></SelectTrigger>
                    <SelectContent position="popper" side="bottom" align="start" sideOffset={4} className="max-h-[200px]">
                      {existingSubjects.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="icon" variant="outline" onClick={() => setIsAddingSubject(true)} title="Ajouter une matière">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label>Commentaires</Label>
              <Textarea value={academicNotes} onChange={(e) => setAcademicNotes(e.target.value)} placeholder="Notes additionnelles..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAcademicDialogOpen(false); resetAcademicForm(); }}>Annuler</Button>
            <Button 
              onClick={() => editingEntryId ? updateAcademicGrade.mutate() : addAcademicGrade.mutate()} 
              disabled={!academicGrade || addAcademicGrade.isPending || updateAcademicGrade.isPending}
            >
              {(addAcademicGrade.isPending || updateAcademicGrade.isPending) ? "Enregistrement..." : (editingEntryId ? "Modifier" : "Ajouter")}
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
            <Button onClick={() => addAbsence.mutate()} disabled={!absenceHours || addAbsence.isPending}>
              {addAbsence.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
