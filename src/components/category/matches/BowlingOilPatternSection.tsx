import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Droplet, Save, Plus, Trash2, Info, X, Image as ImageIcon, ChevronDown, Users } from "lucide-react";
import {
  ALL_PATTERN_NAMES,
  getPatternPreset,
  PROFILE_TYPES,
  FRICTION_LEVELS,
} from "@/lib/constants/bowlingOilPatterns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BowlingOilPatternSectionProps {
  matchId: string;
  categoryId: string;
  readOnly?: boolean;
}

interface OilPatternData {
  id?: string;
  name: string;
  gender: string;
  length_feet: number | null;
  buff_distance_feet: number | null;
  width_boards: number | null;
  total_volume_ml: number | null;
  oil_ratio: string | null;
  profile_type: "flat" | "crown" | "reverse_block" | null;
  forward_oil: boolean;
  reverse_oil: boolean;
  outside_friction: "low" | "medium" | "high" | null;
  notes: string | null;
  image_url: string | null;
  isCollapsed: boolean;
  hasChanges: boolean;
}

const createEmptyPattern = (): OilPatternData => ({
  name: "",
  gender: "",
  length_feet: null,
  buff_distance_feet: null,
  width_boards: null,
  total_volume_ml: null,
  oil_ratio: null,
  profile_type: null,
  forward_oil: true,
  reverse_oil: true,
  outside_friction: null,
  notes: null,
  image_url: null,
  isCollapsed: false,
  hasChanges: true,
});

export function BowlingOilPatternSection({
  matchId,
  categoryId,
  readOnly = false,
}: BowlingOilPatternSectionProps) {
  const [patterns, setPatterns] = useState<OilPatternData[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [assignPatternId, setAssignPatternId] = useState<string | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const queryClient = useQueryClient();

  // Load players for this category
  const { data: categoryPlayers } = useQuery({
    queryKey: ["players_for_oil", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Load existing assignments for all patterns in this match
  const { data: patternAssignments } = useQuery({
    queryKey: ["oil_pattern_players", matchId],
    queryFn: async () => {
      const patternIds = patterns.filter(p => p.id).map(p => p.id!);
      if (patternIds.length === 0) return [];
      const { data, error } = await supabase
        .from("bowling_oil_pattern_players" as any)
        .select("*")
        .in("oil_pattern_id", patternIds);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: patterns.some(p => !!p.id),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ patternId, playerIds }: { patternId: string; playerIds: string[] }) => {
      // Delete existing assignments for this pattern
      await supabase.from("bowling_oil_pattern_players" as any).delete().eq("oil_pattern_id", patternId);
      // Insert new ones
      if (playerIds.length > 0) {
        const rows = playerIds.map(pid => ({ oil_pattern_id: patternId, player_id: pid }));
        const { error } = await supabase.from("bowling_oil_pattern_players" as any).insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oil_pattern_players", matchId] });
      toast.success("Attribution enregistrée");
      setAssignPatternId(null);
    },
    onError: () => toast.error("Erreur lors de l'attribution"),
  });

  const openAssignDialog = (patternId: string) => {
    const existing = (patternAssignments || []).filter((a: any) => a.oil_pattern_id === patternId).map((a: any) => a.player_id);
    setSelectedPlayerIds(existing);
    setAssignPatternId(patternId);
  };

  const getAssignedPlayerNames = (patternId: string) => {
    const assigned = (patternAssignments || []).filter((a: any) => a.oil_pattern_id === patternId);
    return assigned.map((a: any) => {
      const p = categoryPlayers?.find(pl => pl.id === a.player_id);
      return p ? [p.first_name, p.name].filter(Boolean).join(" ") : "";
    }).filter(Boolean);
  };

  const { data: existingPatterns, isLoading } = useQuery({
    queryKey: ["bowling_oil_patterns", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bowling_oil_patterns")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!matchId,
  });

  // Initialize patterns from DB data
  if (existingPatterns && !initialized) {
    if (existingPatterns.length > 0) {
      setPatterns(existingPatterns.map(ep => ({
        id: ep.id,
        name: ep.name || "",
        gender: ep.gender || "",
        length_feet: ep.length_feet,
        buff_distance_feet: ep.buff_distance_feet,
        width_boards: ep.width_boards,
        total_volume_ml: ep.total_volume_ml,
        oil_ratio: ep.oil_ratio,
        profile_type: ep.profile_type as OilPatternData["profile_type"],
        forward_oil: ep.forward_oil ?? true,
        reverse_oil: ep.reverse_oil ?? true,
        outside_friction: ep.outside_friction as OilPatternData["outside_friction"],
        notes: ep.notes,
        image_url: ep.image_url_male || ep.image_url_female || null,
        isCollapsed: true,
        hasChanges: false,
      })));
    }
    setInitialized(true);
  }

  const addPattern = () => {
    setPatterns(prev => [...prev, createEmptyPattern()]);
  };

  const updatePattern = (index: number, updates: Partial<OilPatternData>) => {
    setPatterns(prev => prev.map((p, i) => i === index ? { ...p, ...updates, hasChanges: true } : p));
  };

  const removePattern = async (index: number) => {
    const pattern = patterns[index];
    if (pattern.id) {
      const { error } = await supabase
        .from("bowling_oil_patterns")
        .delete()
        .eq("id", pattern.id);
      if (error) {
        toast.error("Erreur lors de la suppression");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["bowling_oil_patterns", matchId] });
    }
    setPatterns(prev => prev.filter((_, i) => i !== index));
    toast.success("Huilage supprimé");
  };

  const handlePatternSelect = (index: number, name: string) => {
    const preset = getPatternPreset(name);
    if (preset) {
      updatePattern(index, {
        name,
        length_feet: preset.length_feet ?? patterns[index].length_feet,
        buff_distance_feet: preset.buff_distance_feet ?? patterns[index].buff_distance_feet,
        width_boards: preset.width_boards ?? patterns[index].width_boards,
        total_volume_ml: preset.total_volume_ml ?? patterns[index].total_volume_ml,
        oil_ratio: preset.oil_ratio ?? patterns[index].oil_ratio,
        profile_type: preset.profile_type ?? patterns[index].profile_type,
        forward_oil: preset.forward_oil ?? patterns[index].forward_oil,
        reverse_oil: preset.reverse_oil ?? patterns[index].reverse_oil,
        outside_friction: preset.outside_friction ?? patterns[index].outside_friction,
      });
      toast.info(`Données officielles chargées pour ${name}`);
    } else {
      updatePattern(index, { name });
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `oil-patterns/${matchId}_${index}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("exercise-images")
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("exercise-images")
        .getPublicUrl(filePath);
      updatePattern(index, { image_url: urlData.publicUrl });
      toast.success("Image téléchargée");
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const savePattern = async (index: number) => {
    const p = patterns[index];
    const patternName = p.name || "Pattern personnalisé";
    
    const payload = {
      category_id: categoryId,
      match_id: matchId,
      name: patternName,
      gender: p.gender || null,
      length_feet: p.length_feet,
      buff_distance_feet: p.buff_distance_feet,
      width_boards: p.width_boards,
      total_volume_ml: p.total_volume_ml,
      oil_ratio: p.oil_ratio,
      profile_type: p.profile_type,
      forward_oil: p.forward_oil,
      reverse_oil: p.reverse_oil,
      outside_friction: p.outside_friction,
      notes: p.notes,
      image_url_male: p.gender === "female" ? null : p.image_url,
      image_url_female: p.gender === "female" ? p.image_url : null,
    };

    try {
      if (p.id) {
        const { error } = await supabase.from("bowling_oil_patterns").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("bowling_oil_patterns").insert(payload).select("id").single();
        if (error) throw error;
        if (inserted) {
          setPatterns(prev => prev.map((pat, i) => i === index ? { ...pat, id: inserted.id, hasChanges: false } : pat));
        }
      }
      setPatterns(prev => prev.map((pat, i) => i === index ? { ...pat, hasChanges: false } : pat));
      queryClient.invalidateQueries({ queryKey: ["bowling_oil_patterns", matchId] });
      toast.success("Huilage enregistré");
    } catch (err: any) {
      toast.error(`Erreur: ${err?.message || "Impossible d'enregistrer"}`);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Chargement...</div>;
  }

  return (
    <>
      <div className="space-y-4 pb-4">
        {patterns.length === 0 && (
          <Card className="bg-gradient-card">
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Droplet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun huilage configuré pour cette compétition.</p>
                <p className="text-sm mt-2">Ajoutez un huilage pour chaque genre si nécessaire.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {patterns.map((pattern, idx) => (
          <Card key={idx} className="border-blue-500/20">
            <Collapsible open={!pattern.isCollapsed} onOpenChange={() => updatePattern(idx, { isCollapsed: !pattern.isCollapsed, hasChanges: pattern.hasChanges })}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-left hover:opacity-80">
                      <ChevronDown className={`h-4 w-4 transition-transform ${pattern.isCollapsed ? "-rotate-90" : ""}`} />
                      <Droplet className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold text-sm">
                        {pattern.name || `Huilage ${idx + 1}`}
                      </span>
                      {pattern.gender && (
                        <Badge variant="secondary" className="text-xs">
                          {pattern.gender === "male" ? "Garçons" : "Filles"}
                        </Badge>
                      )}
                      {pattern.id && !pattern.hasChanges && (
                        <Badge variant="outline" className="text-xs text-green-600">Enregistré</Badge>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-1">
                    {!readOnly && pattern.id && (
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => openAssignDialog(pattern.id!)}>
                        <Users className="h-3.5 w-3.5" />
                        Attribuer
                      </Button>
                    )}
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePattern(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                {/* Show assigned players */}
                {pattern.id && getAssignedPlayerNames(pattern.id).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 ml-6">
                    {getAssignedPlayerNames(pattern.id).map((name, ni) => (
                      <Badge key={ni} variant="secondary" className="text-[10px]">{name}</Badge>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="space-y-5 pt-0">
                  {/* Gender + Name */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Genre</Label>
                      <Select
                        value={pattern.gender || ""}
                        onValueChange={(v) => updatePattern(idx, { gender: v })}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Garçons</SelectItem>
                          <SelectItem value="female">Filles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Nom du huilage</Label>
                      <Select
                        value={pattern.name || ""}
                        onValueChange={(v) => handlePatternSelect(idx, v)}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">PBA officiels</div>
                          {ALL_PATTERN_NAMES.filter(n => n.startsWith("PBA")).map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                              {getPatternPreset(name) && <span className="ml-2 text-xs text-green-600">✓</span>}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Autres</div>
                          {ALL_PATTERN_NAMES.filter(n => !n.startsWith("PBA")).map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Image */}
                  <div className="space-y-2">
                    <Label>Image du huilage</Label>
                    {pattern.image_url ? (
                      <div className="relative inline-block" style={{ maxWidth: "220px" }}>
                        <img
                          src={pattern.image_url}
                          alt="Oil pattern"
                          className="w-full rounded-lg border cursor-pointer hover:opacity-90"
                          style={{ aspectRatio: "4/5" }}
                          onClick={() => setEnlargedImage(pattern.image_url)}
                        />
                        {!readOnly && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7"
                            onClick={() => updatePattern(idx, { image_url: null })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ) : !readOnly ? (
                      <div
                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 inline-block"
                        style={{ width: "220px", aspectRatio: "4/5" }}
                        onClick={() => fileInputRefs.current[idx]?.click()}
                      >
                        <input
                          ref={(el) => { fileInputRefs.current[idx] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(idx, file);
                          }}
                        />
                        <div className="flex flex-col items-center gap-2 pt-8">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Cliquer pour ajouter</p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Dimensions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Longueur (feet)
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent>Distance de la ligne de faute</TooltipContent></Tooltip></TooltipProvider>
                      </Label>
                      <Input type="number" value={pattern.length_feet ?? ""} onChange={(e) => updatePattern(idx, { length_feet: e.target.value ? Number(e.target.value) : null })} placeholder="Ex: 40" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Distance de buff (feet)</Label>
                      <Input type="number" value={pattern.buff_distance_feet ?? ""} onChange={(e) => updatePattern(idx, { buff_distance_feet: e.target.value ? Number(e.target.value) : null })} placeholder="Ex: 3" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Largeur (boards)</Label>
                      <Input type="number" value={pattern.width_boards ?? ""} onChange={(e) => updatePattern(idx, { width_boards: e.target.value ? Number(e.target.value) : null })} placeholder="Ex: 31" max={39} disabled={readOnly} />
                    </div>
                  </div>

                  {/* Volume */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Volume total (mL)</Label>
                      <Input type="number" value={pattern.total_volume_ml ?? ""} onChange={(e) => updatePattern(idx, { total_volume_ml: e.target.value ? Number(e.target.value) : null })} placeholder="Ex: 25" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ratio latéral d'huile</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={pattern.oil_ratio?.replace(/:1$/, '') || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            updatePattern(idx, { oil_ratio: val ? `${val}:1` : null });
                          }}
                          placeholder="Ex: 3"
                          disabled={readOnly}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground font-medium">: 1</span>
                      </div>
                      {(() => {
                        const cat = getOilCategory(pattern.oil_ratio);
                        if (!cat) return null;
                        return (
                          <div className={`mt-1.5 p-2 rounded-md border text-xs ${cat.color}`}>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cat.color}`}>
                                {cat.label}
                              </Badge>
                              <span className="font-medium">{cat.description}</span>
                            </div>
                            <p className="mt-1 opacity-80">{cat.detail}</p>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="space-y-2">
                      <Label>Type de profil</Label>
                      <Select value={pattern.profile_type || ""} onValueChange={(v) => updatePattern(idx, { profile_type: v as OilPatternData["profile_type"] })} disabled={readOnly}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {PROFILE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Distribution */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <Label className="cursor-pointer">Forward oil</Label>
                      <Switch checked={pattern.forward_oil} onCheckedChange={(v) => updatePattern(idx, { forward_oil: v })} disabled={readOnly} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <Label className="cursor-pointer">Reverse oil</Label>
                      <Switch checked={pattern.reverse_oil} onCheckedChange={(v) => updatePattern(idx, { reverse_oil: v })} disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Friction extérieure</Label>
                      <Select value={pattern.outside_friction || ""} onValueChange={(v) => updatePattern(idx, { outside_friction: v as OilPatternData["outside_friction"] })} disabled={readOnly}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {FRICTION_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={pattern.notes ?? ""} onChange={(e) => updatePattern(idx, { notes: e.target.value || null })} placeholder="Observations..." rows={2} disabled={readOnly} />
                  </div>

                  {/* Save */}
                  {!readOnly && pattern.hasChanges && (
                    <div className="flex justify-end">
                      <Button onClick={() => savePattern(idx)}>
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer ce huilage
                      </Button>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {!readOnly && (
          <Button variant="outline" className="w-full gap-2 border-dashed" onClick={addPattern}>
            <Plus className="h-4 w-4" />
            Ajouter un huilage
          </Button>
        )}
      </div>

      <Dialog open={!!enlargedImage} onOpenChange={(open) => !open && setEnlargedImage(null)}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-2">
          {enlargedImage && (
            <img src={enlargedImage} alt="Huilage agrandi" className="w-full h-full object-contain max-h-[85vh] rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Assign players dialog */}
      <Dialog open={!!assignPatternId} onOpenChange={(open) => !open && setAssignPatternId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Attribuer le huilage à l'effectif</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto py-2">
            {categoryPlayers?.map((player) => {
              const fullName = [player.first_name, player.name].filter(Boolean).join(" ");
              const isChecked = selectedPlayerIds.includes(player.id);
              return (
                <label key={player.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      setSelectedPlayerIds(prev =>
                        checked ? [...prev, player.id] : prev.filter(id => id !== player.id)
                      );
                    }}
                  />
                  <span className="text-sm">{fullName}</span>
                </label>
              );
            })}
            {(!categoryPlayers || categoryPlayers.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun athlète dans l'effectif</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPlayerIds(categoryPlayers?.map(p => p.id) || [])}
            >
              Tout sélectionner
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPlayerIds([])}
            >
              Aucun
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignPatternId(null)}>Annuler</Button>
            <Button
              onClick={() => {
                if (assignPatternId) {
                  assignMutation.mutate({ patternId: assignPatternId, playerIds: selectedPlayerIds });
                }
              }}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
