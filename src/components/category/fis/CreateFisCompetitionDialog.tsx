import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { calculateRacePenalty, DISCIPLINE_F_VALUES } from "@/lib/fis/fisPointsEngine";
import { WSPL_EVENT_CATEGORIES } from "@/lib/fis/wsplPointsEngine";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Mountain, Users, Trophy, TrendingDown } from "lucide-react";
import { getDisciplinesForClubSport } from "@/lib/constants/skiDisciplines";

interface CreateFisCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  clubSport?: string;
}

const LEVELS = [
  { value: "world_cup", label: "Coupe du Monde" },
  { value: "continental_cup", label: "Coupe d'Europe / Continentale" },
  { value: "fis", label: "FIS Race" },
  { value: "national", label: "Compétition Nationale" },
];

export function CreateFisCompetitionDialog({ open, onOpenChange, categoryId, clubSport }: CreateFisCompetitionDialogProps) {
  const disciplines = useMemo(() => getDisciplinesForClubSport(clubSport), [clubSport]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [discipline, setDiscipline] = useState(disciplines[0]?.value || "slopestyle");
  const [level, setLevel] = useState("fis");
  const [location, setLocation] = useState("");
  const [totalParticipants, setTotalParticipants] = useState("");
  const [notes, setNotes] = useState("");
  const [topRiders, setTopRiders] = useState(["", "", "", "", ""]);
  const [topClassified, setTopClassified] = useState(["", "", "", "", ""]);
  const [customFValue, setCustomFValue] = useState("");
  const [wsplStars, setWsplStars] = useState("3");
  const [wsplPL, setWsplPL] = useState("600");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const fValue = customFValue !== "" ? Number(customFValue) : (DISCIPLINE_F_VALUES[discipline] ?? 0);

  const computedPenalty = (() => {
    const aPoints = topRiders.map(Number).filter((n) => !isNaN(n) && n > 0);
    const bPoints = topClassified.map(Number).filter((n) => !isNaN(n) && n > 0);
    if (aPoints.length === 0 && bPoints.length === 0) return null;
    return calculateRacePenalty({
      topRiderPoints: aPoints,
      topClassifiedPoints: bPoints,
      fValue,
    });
  })();

  // Show A, B, C breakdown
  const breakdown = (() => {
    const aPoints = topRiders.map(Number).filter((n) => !isNaN(n) && n > 0);
    const bPoints = topClassified.map(Number).filter((n) => !isNaN(n) && n > 0);
    const A = aPoints.reduce((s, v) => s + v, 0);
    const B = bPoints.reduce((s, v) => s + v, 0);
    return { A, B, F: fValue };
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
    const classifiedPts = topClassified.map((v) => {
      const n = Number(v);
      return isNaN(n) || n <= 0 ? null : n;
    });

    const insertData = {
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
      top_classified_1_pts: classifiedPts[0],
      top_classified_2_pts: classifiedPts[1],
      top_classified_3_pts: classifiedPts[2],
      top_classified_4_pts: classifiedPts[3],
      top_classified_5_pts: classifiedPts[4],
      f_value: fValue,
      race_penalty: computedPenalty,
      wspl_pl: Number(wsplPL) || null,
      wspl_stars: Number(wsplStars) || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("fis_competitions") as any).insert(insertData);

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
    setName(""); setDate(""); setDiscipline(disciplines[0]?.value || "slopestyle"); setLevel("fis");
    setLocation(""); setTotalParticipants(""); setNotes("");
    setTopRiders(["", "", "", "", ""]);
    setTopClassified(["", "", "", "", ""]);
    setCustomFValue("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-primary" />
            Nouvelle compétition FIS + WSPL
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
                    {disciplines.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
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

          {/* Top riders present (A) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">A — Top 5 riders présents (pts FIS avant course)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Points FIS des 5 meilleurs riders inscrits, AVANT la course
            </p>
            <div className="grid grid-cols-5 gap-2">
              {topRiders.map((val, i) => (
                <div key={i}>
                  <Label className="text-xs text-muted-foreground">#{i + 1}</Label>
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
            {breakdown.A > 0 && (
              <p className="text-xs text-muted-foreground">A = {breakdown.A}</p>
            )}
          </div>

          <Separator />

          {/* Top 5 classified (B) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">B — Top 5 classés (pts FIS des 5 premiers)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Points FIS (avant course) des 5 premiers au classement final
            </p>
            <div className="grid grid-cols-5 gap-2">
              {topClassified.map((val, i) => (
                <div key={i}>
                  <Label className="text-xs text-muted-foreground">#{i + 1}</Label>
                  <Input
                    type="number"
                    value={val}
                    onChange={(e) => {
                      const next = [...topClassified];
                      next[i] = e.target.value;
                      setTopClassified(next);
                    }}
                    placeholder="Pts"
                    className="text-center"
                  />
                </div>
              ))}
            </div>
            {breakdown.B > 0 && (
              <p className="text-xs text-muted-foreground">B = {breakdown.B}</p>
            )}
          </div>

          <Separator />

          {/* F-value & penalty result */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">F-value & Race Penalty</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">F-value (coefficient discipline)</Label>
                <Input
                  type="number"
                  value={customFValue}
                  onChange={(e) => setCustomFValue(e.target.value)}
                  placeholder={String(DISCIPLINE_F_VALUES[discipline] ?? 0)}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Par défaut : {DISCIPLINE_F_VALUES[discipline] ?? 0} ({discipline})
                </p>
              </div>
              <div className="flex flex-col justify-center">
                {computedPenalty !== null && (
                  <div className="p-3 rounded-lg bg-muted/50 text-center space-y-1">
                    <p className="text-xs text-muted-foreground">Race Penalty (P)</p>
                    <Badge variant="secondary" className="font-mono text-lg">{computedPenalty}</Badge>
                    <p className="text-xs text-muted-foreground">
                      P = (A + B - C) / 10 + F
                    </p>
                  </div>
                )}
              </div>
            </div>
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
