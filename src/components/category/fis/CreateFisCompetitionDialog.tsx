import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { calculateRacePenalty } from "@/lib/fis/fisPointsEngine";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Mountain, Users, Trophy } from "lucide-react";

interface CreateFisCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

const DISCIPLINES = [
  { value: "slopestyle", label: "Slopestyle" },
  { value: "big_air", label: "Big Air" },
  { value: "halfpipe", label: "Halfpipe" },
  { value: "snowboardcross", label: "Snowboardcross" },
  { value: "parallel_gs", label: "Slalom Géant Parallèle" },
  { value: "parallel_slalom", label: "Slalom Parallèle" },
  { value: "other", label: "Autre" },
];

const LEVELS = [
  { value: "world_cup", label: "Coupe du Monde" },
  { value: "continental_cup", label: "Coupe d'Europe / Continentale" },
  { value: "fis", label: "FIS Race" },
  { value: "national", label: "Compétition Nationale" },
];

export function CreateFisCompetitionDialog({ open, onOpenChange, categoryId }: CreateFisCompetitionDialogProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [discipline, setDiscipline] = useState("slopestyle");
  const [level, setLevel] = useState("fis");
  const [location, setLocation] = useState("");
  const [totalParticipants, setTotalParticipants] = useState("");
  const [notes, setNotes] = useState("");
  const [topRiders, setTopRiders] = useState(["", "", "", "", ""]);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const computedPenalty = (() => {
    const pts = topRiders.map(Number).filter((n) => !isNaN(n) && n > 0);
    if (pts.length === 0 || !totalParticipants) return null;
    return calculateRacePenalty({
      topRiderPoints: pts,
      totalParticipants: Number(totalParticipants) || 0,
      level,
    });
  })();

  const handleSave = async () => {
    if (!name || !date) {
      toast.error("Nom et date requis");
      return;
    }
    setSaving(true);

    const topPts = topRiders.map((v) => {
      const n = Number(v);
      return isNaN(n) || n <= 0 ? null : n;
    });

    const { error } = await supabase.from("fis_competitions").insert({
      category_id: categoryId,
      name,
      competition_date: date,
      discipline,
      level,
      location: location || null,
      total_participants: totalParticipants ? Number(totalParticipants) : null,
      notes: notes || null,
      top_rider_1_pts: topPts[0],
      top_rider_2_pts: topPts[1],
      top_rider_3_pts: topPts[2],
      top_rider_4_pts: topPts[3],
      top_rider_5_pts: topPts[4],
      race_penalty: computedPenalty,
    } as Record<string, unknown>);

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la création");
      return;
    }

    toast.success("Compétition FIS créée");
    queryClient.invalidateQueries({ queryKey: ["fis-competitions"] });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName(""); setDate(""); setDiscipline("slopestyle"); setLevel("fis");
    setLocation(""); setTotalParticipants(""); setNotes("");
    setTopRiders(["", "", "", "", ""]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-primary" />
            Nouvelle compétition FIS
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* General info */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="comp-name">Nom de la compétition *</Label>
              <Input id="comp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: FIS Snowboard World Cup Laax" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="comp-date">Date *</Label>
                <Input id="comp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Discipline</Label>
                <Select value={discipline} onValueChange={setDiscipline}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISCIPLINES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Niveau</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="comp-location">Lieu</Label>
                <Input id="comp-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Laax, Suisse" />
              </div>
            </div>
            <div>
              <Label htmlFor="comp-participants">Nombre total de participants</Label>
              <Input id="comp-participants" type="number" value={totalParticipants} onChange={(e) => setTotalParticipants(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Top riders */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Top riders présents (pour calcul FIS)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Saisissez les points FIS des 5 meilleurs riders présents pour calculer la "Race Penalty"
            </p>
            <div className="grid grid-cols-5 gap-2">
              {topRiders.map((val, i) => (
                <div key={i}>
                  <Label className="text-xs text-muted-foreground">Rider {i + 1}</Label>
                  <Input
                    type="number"
                    value={val}
                    onChange={(e) => {
                      const next = [...topRiders];
                      next[i] = e.target.value;
                      setTopRiders(next);
                    }}
                    placeholder="Pts"
                    className="text-center"
                  />
                </div>
              ))}
            </div>
            {computedPenalty !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-primary" />
                <span>Race Penalty calculée :</span>
                <Badge variant="secondary" className="font-mono">{computedPenalty}</Badge>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <Label htmlFor="comp-notes">Notes</Label>
            <Textarea id="comp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !name || !date}>
              {saving ? "Création..." : "Créer la compétition"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
