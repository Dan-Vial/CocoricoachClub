import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { playerSchema } from "@/lib/validations";
import { ATHLETISME_DISCIPLINES, ATHLETISME_SPECIALTIES, JUDO_WEIGHT_CATEGORIES, AVIRON_ROLES, NATATION_DISCIPLINES, NATATION_SPECIALTIES, SKI_DISCIPLINES, SURF_DISCIPLINES, TRIATHLON_DISCIPLINES, PADEL_POSITIONS, isAthletismeCategory, isJudoCategory, isNatationCategory, isSkiCategory, isSurfCategory, isTriathlonCategory, isPadelCategory, isIndividualSport, getSkiDisciplinesForCategory } from "@/lib/constants/sportTypes";
import { getPositionsForSport } from "@/lib/constants/sportPositions";
import { Loader2, Send, UserPlus, Copy, Check, AlertTriangle, Plus, X, Download } from "lucide-react";
import { scrapeFisResults, importFisResultsForPlayer } from "@/lib/fis/scrapeFisResults";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AddPlayerDialogWithInviteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

export function AddPlayerDialogWithInvite({
  open,
  onOpenChange,
  categoryId,
}: AddPlayerDialogWithInviteProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [playerEmail, setPlayerEmail] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [position, setPosition] = useState("");
  const [sendInvitation, setSendInvitation] = useState(true);
  const [validationError, setValidationError] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  // FIS fields
  const [fisCode, setFisCode] = useState("");
  const [fisObjective, setFisObjective] = useState("");
  const [fisObjectiveDate, setFisObjectiveDate] = useState("");
  // Yearly objectives
  const [yearlyObjectives, setYearlyObjectives] = useState<{ label: string; target: string }[]>([]);
  const [importFisHistory, setImportFisHistory] = useState(true);
  const [fisImportStatus, setFisImportStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch category with club info
  const { data: categoryData } = useQuery({
    queryKey: ["category-with-club", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("rugby_type, name, club_id, clubs(id, name)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch client athlete limits
  const { data: clientLimits } = useQuery({
    queryKey: ["client-athlete-limits", categoryData?.club_id],
    queryFn: async () => {
      if (!categoryData?.club_id) return null;
      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("client_id")
        .eq("id", categoryData.club_id)
        .single();
      if (clubError || !club?.client_id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("max_athletes")
        .eq("id", club.client_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: open && !!categoryData?.club_id,
    staleTime: 0,
  });

  // Current player count in this category
  const { data: currentPlayerCount = 0 } = useQuery({
    queryKey: ["category-player-count", categoryId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("category_id", categoryId);
      if (error) throw error;
      return count || 0;
    },
    enabled: open,
    staleTime: 0,
  });

  const maxAthletes = clientLimits?.max_athletes ?? null;
  const isAthletesFull = maxAthletes !== null && currentPlayerCount >= maxAthletes;

  const sportType = categoryData?.rugby_type || "XV";
  const isAthletics = categoryData?.rugby_type ? isAthletismeCategory(categoryData.rugby_type) : false;
  const isJudo = categoryData?.rugby_type ? isJudoCategory(categoryData.rugby_type) : false;
  const isAviron = sportType.toLowerCase().includes("aviron");
  const isNatation = categoryData?.rugby_type ? isNatationCategory(categoryData.rugby_type) : false;
  const isSki = categoryData?.rugby_type ? isSkiCategory(categoryData.rugby_type) : false;
  const isTriathlon = categoryData?.rugby_type ? isTriathlonCategory(categoryData.rugby_type) : false;
  const isPadel = categoryData?.rugby_type ? isPadelCategory(categoryData.rugby_type) : false;
  const isTeamSport = !isIndividualSport(sportType);
  const positions = getPositionsForSport(sportType);
  
  const isSurf = categoryData?.rugby_type ? isSurfCategory(categoryData.rugby_type) : false;
  
  // Determine which discipline list to use
  const getDisciplineOptions = () => {
    if (isAthletics) return ATHLETISME_DISCIPLINES;
    if (isNatation) return NATATION_DISCIPLINES;
    if (isSki) return getSkiDisciplinesForCategory(categoryData?.rugby_type || "");
    if (isSurf) return SURF_DISCIPLINES;
    if (isTriathlon) return TRIATHLON_DISCIPLINES;
    return [];
  };
  const hasDisciplines = isAthletics || isNatation || isSurf || isTriathlon;
  // For ski/snow with only 1 discipline option, don't show discipline picker
  const skiDisciplines = isSki ? getSkiDisciplinesForCategory(categoryData?.rugby_type || "") : [];
  const showSkiDiscipline = isSki && skiDisciplines.length > 1;
  const disciplineOptions = getDisciplineOptions();
  
  // Determine specialties
  const getSpecialtyOptions = () => {
    if (!discipline) return [];
    if (isAthletics) return ATHLETISME_SPECIALTIES[discipline] || [];
    if (isNatation) return NATATION_SPECIALTIES[discipline] || [];
    return [];
  };
  const availableSpecialties = getSpecialtyOptions();

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPlayerEmail("");
    setPlayerPhone("");
    setBirthYear("");
    setBirthDate("");
    setDiscipline("");
    setSpecialty("");
    setPosition("");
    setSendInvitation(true);
    setValidationError("");
    setGeneratedLink(null);
    setLinkCopied(false);
    setFisCode("");
    setFisObjective("");
    setFisObjectiveDate("");
    setYearlyObjectives([]);
    setImportFisHistory(true);
    setFisImportStatus(null);
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addPlayer = useMutation({
    mutationFn: async (data: { 
      name: string; 
      first_name?: string;
      email?: string; 
      phone?: string; 
      birth_year?: number; 
      birth_date?: string; 
      discipline?: string; 
      specialty?: string; 
      position?: string;
      fis_code?: string;
      fis_objective?: string;
      fis_objective_date?: string;
    }) => {
      const { data: player, error } = await supabase
        .from("players")
        .insert({ 
          name: data.name, 
          first_name: data.first_name || null,
          category_id: categoryId,
          email: data.email || null,
          phone: data.phone || null,
          birth_year: data.birth_year,
          birth_date: data.birth_date || null,
          discipline: data.discipline || null,
          specialty: data.specialty || null,
          position: data.position || null,
          fis_code: data.fis_code || null,
          fis_objective: data.fis_objective || null,
          fis_objective_date: data.fis_objective_date || null,
        })
        .select()
        .single();
      if (error) throw error;
      return player;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    // Validate required fields
    if (!lastName.trim()) {
      setValidationError("Le nom est obligatoire");
      return;
    }

    if (sendInvitation && !playerEmail.trim()) {
      setValidationError("L'email est obligatoire pour envoyer une invitation");
      return;
    }

    const birthYearNum = birthYear ? parseInt(birthYear) : undefined;
    const result = playerSchema.safeParse({ 
      name: lastName,
      birthYear: birthYearNum 
    });
    
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    // Validate discipline for sports with disciplines
    if (hasDisciplines && !discipline) {
      setValidationError("Veuillez sélectionner une discipline");
      return;
    }
    if (hasDisciplines && discipline && availableSpecialties.length > 0 && !specialty) {
      setValidationError("Veuillez sélectionner une spécialité");
      return;
    }

    // Validate weight category for judo
    if (isJudo && !discipline) {
      setValidationError("Veuillez sélectionner une catégorie de poids");
      return;
    }

    // Validate role for aviron
    if (isAviron && !position) {
      setValidationError("Veuillez sélectionner un rôle");
      return;
    }

    try {
      // 1. Create the player
      const player = await addPlayer.mutateAsync({
        name: result.data.name,
        first_name: firstName.trim() || undefined,
        email: playerEmail.trim() || undefined,
        phone: playerPhone.trim() || undefined,
        birth_year: result.data.birthYear,
        birth_date: birthDate || undefined,
        discipline: discipline || undefined,
        specialty: specialty || undefined,
        position: position || undefined,
        fis_code: fisCode.trim() || undefined,
        fis_objective: fisObjective.trim() || undefined,
        fis_objective_date: fisObjectiveDate || undefined,
      });

      // Create FIS objectives if provided
      if (isSki && yearlyObjectives.length > 0) {
        const objectivesToInsert = yearlyObjectives
          .filter(obj => obj.label.trim() && obj.target.trim())
          .map(obj => ({
            player_id: player.id,
            category_id: categoryId,
            label: obj.label.trim(),
            points_required: parseFloat(obj.target),
          }));
        if (objectivesToInsert.length > 0) {
          await supabase.from("fis_objectives").insert(objectivesToInsert);
        }
      }

      // Auto-import FIS competition history
      if (isSki && fisCode.trim() && importFisHistory) {
        setFisImportStatus("Récupération de l'historique FIS...");
        try {
          const sectorCode = (categoryData?.rugby_type || "").toLowerCase().includes("ski") ? "AL" : "SB";
          const fisData = await scrapeFisResults(fisCode.trim(), sectorCode);
          if (fisData && fisData.results.length > 0) {
            setFisImportStatus(`Import de ${fisData.results.length} résultats...`);
            const count = await importFisResultsForPlayer(player.id, categoryId, fisData);
            setFisImportStatus(null);
            toast.success(`${count} résultat(s) FIS importé(s) automatiquement 🎿`);
          } else {
            setFisImportStatus(null);
            toast.info("Aucun résultat FIS trouvé pour ce code");
          }
        } catch (fisErr) {
          console.error("FIS import error:", fisErr);
          setFisImportStatus(null);
          toast.warning("Athlète créé mais l'import FIS a échoué. Vous pourrez réessayer plus tard.");
        }
      }

      // 2. Send invitation if requested
      if (sendInvitation && playerEmail.trim() && categoryData) {
        setIsInviting(true);
        
        // Create invitation record
        const { data: invitation, error: invitationError } = await supabase
          .from("athlete_invitations")
          .insert({
            player_id: player.id,
            category_id: categoryId,
            club_id: categoryData.club_id,
            email: playerEmail.trim(),
            phone: playerPhone.trim() || null,
            invited_by: user?.id,
          })
          .select()
          .single();

        if (invitationError) throw invitationError;

        // Send invitation via edge function
        const invitationLink = `${window.location.origin}/accept-athlete-invitation?token=${invitation.token}`;
        
        const channels: ("email" | "sms")[] = ["email"];
        if (playerPhone.trim()) {
          channels.push("sms");
        }

        const { error: sendError } = await supabase.functions.invoke("send-athlete-invitation", {
          body: {
            athleteName: lastName.trim(),
            athleteFirstName: firstName.trim() || undefined,
            email: playerEmail.trim(),
            phone: playerPhone.trim() || undefined,
            clubName: (categoryData.clubs as any)?.name || "Club",
            categoryName: categoryData.name,
            invitationLink,
            channels,
          },
        });

        if (sendError) {
          console.error("Error sending invitation:", sendError);
          setGeneratedLink(invitationLink);
          toast.warning("Athlète ajouté mais erreur lors de l'envoi. Copiez le lien ci-dessous.");
        } else {
          setGeneratedLink(invitationLink);
          toast.success("Athlète ajouté et invitation envoyée ! 📧");
        }
        
        setIsInviting(false);
      } else {
        toast.success("Athlète ajouté avec succès");
      }
      queryClient.invalidateQueries({ queryKey: ["players", categoryId] });
      if (!sendInvitation) {
        resetForm();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Erreur lors de l'ajout de l'athlète");
      setIsInviting(false);
    }
  };

  const isLoading = addPlayer.isPending || isInviting || !!fisImportStatus;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ajouter un athlète
          </DialogTitle>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Athlète ajouté et invitation créée !
              </p>
              <p className="text-xs text-muted-foreground">
                Si l'email/SMS ne fonctionne pas, copiez et partagez ce lien manuellement :
              </p>
              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="text-xs" />
                <Button size="sm" variant="outline" onClick={() => copyLink(generatedLink)}>
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fermer</Button>
            </DialogFooter>
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {isAthletesFull && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Limite d'athlètes atteinte ({currentPlayerCount}/{maxAthletes}). Retirez un athlète existant avant d'en ajouter un nouveau.
                </AlertDescription>
              </Alert>
            )}

            {maxAthletes !== null && !isAthletesFull && (
              <p className="text-xs text-muted-foreground">
                Athlètes : {currentPlayerCount}/{maxAthletes} dans cette catégorie
              </p>
            )}
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setValidationError("");
                }}
                placeholder="Ex: Jean"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setValidationError("");
                }}
                placeholder="Ex: Dupont"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="playerEmail">Email {sendInvitation && "*"}</Label>
              <Input
                id="playerEmail"
                type="email"
                value={playerEmail}
                onChange={(e) => setPlayerEmail(e.target.value)}
                placeholder="athlete@email.com"
                required={sendInvitation}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="playerPhone">Téléphone</Label>
              <Input
                id="playerPhone"
                type="tel"
                value={playerPhone}
                onChange={(e) => setPlayerPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
              <p className="text-xs text-muted-foreground">
                Format international recommandé pour les SMS
              </p>
            </div>

            {/* Position selector for team sports */}
            {isTeamSport && positions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="position">Poste</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner un poste" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 max-h-[300px]">
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.name}>
                        {pos.id}. {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Disciplines for all sports */}
            {hasDisciplines && (
              <div className="space-y-2">
                <Label htmlFor="discipline">Discipline *</Label>
                <Select 
                  value={discipline} 
                  onValueChange={(val) => {
                    setDiscipline(val);
                    setSpecialty("");
                  }}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner une discipline" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 max-h-[300px]">
                    {disciplineOptions.map((disc) => (
                      <SelectItem key={disc.value} value={disc.value}>
                        {disc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasDisciplines && discipline && availableSpecialties.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="specialty">Spécialité *</Label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner une spécialité" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 max-h-[300px]">
                    {availableSpecialties.map((spec) => (
                      <SelectItem key={spec.value} value={spec.value}>
                        {spec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Judo weight categories */}
            {isJudo && (
              <div className="space-y-2">
                <Label htmlFor="weightCategory">Catégorie de poids *</Label>
                <Select value={discipline} onValueChange={setDiscipline}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {JUDO_WEIGHT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Aviron roles */}
            {isAviron && (
              <div className="space-y-2">
                <Label htmlFor="avironRole">Rôle *</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 max-h-[300px]">
                    {AVIRON_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Ski/Snow discipline selector (filtered by category) */}
            {showSkiDiscipline && (
              <div className="space-y-2">
                <Label htmlFor="skiDiscipline">Discipline *</Label>
                <Select value={discipline} onValueChange={setDiscipline}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner une discipline" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 max-h-[300px]">
                    {skiDisciplines.map((disc) => (
                      <SelectItem key={disc.value} value={disc.value}>
                        {disc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* FIS fields for ski/snow */}
            {isSki && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Code FIS</p>
                <div className="space-y-2">
                  <Label htmlFor="fisCode">Code FIS</Label>
                  <Input id="fisCode" placeholder="Ex: 9510001" value={fisCode} onChange={(e) => setFisCode(e.target.value)} />
                  <p className="text-xs text-muted-foreground">💡 Le classement et les points FIS seront importés automatiquement via le code FIS.</p>
                </div>
                {fisCode.trim() && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                    <Checkbox
                      id="importFisHistory"
                      checked={importFisHistory}
                      onCheckedChange={(checked) => setImportFisHistory(!!checked)}
                    />
                    <label htmlFor="importFisHistory" className="text-sm cursor-pointer flex items-center gap-2">
                      <Download className="h-4 w-4 text-primary" />
                      Importer automatiquement l'historique des compétitions FIS
                    </label>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="fisObjective">Objectif sportif</Label>
                    <Input id="fisObjective" placeholder="Ex: Qualification Championnats du Monde" value={fisObjective} onChange={(e) => setFisObjective(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fisObjectiveDate">Date objectif</Label>
                    <Input id="fisObjectiveDate" type="date" value={fisObjectiveDate} onChange={(e) => setFisObjectiveDate(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Yearly objectives for ski/snow */}
            {isSki && (
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Objectifs annuels</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setYearlyObjectives(prev => [...prev, { label: "", target: "" }])}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Ajouter
                  </Button>
                </div>
                {yearlyObjectives.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucun objectif défini. Ajoutez des objectifs de qualification (ex: JO, Mondiaux…)</p>
                )}
                {yearlyObjectives.map((obj, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_100px_32px] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Objectif</Label>
                      <Input
                        placeholder="Ex: Qualification JO 2026"
                        value={obj.label}
                        onChange={(e) => {
                          const updated = [...yearlyObjectives];
                          updated[idx].label = e.target.value;
                          setYearlyObjectives(updated);
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Points requis</Label>
                      <Input
                        type="number"
                        placeholder="2000"
                        value={obj.target}
                        onChange={(e) => {
                          const updated = [...yearlyObjectives];
                          updated[idx].target = e.target.value;
                          setYearlyObjectives(updated);
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setYearlyObjectives(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Birth Date */}
            <div className="space-y-2">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  if (e.target.value) {
                    setBirthYear(e.target.value.split('-')[0]);
                  }
                  setValidationError("");
                }}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            

            {/* Send Invitation Checkbox */}
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Checkbox
                id="sendInvitation"
                checked={sendInvitation}
                onCheckedChange={(checked) => setSendInvitation(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="sendInvitation"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <Send className="h-4 w-4 text-primary" />
                  Inviter l'athlète à créer son compte
                </label>
                <p className="text-xs text-muted-foreground">
                  Un email{playerPhone ? " et SMS" : ""} sera envoyé avec un lien d'inscription
                </p>
              </div>
            </div>
            
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!lastName.trim() || isLoading || isAthletesFull}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {fisImportStatus ? fisImportStatus : isInviting ? "Envoi de l'invitation..." : "Ajout..."}
                </>
              ) : sendInvitation ? (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Ajouter et inviter
                </>
              ) : (
                "Ajouter"
              )}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
