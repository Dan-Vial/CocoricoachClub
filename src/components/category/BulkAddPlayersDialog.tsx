import { useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Upload, FileSpreadsheet, Check, X, Users, Trash2, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ATHLETISME_DISCIPLINES,
  ATHLETISME_SPECIALTIES,
  JUDO_WEIGHT_CATEGORIES,
  NATATION_DISCIPLINES,
  NATATION_SPECIALTIES,
  SKI_DISCIPLINES,
  SURF_DISCIPLINES,
  TRIATHLON_DISCIPLINES,
  isAthletismeCategory,
  isJudoCategory,
  isNatationCategory,
  isSkiCategory,
  isSurfCategory,
  isTriathlonCategory,
  isPadelCategory,
  isIndividualSport,
} from "@/lib/constants/sportTypes";
import { getPositionsForSport } from "@/lib/constants/sportPositions";
import * as XLSX from "xlsx";

interface BulkAddPlayersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

interface ParsedAthlete {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  tel: string;
  dateNaissance: string;
  position: string;
  discipline: string;
  specialty: string;
  valid: boolean;
  error?: string;
}

export function BulkAddPlayersDialog({
  open,
  onOpenChange,
  categoryId,
}: BulkAddPlayersDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"upload" | "review" | "creating" | "done">("upload");
  const [athletes, setAthletes] = useState<ParsedAthlete[]>([]);
  const [results, setResults] = useState<{ success: number; failed: number; links: string[] }>({
    success: 0,
    failed: 0,
    links: [],
  });
  const [linksCopied, setLinksCopied] = useState(false);

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
    enabled: open,
  });

  const sportType = categoryData?.rugby_type || "XV";
  const isAthletics = isAthletismeCategory(sportType);
  const isJudo = isJudoCategory(sportType);
  const isNatation = isNatationCategory(sportType);
  const isSki = isSkiCategory(sportType);
  const isSurf = isSurfCategory(sportType);
  const isTriathlon = isTriathlonCategory(sportType);
  const isTeamSport = !isIndividualSport(sportType);
  const positions = getPositionsForSport(sportType);
  const hasDisciplines = isAthletics || isNatation || isSki || isSurf || isTriathlon;

  const getDisciplineOptions = () => {
    if (isAthletics) return ATHLETISME_DISCIPLINES;
    if (isNatation) return NATATION_DISCIPLINES;
    if (isSki) return SKI_DISCIPLINES;
    if (isSurf) return SURF_DISCIPLINES;
    if (isTriathlon) return TRIATHLON_DISCIPLINES;
    if (isJudo) return JUDO_WEIGHT_CATEGORIES.map(c => ({ value: c.value, label: c.label }));
    return [];
  };
  const disciplineOptions = getDisciplineOptions();

  const getSpecialtyOptions = (disc: string) => {
    if (!disc) return [];
    if (isAthletics) return ATHLETISME_SPECIALTIES[disc] || [];
    if (isNatation) return NATATION_SPECIALTIES[disc] || [];
    return [];
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", raw: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

        if (rows.length === 0) {
          toast.error("Le fichier est vide");
          return;
        }

        const parsed: ParsedAthlete[] = rows.map((row, idx) => {
          // Flexible column matching (case-insensitive, trimmed)
          const get = (keys: string[]) => {
            for (const key of keys) {
              const found = Object.keys(row).find(
                (k) => k.trim().toLowerCase() === key.toLowerCase()
              );
              if (found && row[found] !== "") return String(row[found]).trim();
            }
            return "";
          };

          const nom = get(["nom", "name", "last_name", "lastname"]);
          const prenom = get(["prenom", "prénom", "firstname", "first_name", "first name"]);
          const email = get(["mail", "email", "e-mail", "courriel"]);
          let tel = get(["tel", "telephone", "téléphone", "phone", "mobile"]);
          // Fix leading zero lost by Excel for French phone numbers
          if (tel && /^\d{9}$/.test(tel)) {
            tel = "0" + tel; // e.g. 612345678 -> 0612345678
          }
          const rawDate = get(["date de naissance", "date_naissance", "datenaissance", "birth_date", "birthdate", "dob", "naissance"]);

          // Parse date: try Excel serial number or string
          let dateNaissance = "";
          if (rawDate) {
            const num = Number(rawDate);
            if (!isNaN(num) && num > 10000) {
              // Excel serial date
              const d = XLSX.SSF.parse_date_code(num);
              if (d) dateNaissance = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
            } else {
              // Try parsing as date string
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                dateNaissance = d.toISOString().split("T")[0];
              } else {
                // Try DD/MM/YYYY format
                const parts = rawDate.split(/[\/\-\.]/);
                if (parts.length === 3) {
                  const [day, month, year] = parts;
                  if (Number(year) > 100) {
                    dateNaissance = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                  }
                }
              }
            }
          }

          const valid = nom.length > 0;
          const error = !valid ? "Nom manquant" : undefined;

          return {
            id: `athlete-${idx}-${Date.now()}`,
            nom,
            prenom,
            email,
            tel,
            dateNaissance,
            position: "",
            discipline: "",
            specialty: "",
            valid,
            error,
          };
        });

        setAthletes(parsed);
        setStep("review");
        toast.success(`${parsed.length} athlète(s) détecté(s) dans le fichier`);
      } catch (err) {
        console.error("Excel parse error:", err);
        toast.error("Erreur lors de la lecture du fichier Excel");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    e.target.value = "";
  }, []);

  const updateAthlete = (id: string, field: keyof ParsedAthlete, value: string) => {
    setAthletes((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const updated = { ...a, [field]: value };
        if (field === "discipline") updated.specialty = "";
        updated.valid = updated.nom.length > 0;
        updated.error = !updated.valid ? "Nom manquant" : undefined;
        return updated;
      })
    );
  };

  const removeAthlete = (id: string) => {
    setAthletes((prev) => prev.filter((a) => a.id !== id));
  };

  const applyPositionToAll = (value: string) => {
    setAthletes((prev) => prev.map((a) => ({ ...a, position: value })));
  };

  const applyDisciplineToAll = (value: string) => {
    setAthletes((prev) => prev.map((a) => ({ ...a, discipline: value, specialty: "" })));
  };

  const handleCreate = async () => {
    const validAthletes = athletes.filter((a) => a.valid);
    if (validAthletes.length === 0) {
      toast.error("Aucun athlète valide à créer");
      return;
    }

    setStep("creating");
    let success = 0;
    let failed = 0;
    const links: string[] = [];

    for (const athlete of validAthletes) {
      try {
        // Extract birth_year from date
        const birthYear = athlete.dateNaissance
          ? new Date(athlete.dateNaissance).getFullYear()
          : undefined;

        // 1. Create player
        const { data: player, error: playerError } = await supabase
          .from("players")
          .insert({
            name: athlete.nom,
            first_name: athlete.prenom || null,
            category_id: categoryId,
            email: athlete.email || null,
            phone: athlete.tel || null,
            birth_year: birthYear || null,
            birth_date: athlete.dateNaissance || null,
            position: athlete.position || null,
            discipline: athlete.discipline || null,
            specialty: athlete.specialty || null,
          })
          .select()
          .single();

        if (playerError) throw playerError;

        // 2. Create invitation if email is present
        if (athlete.email && categoryData) {
          const { data: invitation, error: invError } = await supabase
            .from("athlete_invitations")
            .insert({
              player_id: player.id,
              category_id: categoryId,
              club_id: categoryData.club_id,
              email: athlete.email,
              phone: athlete.tel || null,
              invited_by: user?.id,
            })
            .select()
            .single();

          if (!invError && invitation) {
            const invitationLink = `${window.location.origin}/accept-athlete-invitation?token=${invitation.token}`;
            links.push(invitationLink);

            // 3. Send notification via edge function
            const channels: ("email" | "sms")[] = ["email"];
            if (athlete.tel) channels.push("sms");

            try {
              await supabase.functions.invoke("send-athlete-invitation", {
                body: {
                  athleteName: athlete.nom,
                  athleteFirstName: athlete.prenom || undefined,
                  email: athlete.email,
                  phone: athlete.tel || undefined,
                  clubName: (categoryData.clubs as any)?.name || "Club",
                  categoryName: categoryData.name,
                  invitationLink,
                  channels,
                },
              });
            } catch (sendErr) {
              console.error("Error sending invitation for", athlete.email, sendErr);
              // Player created, invitation created — just notification failed
            }
          }
        }

        success++;
      } catch (err: any) {
        console.error("Error creating athlete:", athlete.nom, err);
        failed++;
      }
    }

    setResults({ success, failed, links });
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["players", categoryId] });
    queryClient.invalidateQueries({ queryKey: ["category-player-count", categoryId] });
    queryClient.invalidateQueries({ queryKey: ["athlete-invitations-list", categoryId] });
  };

  const handleClose = () => {
    setStep("upload");
    setAthletes([]);
    setResults({ success: 0, failed: 0, links: [] });
    setLinksCopied(false);
    onOpenChange(false);
  };

  const copyAllLinks = async () => {
    try {
      await navigator.clipboard.writeText(results.links.join("\n"));
      setLinksCopied(true);
      toast.success("Tous les liens copiés !");
      setTimeout(() => setLinksCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const validCount = athletes.filter((a) => a.valid).length;
  const withEmailCount = athletes.filter((a) => a.valid && a.email).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Excel — Création en masse
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-6 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <p className="font-medium">Importer un fichier Excel (.xlsx, .xls, .csv)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Colonnes attendues : <strong>NOM</strong>, <strong>Prénom</strong>, <strong>Mail</strong>, <strong>Tel</strong>, <strong>Date de naissance</strong>
                </p>
              </div>
              <div>
                <Label htmlFor="excel-upload" className="cursor-pointer">
                  <Button asChild variant="outline" className="gap-2">
                    <span>
                      <Upload className="h-4 w-4" />
                      Choisir un fichier
                    </span>
                  </Button>
                </Label>
                <Input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">📋 Format attendu :</p>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">NOM</th>
                      <th className="text-left p-2 font-medium">Prénom</th>
                      <th className="text-left p-2 font-medium">Mail</th>
                      <th className="text-left p-2 font-medium">Tel</th>
                      <th className="text-left p-2 font-medium">Date de naissance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-muted-foreground">
                      <td className="p-2">DUPONT</td>
                      <td className="p-2">Jean</td>
                      <td className="p-2">jean@email.com</td>
                      <td className="p-2">+33612345678</td>
                      <td className="p-2">15/03/2000</td>
                    </tr>
                    <tr className="text-muted-foreground">
                      <td className="p-2">MARTIN</td>
                      <td className="p-2">Lucas</td>
                      <td className="p-2">lucas@email.com</td>
                      <td className="p-2">+33698765432</td>
                      <td className="p-2">22/07/2001</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review & assign positions */}
        {step === "review" && (
          <div className="flex-1 min-h-0 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm">
                <Badge variant="secondary">{validCount}</Badge> athlète(s) valide(s) —{" "}
                <Badge variant="outline">{withEmailCount}</Badge> avec email (invitation auto)
              </p>

              {/* Bulk assign */}
              {isTeamSport && positions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Appliquer à tous :</span>
                  <Select onValueChange={applyPositionToAll}>
                    <SelectTrigger className="w-[150px] h-8 text-xs">
                      <SelectValue placeholder="Poste global" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.name}>
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {hasDisciplines && disciplineOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Appliquer à tous :</span>
                  <Select onValueChange={applyDisciplineToAll}>
                    <SelectTrigger className="w-[150px] h-8 text-xs">
                      <SelectValue placeholder="Discipline globale" />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplineOptions.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isJudo && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Appliquer à tous :</span>
                  <Select onValueChange={applyDisciplineToAll}>
                    <SelectTrigger className="w-[150px] h-8 text-xs">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {JUDO_WEIGHT_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[50vh] border rounded-lg">
              <div className="space-y-1 p-2">
                {athletes.map((athlete, idx) => (
                  <div
                    key={athlete.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                      athlete.valid
                        ? "bg-card hover:bg-muted/50"
                        : "bg-destructive/5 border border-destructive/20"
                    }`}
                  >
                    <span className="text-xs text-muted-foreground w-6 text-right shrink-0">
                      {idx + 1}
                    </span>

                    {/* Name */}
                    <div className="min-w-[120px] shrink-0">
                      <p className="font-medium truncate">
                        {athlete.prenom} {athlete.nom}
                      </p>
                      {athlete.error && (
                        <p className="text-xs text-destructive">{athlete.error}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="min-w-[140px] shrink-0">
                      {athlete.email ? (
                        <Badge variant="outline" className="text-xs font-normal truncate max-w-[140px]">
                          {athlete.email}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pas d'email</span>
                      )}
                    </div>

                    {/* Birth date */}
                    {athlete.dateNaissance && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(athlete.dateNaissance).toLocaleDateString("fr-FR")}
                      </span>
                    )}

                    {/* Position/Discipline selector */}
                    <div className="flex-1 flex items-center gap-1 justify-end">
                      {isTeamSport && positions.length > 0 && (
                        <Select
                          value={athlete.position}
                          onValueChange={(v) => updateAthlete(athlete.id, "position", v)}
                        >
                          <SelectTrigger className="w-[120px] h-7 text-xs">
                            <SelectValue placeholder="Poste" />
                          </SelectTrigger>
                          <SelectContent>
                            {positions.map((pos) => (
                              <SelectItem key={pos.id} value={pos.name}>
                                {pos.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {hasDisciplines && (
                        <Select
                          value={athlete.discipline}
                          onValueChange={(v) => updateAthlete(athlete.id, "discipline", v)}
                        >
                          <SelectTrigger className="w-[120px] h-7 text-xs">
                            <SelectValue placeholder="Discipline" />
                          </SelectTrigger>
                          <SelectContent>
                            {disciplineOptions.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {hasDisciplines &&
                        athlete.discipline &&
                        getSpecialtyOptions(athlete.discipline).length > 0 && (
                          <Select
                            value={athlete.specialty}
                            onValueChange={(v) => updateAthlete(athlete.id, "specialty", v)}
                          >
                            <SelectTrigger className="w-[110px] h-7 text-xs">
                              <SelectValue placeholder="Spécialité" />
                            </SelectTrigger>
                            <SelectContent>
                              {getSpecialtyOptions(athlete.discipline).map((s: any) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                      {isJudo && !hasDisciplines && (
                        <Select
                          value={athlete.discipline}
                          onValueChange={(v) => updateAthlete(athlete.id, "discipline", v)}
                        >
                          <SelectTrigger className="w-[120px] h-7 text-xs">
                            <SelectValue placeholder="Catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {JUDO_WEIGHT_CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeAthlete(athlete.id)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="flex-row gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Retour
              </Button>
              <Button onClick={handleCreate} disabled={validCount === 0} className="gap-2">
                <Users className="h-4 w-4" />
                Créer {validCount} athlète(s) et envoyer les invitations
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Creating */}
        {step === "creating" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="font-medium">Création des athlètes en cours...</p>
            <p className="text-sm text-muted-foreground">
              Envoi des invitations personnalisées à chaque athlète
            </p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-semibold text-lg">Import terminé !</p>
              <div className="flex items-center justify-center gap-4">
                <Badge variant="default" className="text-sm">
                  ✅ {results.success} créé(s)
                </Badge>
                {results.failed > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    ❌ {results.failed} en erreur
                  </Badge>
                )}
              </div>
              {results.links.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  📧 {results.links.length} invitation(s) envoyée(s) par email/SMS
                </p>
              )}
            </div>

            {results.links.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Liens de secours (si email non reçu) :</p>
                  <Button variant="outline" size="sm" onClick={copyAllLinks} className="gap-1">
                    {linksCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copier tout
                  </Button>
                </div>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-1">
                    {results.links.map((link, i) => (
                      <p key={i} className="text-xs text-muted-foreground truncate font-mono">
                        {link}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Fermer</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
