import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Droplet, Save, RotateCcw, Info, Upload, X, Image as ImageIcon } from "lucide-react";
import {
  ALL_PATTERN_NAMES,
  getPatternPreset,
  PROFILE_TYPES,
  FRICTION_LEVELS,
  OIL_RATIOS,
  type OilPatternPreset,
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

interface OilPattern {
  id?: string;
  name: string;
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
}

const defaultPattern: OilPattern = {
  name: "",
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
};

export function BowlingOilPatternSection({
  matchId,
  categoryId,
  readOnly = false,
}: BowlingOilPatternSectionProps) {
  const [pattern, setPattern] = useState<OilPattern>(defaultPattern);
  const [hasChanges, setHasChanges] = useState(false);
  const [customName, setCustomName] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch existing pattern for this match
  const { data: existingPattern, isLoading } = useQuery({
    queryKey: ["bowling_oil_pattern", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bowling_oil_patterns")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });

  // Initialize pattern from existing data
  useEffect(() => {
    if (existingPattern) {
      setPattern({
        id: existingPattern.id,
        name: existingPattern.name || "",
        length_feet: existingPattern.length_feet,
        buff_distance_feet: existingPattern.buff_distance_feet,
        width_boards: existingPattern.width_boards,
        total_volume_ml: existingPattern.total_volume_ml,
        oil_ratio: existingPattern.oil_ratio,
        profile_type: existingPattern.profile_type as OilPattern["profile_type"],
        forward_oil: existingPattern.forward_oil ?? true,
        reverse_oil: existingPattern.reverse_oil ?? true,
        outside_friction: existingPattern.outside_friction as OilPattern["outside_friction"],
        notes: existingPattern.notes,
        image_url: existingPattern.notes ? null : null, // Will be stored in notes as JSON or separate
      });
      setHasChanges(false);
    }
  }, [existingPattern]);

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `oil-patterns/${matchId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("exercise-images")
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("exercise-images")
        .getPublicUrl(filePath);

      updateField("image_url", urlData.publicUrl);
      toast.success("Image du huilage téléchargée");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: OilPattern) => {
      const patternName = data.name === "Pattern personnel" 
        ? (customName || "Pattern personnalisé") 
        : (data.name || "Pattern personnalisé");
      
      const payload = {
        category_id: categoryId,
        match_id: matchId,
        name: patternName,
        length_feet: data.length_feet,
        buff_distance_feet: data.buff_distance_feet,
        width_boards: data.width_boards,
        total_volume_ml: data.total_volume_ml,
        oil_ratio: data.oil_ratio,
        profile_type: data.profile_type,
        forward_oil: data.forward_oil,
        reverse_oil: data.reverse_oil,
        outside_friction: data.outside_friction,
        notes: data.image_url 
          ? JSON.stringify({ text: data.notes || "", image_url: data.image_url })
          : data.notes,
      };

      if (data.id) {
        const { error } = await supabase
          .from("bowling_oil_patterns")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { data: existing } = await supabase
          .from("bowling_oil_patterns")
          .select("id")
          .eq("match_id", matchId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("bowling_oil_patterns")
            .update(payload)
            .eq("id", existing.id);
          if (error) throw error;
          setPattern(prev => ({ ...prev, id: existing.id }));
        } else {
          const { data: inserted, error } = await supabase
            .from("bowling_oil_patterns")
            .insert(payload)
            .select("id")
            .single();
          if (error) throw error;
          if (inserted) {
            setPattern(prev => ({ ...prev, id: inserted.id }));
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Pattern de huilage enregistré");
      queryClient.invalidateQueries({ queryKey: ["bowling_oil_pattern", matchId] });
      setHasChanges(false);
    },
    onError: (error: any) => {
      console.error("Save oil pattern error:", error);
      toast.error(`Erreur: ${error?.message || "Impossible d'enregistrer le huilage"}`);
    },
  });

  const handlePatternSelect = (name: string) => {
    const preset = getPatternPreset(name);
    if (preset) {
      setPattern((prev) => ({
        ...prev,
        name,
        length_feet: preset.length_feet ?? prev.length_feet,
        buff_distance_feet: preset.buff_distance_feet ?? prev.buff_distance_feet,
        width_boards: preset.width_boards ?? prev.width_boards,
        total_volume_ml: preset.total_volume_ml ?? prev.total_volume_ml,
        oil_ratio: preset.oil_ratio ?? prev.oil_ratio,
        profile_type: preset.profile_type ?? prev.profile_type,
        forward_oil: preset.forward_oil ?? prev.forward_oil,
        reverse_oil: preset.reverse_oil ?? prev.reverse_oil,
        outside_friction: preset.outside_friction ?? prev.outside_friction,
      }));
      toast.info(`Données officielles chargées pour ${name}`);
    } else {
      setPattern((prev) => ({ ...prev, name }));
      if (name !== "Pattern personnel") {
        toast.info("Données officielles non disponibles pour ce pattern");
      }
    }
    setHasChanges(true);
  };

  const updateField = <K extends keyof OilPattern>(field: K, value: OilPattern[K]) => {
    setPattern((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const resetPattern = () => {
    if (existingPattern) {
      setPattern({
        id: existingPattern.id,
        name: existingPattern.name || "",
        length_feet: existingPattern.length_feet,
        buff_distance_feet: existingPattern.buff_distance_feet,
        width_boards: existingPattern.width_boards,
        total_volume_ml: existingPattern.total_volume_ml,
        oil_ratio: existingPattern.oil_ratio,
        profile_type: existingPattern.profile_type as OilPattern["profile_type"],
        forward_oil: existingPattern.forward_oil ?? true,
        reverse_oil: existingPattern.reverse_oil ?? true,
        outside_friction: existingPattern.outside_friction as OilPattern["outside_friction"],
        notes: existingPattern.notes,
        image_url: null,
      });
    } else {
      setPattern(defaultPattern);
    }
    setHasChanges(false);
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Chargement...</div>;
  }

  return (
    <Card className="bg-gradient-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Droplet className="h-5 w-5 text-blue-500" />
          Huilage de la piste
          {existingPattern && (
            <Badge variant="secondary" className="ml-2">
              Enregistré
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Oil pattern image upload */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Image du huilage
          </h4>
          {pattern.image_url ? (
            <div className="relative" style={{ aspectRatio: "4/5", maxWidth: "280px" }}>
              <img
                src={pattern.image_url}
                alt="Oil pattern"
                className="w-full h-full object-cover rounded-lg border"
              />
              {!readOnly && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => updateField("image_url", null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            !readOnly && (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                style={{ aspectRatio: "4/5", maxWidth: "280px" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                {uploadingImage ? (
                  <p className="text-sm text-muted-foreground">Téléchargement...</p>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Cliquer pour ajouter l'image du huilage</p>
                    <p className="text-xs text-muted-foreground">Format 4:5 recommandé</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Section 1: Identification */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Identification du huilage
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du huilage</Label>
              <Select
                value={pattern.name || ""}
                onValueChange={handlePatternSelect}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pattern" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Patterns PBA officiels
                  </div>
                  {ALL_PATTERN_NAMES.filter(n => n.startsWith("PBA")).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                      {getPatternPreset(name) && (
                        <span className="ml-2 text-xs text-green-600">✓ Données officielles</span>
                      )}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                    Autres patterns
                  </div>
                  {ALL_PATTERN_NAMES.filter(n => !n.startsWith("PBA")).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pattern.name === "Pattern personnel" && (
              <div className="space-y-2">
                <Label>Nom personnalisé</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Nom du pattern"
                  disabled={readOnly}
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Dimensions */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Dimensions du huilage
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Longueur (feet)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Distance de la ligne de faute jusqu'à la fin du huilage
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                value={pattern.length_feet ?? ""}
                onChange={(e) => updateField("length_feet", e.target.value ? Number(e.target.value) : null)}
                placeholder="Ex: 40"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Distance de buff (feet)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Zone de transition entre la fin du huilage et les quilles
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                value={pattern.buff_distance_feet ?? ""}
                onChange={(e) => updateField("buff_distance_feet", e.target.value ? Number(e.target.value) : null)}
                placeholder="Ex: 3"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Largeur (boards)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Nombre de lattes couvertes par l'huile (max 39)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                value={pattern.width_boards ?? ""}
                onChange={(e) => updateField("width_boards", e.target.value ? Number(e.target.value) : null)}
                placeholder="Ex: 31"
                max={39}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Volume et répartition */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Volume et répartition
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Volume total (mL)</Label>
              <Input
                type="number"
                value={pattern.total_volume_ml ?? ""}
                onChange={(e) => updateField("total_volume_ml", e.target.value ? Number(e.target.value) : null)}
                placeholder="Ex: 25"
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Ratio d'huile
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Rapport entre le volume d'huile au centre vs extérieur
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                value={pattern.oil_ratio || ""}
                onChange={(e) => updateField("oil_ratio", e.target.value || null)}
                placeholder="Ex: 3:1, 5:1, 8:1..."
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Type de profil</Label>
              <Select
                value={pattern.profile_type || ""}
                onValueChange={(v) => updateField("profile_type", v as OilPattern["profile_type"])}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 4: Distribution */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Distribution de l'huile
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <Label htmlFor="forward-oil" className="cursor-pointer">
                Forward oil
              </Label>
              <Switch
                id="forward-oil"
                checked={pattern.forward_oil}
                onCheckedChange={(v) => updateField("forward_oil", v)}
                disabled={readOnly}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <Label htmlFor="reverse-oil" className="cursor-pointer">
                Reverse oil
              </Label>
              <Switch
                id="reverse-oil"
                checked={pattern.reverse_oil}
                onCheckedChange={(v) => updateField("reverse_oil", v)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Niveau de friction extérieure</Label>
              <Select
                value={pattern.outside_friction || ""}
                onValueChange={(v) => updateField("outside_friction", v as OilPattern["outside_friction"])}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {FRICTION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={pattern.notes ?? ""}
            onChange={(e) => updateField("notes", e.target.value || null)}
            placeholder="Observations, ajustements recommandés..."
            rows={2}
            disabled={readOnly}
          />
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex justify-end gap-2 pt-2">
            {hasChanges && (
              <Button
                variant="outline"
                onClick={resetPattern}
                disabled={saveMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            )}
            <Button
              onClick={() => saveMutation.mutate(pattern)}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
