import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Syringe, FileText, AlertTriangle, Calendar, Clock } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface MedicalRecordsTabProps {
  categoryId: string;
}

const RECORD_TYPES = [
  { value: "vaccination", label: "Vaccination", icon: Syringe },
  { value: "medical_exam", label: "Examen médical", icon: FileText },
  { value: "certificate", label: "Certificat", icon: FileText },
  { value: "blood_test", label: "Analyse sanguine", icon: FileText },
  { value: "imaging", label: "Imagerie", icon: FileText },
  { value: "other", label: "Autre", icon: FileText },
];

const COMMON_VACCINATIONS = [
  "Tétanos",
  "Diphtérie",
  "Poliomyélite",
  "Coqueluche",
  "Hépatite B",
  "Grippe",
  "COVID-19",
];

const COMMON_EXAMS = [
  "Visite médicale d'aptitude",
  "Certificat médical de non contre-indication",
  "ECG",
  "Épreuve d'effort",
  "Bilan sanguin annuel",
  "Examen dentaire",
  "Examen ophtalmologique",
];

export function MedicalRecordsTab({ categoryId }: MedicalRecordsTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPlayer, setFilterPlayer] = useState<string>("all");
  const queryClient = useQueryClient();

  // Form state
  const [playerId, setPlayerId] = useState("");
  const [recordType, setRecordType] = useState<string>("vaccination");
  const [name, setName] = useState("");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [provider, setProvider] = useState("");
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(30);

  // Fetch players
  const { data: players } = useQuery({
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

  // Fetch records
  const { data: records, isLoading } = useQuery({
    queryKey: ["medical_records", categoryId, filterType, filterPlayer],
    queryFn: async () => {
      let query = supabase
        .from("medical_records")
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("next_due_date", { ascending: true, nullsFirst: false });

      if (filterType !== "all") {
        query = query.eq("record_type", filterType);
      }
      if (filterPlayer !== "all") {
        query = query.eq("player_id", filterPlayer);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setPlayerId("");
    setRecordType("vaccination");
    setName("");
    setRecordDate(new Date().toISOString().split("T")[0]);
    setExpiryDate("");
    setNextDueDate("");
    setProvider("");
    setResult("");
    setNotes("");
    setReminderEnabled(true);
    setReminderDays(30);
  };

  const addRecord = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("medical_records").insert({
        category_id: categoryId,
        player_id: playerId,
        record_type: recordType,
        name,
        record_date: recordDate,
        expiry_date: expiryDate || null,
        next_due_date: nextDueDate || null,
        provider: provider || null,
        result: result || null,
        notes: notes || null,
        reminder_enabled: reminderEnabled,
        reminder_days_before: reminderDays,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical_records"] });
      toast.success("Document médical ajouté");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout");
    },
  });

  const getTypeLabel = (type: string) => {
    return RECORD_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    return differenceInDays(new Date(dueDate), new Date());
  };

  const getDueBadge = (dueDate: string | null) => {
    const days = getDaysUntilDue(dueDate);
    if (days === null) return null;
    
    if (days < 0) {
      return <Badge variant="destructive">Expiré depuis {Math.abs(days)}j</Badge>;
    }
    if (days <= 7) {
      return <Badge variant="destructive">Dans {days}j</Badge>;
    }
    if (days <= 30) {
      return <Badge className="bg-orange-500">Dans {days}j</Badge>;
    }
    if (days <= 90) {
      return <Badge className="bg-yellow-500 text-black">Dans {days}j</Badge>;
    }
    return <Badge variant="outline">{days}j</Badge>;
  };

  // Stats
  const expiredCount = records?.filter((r) => {
    const days = getDaysUntilDue(r.next_due_date);
    return days !== null && days < 0;
  }).length || 0;

  const dueSoonCount = records?.filter((r) => {
    const days = getDaysUntilDue(r.next_due_date);
    return days !== null && days >= 0 && days <= 30;
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Alert for expired/due soon */}
      {(expiredCount > 0 || dueSoonCount > 0) && (
        <Card className="border-orange-500 bg-orange-500/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                {expiredCount > 0 && (
                  <span className="text-destructive font-medium">
                    {expiredCount} document(s) expiré(s)
                  </span>
                )}
                {expiredCount > 0 && dueSoonCount > 0 && " • "}
                {dueSoonCount > 0 && (
                  <span className="text-orange-600 font-medium">
                    {dueSoonCount} à renouveler dans les 30 jours
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Syringe className="h-4 w-4" />
              Vaccinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records?.filter((r) => r.record_type === "vaccination").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Examens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records?.filter((r) => r.record_type === "medical_exam").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              À renouveler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{dueSoonCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Expirés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expiredCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and actions */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Type de document" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {RECORD_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPlayer} onValueChange={setFilterPlayer}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Joueur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les joueurs</SelectItem>
            {players?.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                {player.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un document
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : records && records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Prochaine échéance</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.players?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(record.record_type)}</Badge>
                    </TableCell>
                    <TableCell>{record.name}</TableCell>
                    <TableCell>
                      {format(new Date(record.record_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {record.next_due_date
                        ? format(new Date(record.next_due_date), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>{getDueBadge(record.next_due_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucun document médical enregistré
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un document médical</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Joueur *</Label>
                <Select value={playerId} onValueChange={setPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {players?.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={recordType} onValueChange={setRecordType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nom du document *</Label>
              <Select value={name} onValueChange={setName}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner ou saisir" />
                </SelectTrigger>
                <SelectContent>
                  {(recordType === "vaccination" ? COMMON_VACCINATIONS : COMMON_EXAMS).map(
                    (item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ou saisir manuellement"
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date du document</Label>
                <Input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Prochaine échéance</Label>
                <Input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Établissement/Médecin</Label>
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Nom du médecin ou établissement"
              />
            </div>

            <div className="space-y-2">
              <Label>Résultat/Conclusion</Label>
              <Input
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="Ex: Apte, RAS, ..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes complémentaires..."
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium">Rappel automatique</p>
                <p className="text-sm text-muted-foreground">
                  Notification {reminderDays} jours avant l'échéance
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                  className="w-20"
                  disabled={!reminderEnabled}
                />
                <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => addRecord.mutate()}
              disabled={!playerId || !name || addRecord.isPending}
            >
              {addRecord.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
