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
import { WSPL_EVENT_CATEGORIES, calculateWsplPoints, calculateRValue, calculatePValue, shouldUseRValue, determinePL } from "@/lib/fis/wsplPointsEngine";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Mountain, Users, Trophy, TrendingDown, Star, Calculator } from "lucide-react";
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
  const [wsplTopAthletes, setWsplTopAthletes] = useState(["", "", "", "", "", "", "", ""]);
  const [wsplInputMode, setWsplInputMode] = useState<"ranking" | "points">("points");
  const [wsplGender, setWsplGender] = useState<"men" | "women">("men");
  const [simRank, setSimRank] = useState("");
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

  const breakdown = (() => {
    const aPoints = topRiders.map(Number).filter((n) => !isNaN(n) && n > 0);
    const bPoints = topClassified.map(Number).filter((n) => !isNaN(n) && n > 0);
    const A = aPoints.reduce((s, v) => s + v, 0);
    const B = bPoints.reduce((s, v) => s + v, 0);
    return { A, B, F: fValue };
  })();

  // WSPL R-Value/P-Value calculation
  const wsplAthleteValues = wsplTopAthletes.map(Number).filter((n) => !isNaN(n) && n > 0);
  const computedRValue = wsplInputMode === "ranking" ? calculateRValue(wsplAthleteValues, wsplGender) : null;
  const computedPValue = wsplInputMode === "points" ? calculatePValue(wsplAthleteValues, wsplGender) : null;

  // Auto-compute PL from R-Value or P-Value
  const autoComputedPL = useMemo(() => {
    const stars = Number(wsplStars);
    if (computedRValue != null && wsplInputMode === "ranking") {
      const useR = shouldUseRValue(computedRValue, wsplGender);
      if (useR) return determinePL(stars, computedRValue);
    }
    if (computedPValue != null && wsplInputMode === "points") {
      return determinePL(stars, computedPValue);
    }
    return null;
  }, [computedRValue, computedPValue, wsplStars, wsplInputMode, wsplGender]);

  const effectivePL = Number(wsplPL) || 0;
  const totalRidersNum = Number(totalParticipants) || 0;

  // Simulator: calculate WSPL points for a given rank
  const simWsplPoints = simRank && totalRidersNum > 0 && effectivePL > 0
    ? calculateWsplPoints({ rank: Number(simRank), totalRiders: totalRidersNum, pointLevel: effectivePL })
    : null;

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
      wspl_pl: effectivePL || null,
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
    setCustomFValue(""); setWsplStars("3"); setWsplPL("600");
    setWsplTopAthletes(["", "", "", "", "", "", "", ""]);
    setSimRank("");
  };

  const requiredAthleteCount = wsplGender === "women" ? 5 : 8;

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
              <Label htmlFor="comp-participants">Nombre total de riders classés (F)</Label>
              <Input id="comp-participants" type="number" value={totalParticipants} onChange={(e) => setTotalParticipants(e.target.value)} placeholder="Ex: 59" />
              <p className="text-xs text-muted-foreground mt-1">Utilisé pour FIS et WSPL</p>
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

          {/* WSPL Section - R-Value / P-Value */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">WSPL — Qualité du plateau</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Genre</Label>
                <Select value={wsplGender} onValueChange={(v) => setWsplGender(v as "men" | "women")}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="men">Hommes (top 8)</SelectItem>
                    <SelectItem value="women">Femmes (top 5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Type de valeur</Label>
                <Select value={wsplInputMode} onValueChange={(v) => setWsplInputMode(v as "ranking" | "points")}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">P-Value (pts WSPL)</SelectItem>
                    <SelectItem value="ranking">R-Value (rangs WSPL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {wsplInputMode === "points"
                ? `Points WSPL des ${requiredAthleteCount} meilleurs athlètes présents`
                : `Rangs WSPL des ${requiredAthleteCount} meilleurs athlètes présents`}
            </p>

            <div className="grid grid-cols-4 gap-2">
              {wsplTopAthletes.slice(0, requiredAthleteCount).map((val, i) => (
                <div key={i}>
                  <Label className="text-xs text-muted-foreground">#{i + 1}</Label>
                  <Input
                    type="number"
                    value={val}
                    onChange={(e) => {
                      const next = [...wsplTopAthletes];
                      next[i] = e.target.value;
                      setWsplTopAthletes(next);
                    }}
                    placeholder={wsplInputMode === "points" ? "Pts" : "Rang"}
                    className="text-center text-xs"
                  />
                </div>
              ))}
            </div>

            {/* Computed R-Value / P-Value */}
            {(computedRValue != null || computedPValue != null) && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                {computedRValue != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">R-Value</span>
                    <Badge variant="outline" className="font-mono">{computedRValue}</Badge>
                  </div>
                )}
                {computedPValue != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">P-Value</span>
                    <Badge variant="outline" className="font-mono">{computedPValue}</Badge>
                  </div>
                )}
                {autoComputedPL != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">PL auto-calculé</span>
                    <Badge className="font-mono">{autoComputedPL}</Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* WSPL Event category & PL */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Paramètres WSPL — Niveau de points</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Catégorie événement</Label>
                <Select value={wsplStars} onValueChange={(val) => {
                  setWsplStars(val);
                  const cat = WSPL_EVENT_CATEGORIES.find(c => c.stars === Number(val));
                  if (cat) setWsplPL(String(cat.maxPL));
                }}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WSPL_EVENT_CATEGORIES.map((c) => (
                      <SelectItem key={c.stars} value={String(c.stars)}>
                        {c.label} ({c.minPL}-{c.maxPL})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">PL (niveau de points)</Label>
                <Input type="number" min="50" max="1000" value={wsplPL} onChange={(e) => setWsplPL(e.target.value)} className="text-xs" />
                {autoComputedPL != null && (
                  <button
                    type="button"
                    className="text-xs text-primary underline mt-1"
                    onClick={() => setWsplPL(String(autoComputedPL))}
                  >
                    Appliquer PL auto: {autoComputedPL}
                  </button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* WSPL Simulator */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Simulateur WSPL</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Entrez un classement pour calculer les points WSPL (PL={effectivePL}, F={totalRidersNum || "?"})
            </p>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label className="text-xs">Classement</Label>
                <Input
                  type="number"
                  min="1"
                  value={simRank}
                  onChange={(e) => setSimRank(e.target.value)}
                  placeholder="Ex: 5"
                  className="text-center"
                />
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                {simWsplPoints != null && simWsplPoints > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">Points WSPL</p>
                    <Badge className="font-mono text-lg">{simWsplPoints.toFixed(2)}</Badge>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Entrez un rang</p>
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
