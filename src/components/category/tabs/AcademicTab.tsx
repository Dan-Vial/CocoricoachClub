import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  GraduationCap, 
  User, 
  Plus, 
  BookOpen, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  School,
  Phone,
  Mail,
  FileText
} from "lucide-react";

interface AcademicTabProps {
  categoryId: string;
}

const GRADE_LEVELS = [
  "6ème", "5ème", "4ème", "3ème",
  "2nde", "1ère", "Terminale",
  "Licence 1", "Licence 2", "Licence 3",
  "Master 1", "Master 2",
  "BTS 1", "BTS 2",
  "Autre"
];

const SUBJECTS = [
  "Français", "Mathématiques", "Anglais", "Espagnol", "Allemand",
  "Histoire-Géographie", "SVT", "Physique-Chimie", "EPS",
  "Philosophie", "SES", "NSI", "Arts plastiques", "Musique",
  "Moyenne générale", "Autre"
];

const TERMS = ["Trimestre 1", "Trimestre 2", "Trimestre 3", "Semestre 1", "Semestre 2"];

export function AcademicTab({ categoryId }: AcademicTabProps) {
  const queryClient = useQueryClient();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);

  // Fetch players
  const { data: players = [] } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch academic profile for selected player
  const { data: academicProfile } = useQuery({
    queryKey: ["academic-profile", selectedPlayerId],
    queryFn: async () => {
      if (!selectedPlayerId) return null;
      const { data, error } = await supabase
        .from("player_academic_profiles" as any)
        .select("*")
        .eq("player_id", selectedPlayerId)
        .eq("category_id", categoryId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!selectedPlayerId,
  });

  // Fetch grades for selected player
  const { data: grades = [] } = useQuery({
    queryKey: ["academic-grades", selectedPlayerId],
    queryFn: async () => {
      if (!selectedPlayerId) return [];
      const { data, error } = await supabase
        .from("academic_grades" as any)
        .select("*")
        .eq("player_id", selectedPlayerId)
        .eq("category_id", categoryId)
        .order("grade_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedPlayerId,
  });

  // Fetch absences for selected player
  const { data: absences = [] } = useQuery({
    queryKey: ["academic-absences", selectedPlayerId],
    queryFn: async () => {
      if (!selectedPlayerId) return [];
      const { data, error } = await supabase
        .from("academic_absences" as any)
        .select("*")
        .eq("player_id", selectedPlayerId)
        .eq("category_id", categoryId)
        .order("absence_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedPlayerId,
  });

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const { error } = await supabase
        .from("player_academic_profiles" as any)
        .upsert({
          player_id: selectedPlayerId,
          category_id: categoryId,
          ...profileData,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-profile", selectedPlayerId] });
      toast.success("Profil académique enregistré");
      setProfileDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  // Add grade mutation
  const addGradeMutation = useMutation({
    mutationFn: async (gradeData: any) => {
      const { error } = await supabase
        .from("academic_grades" as any)
        .insert({
          player_id: selectedPlayerId,
          category_id: categoryId,
          ...gradeData,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-grades", selectedPlayerId] });
      toast.success("Note ajoutée");
      setGradeDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  // Add absence mutation
  const addAbsenceMutation = useMutation({
    mutationFn: async (absenceData: any) => {
      const { error } = await supabase
        .from("academic_absences" as any)
        .insert({
          player_id: selectedPlayerId,
          category_id: categoryId,
          ...absenceData,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-absences", selectedPlayerId] });
      toast.success("Absence enregistrée");
      setAbsenceDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  // Calculate stats
  const averageGrade = grades.length > 0 
    ? grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 20), 0) / grades.length 
    : null;
  const totalAbsences = absences.reduce((sum, a) => sum + (a.duration_hours || 1), 0);
  const unjustifiedAbsences = absences.filter(a => !a.justified).length;

  return (
    <div className="space-y-6">
      {/* Player Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Suivi Académique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Sélectionner un joueur</Label>
              <Select value={selectedPlayerId || ""} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un joueur..." />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedPlayerId && (
        <>
          {/* Player Academic Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Profile Card */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <School className="h-4 w-4" />
                  Profil Scolaire
                </CardTitle>
                <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      {academicProfile ? "Modifier" : "Configurer"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Profil Académique - {selectedPlayer?.name}</DialogTitle>
                    </DialogHeader>
                    <ProfileForm 
                      profile={academicProfile} 
                      onSave={(data) => saveProfileMutation.mutate(data)} 
                      isLoading={saveProfileMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-3">
                {academicProfile ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Établissement</p>
                      <p className="font-medium">{academicProfile.school_name || "Non renseigné"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Niveau</p>
                      <p className="font-medium">{academicProfile.grade_level || "Non renseigné"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Classe</p>
                      <p className="font-medium">{academicProfile.class_name || "Non renseigné"}</p>
                    </div>
                    {academicProfile.school_contact_name && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> Contact école
                        </p>
                        <p className="font-medium">{academicProfile.school_contact_name}</p>
                        {academicProfile.school_contact_email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {academicProfile.school_contact_email}
                          </p>
                        )}
                        {academicProfile.school_contact_phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {academicProfile.school_contact_phone}
                          </p>
                        )}
                      </div>
                    )}
                    {academicProfile.special_arrangements && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Aménagements
                        </p>
                        <p className="text-sm">{academicProfile.special_arrangements}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun profil configuré
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  {averageGrade !== null ? (
                    <>
                      <p className="text-3xl font-bold">{averageGrade.toFixed(1)}/20</p>
                      <p className="text-sm text-muted-foreground">Moyenne générale</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        {averageGrade >= 12 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {grades.length} notes enregistrées
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">
                      Aucune note enregistrée
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Absences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold">{totalAbsences}h</p>
                  <p className="text-sm text-muted-foreground">Total absences</p>
                  {unjustifiedAbsences > 0 && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-500">
                        {unjustifiedAbsences} non justifiée(s)
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grades and Absences Tabs */}
          <Card>
            <Tabs defaultValue="grades">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="grades">Notes</TabsTrigger>
                    <TabsTrigger value="absences">Absences</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Note
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajouter une note</DialogTitle>
                        </DialogHeader>
                        <GradeForm 
                          onSave={(data) => addGradeMutation.mutate(data)} 
                          isLoading={addGradeMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                    <Dialog open={absenceDialogOpen} onOpenChange={setAbsenceDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-1" />
                          Absence
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Enregistrer une absence</DialogTitle>
                        </DialogHeader>
                        <AbsenceForm 
                          onSave={(data) => addAbsenceMutation.mutate(data)} 
                          isLoading={addAbsenceMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <TabsContent value="grades" className="mt-0">
                  {grades.length > 0 ? (
                    <div className="space-y-2">
                      {grades.map((grade: any) => (
                        <div key={grade.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{grade.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(grade.grade_date), "d MMMM yyyy", { locale: fr })}
                              {grade.term && ` • ${grade.term}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={grade.grade >= grade.max_grade * 0.5 ? "default" : "destructive"}>
                              {grade.grade}/{grade.max_grade}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune note enregistrée
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="absences" className="mt-0">
                  {absences.length > 0 ? (
                    <div className="space-y-2">
                      {absences.map((absence: any) => (
                        <div key={absence.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">
                              {format(new Date(absence.absence_date), "d MMMM yyyy", { locale: fr })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {absence.reason || "Pas de motif renseigné"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{absence.duration_hours}h</span>
                            <Badge variant={absence.justified ? "outline" : "destructive"}>
                              {absence.justified ? "Justifiée" : "Non justifiée"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune absence enregistrée
                    </p>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </>
      )}
    </div>
  );
}

// Profile Form Component
function ProfileForm({ profile, onSave, isLoading }: { profile: any; onSave: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    school_name: profile?.school_name || "",
    grade_level: profile?.grade_level || "",
    class_name: profile?.class_name || "",
    school_contact_name: profile?.school_contact_name || "",
    school_contact_email: profile?.school_contact_email || "",
    school_contact_phone: profile?.school_contact_phone || "",
    special_arrangements: profile?.special_arrangements || "",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Établissement</Label>
          <Input 
            value={formData.school_name} 
            onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
            placeholder="Nom de l'école/lycée"
          />
        </div>
        <div>
          <Label>Niveau</Label>
          <Select value={formData.grade_level} onValueChange={(v) => setFormData({ ...formData, grade_level: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Classe / Section</Label>
          <Input 
            value={formData.class_name} 
            onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
            placeholder="Ex: Sport-études"
          />
        </div>
      </div>
      <div className="space-y-2 pt-2 border-t">
        <p className="text-sm font-medium">Contact établissement</p>
        <Input 
          value={formData.school_contact_name} 
          onChange={(e) => setFormData({ ...formData, school_contact_name: e.target.value })}
          placeholder="Nom du contact"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input 
            type="email"
            value={formData.school_contact_email} 
            onChange={(e) => setFormData({ ...formData, school_contact_email: e.target.value })}
            placeholder="Email"
          />
          <Input 
            type="tel"
            value={formData.school_contact_phone} 
            onChange={(e) => setFormData({ ...formData, school_contact_phone: e.target.value })}
            placeholder="Téléphone"
          />
        </div>
      </div>
      <div>
        <Label>Aménagements scolaires</Label>
        <Textarea 
          value={formData.special_arrangements} 
          onChange={(e) => setFormData({ ...formData, special_arrangements: e.target.value })}
          placeholder="Aménagements horaires, dispenses, etc."
        />
      </div>
      <Button onClick={() => onSave(formData)} disabled={isLoading} className="w-full">
        {isLoading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}

// Grade Form Component
function GradeForm({ onSave, isLoading }: { onSave: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    subject: "",
    grade: "",
    max_grade: "20",
    grade_date: new Date().toISOString().split("T")[0],
    term: "",
    notes: "",
  });
  const [customSubject, setCustomSubject] = useState("");
  const isCustom = formData.subject === "Autre";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Matière</Label>
          <div className="space-y-2">
            <Select value={formData.subject} onValueChange={(v) => {
              setFormData({ ...formData, subject: v });
              if (v !== "Autre") setCustomSubject("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((subject) => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCustom && (
              <Input 
                placeholder="Entrer le nom de la matière" 
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                autoFocus
              />
            )}
          </div>
        </div>
        <div>
          <Label>Note</Label>
          <Input 
            type="number" 
            step="0.5"
            min="0"
            value={formData.grade} 
            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            placeholder="15.5"
          />
        </div>
        <div>
          <Label>Sur</Label>
          <Input 
            type="number" 
            value={formData.max_grade} 
            onChange={(e) => setFormData({ ...formData, max_grade: e.target.value })}
          />
        </div>
        <div>
          <Label>Date</Label>
          <Input 
            type="date" 
            value={formData.grade_date} 
            onChange={(e) => setFormData({ ...formData, grade_date: e.target.value })}
          />
        </div>
        <div>
          <Label>Période</Label>
          <Select value={formData.term} onValueChange={(v) => setFormData({ ...formData, term: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {TERMS.map((term) => (
                <SelectItem key={term} value={term}>{term}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Notes / Commentaires</Label>
        <Textarea 
          value={formData.notes} 
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Observations..."
        />
      </div>
      <Button 
        onClick={() => onSave({
          ...formData,
          subject: isCustom ? customSubject : formData.subject,
          grade: parseFloat(formData.grade),
          max_grade: parseFloat(formData.max_grade),
        })} 
        disabled={isLoading || !formData.subject || !formData.grade || (isCustom && !customSubject)} 
        className="w-full"
      >
        {isLoading ? "Ajout..." : "Ajouter la note"}
      </Button>
    </div>
  );
}

// Absence Form Component
function AbsenceForm({ onSave, isLoading }: { onSave: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    absence_date: new Date().toISOString().split("T")[0],
    absence_type: "absence",
    justified: false,
    reason: "",
    duration_hours: "1",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input 
            type="date" 
            value={formData.absence_date} 
            onChange={(e) => setFormData({ ...formData, absence_date: e.target.value })}
          />
        </div>
        <div>
          <Label>Durée (heures)</Label>
          <Input 
            type="number" 
            step="0.5"
            min="0.5"
            value={formData.duration_hours} 
            onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
          />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={formData.absence_type} onValueChange={(v) => setFormData({ ...formData, absence_type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="absence">Absence</SelectItem>
              <SelectItem value="retard">Retard</SelectItem>
              <SelectItem value="exclusion">Exclusion</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Statut</Label>
          <Select 
            value={formData.justified ? "justified" : "unjustified"} 
            onValueChange={(v) => setFormData({ ...formData, justified: v === "justified" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="justified">Justifiée</SelectItem>
              <SelectItem value="unjustified">Non justifiée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Motif</Label>
        <Textarea 
          value={formData.reason} 
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="Raison de l'absence..."
        />
      </div>
      <Button 
        onClick={() => onSave({
          ...formData,
          duration_hours: parseFloat(formData.duration_hours),
        })} 
        disabled={isLoading} 
        className="w-full"
      >
        {isLoading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
