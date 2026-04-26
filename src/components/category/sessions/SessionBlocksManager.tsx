import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { getTrainingTypeColor } from "@/lib/constants/trainingTypes";
import { CustomTrainingTypeSelect } from "./CustomTrainingTypeSelect";
import { cn } from "@/lib/utils";
import { isRugbyType } from "@/lib/constants/sportTypes";
import {
  SESSION_OBJECTIVES,
  TARGET_INTENSITIES,
  VOLUME_OPTIONS,
  CONTACT_CHARGE_OPTIONS,
  getIntensityLabel,
  getContactChargeLabel,
  calculateBlocksSummary,
  getObjectiveLabel,
  getVolumeLabel,
} from "@/lib/constants/sessionBlockOptions";

export interface SessionBlock {
  id?: string;
  block_order: number;
  start_time?: string;
  end_time?: string;
  training_type: string;
  intensity?: number | null;
  notes?: string;
  session_type?: string;
  objective?: string;
  target_intensity?: string;
  volume?: string;
  contact_charge?: string;
  bowling_exercise_type?: string;
  throwing_implement?: string;
  implement_weight_g?: number | null;
}

const BOWLING_PRECISION_EXERCISES = [
  { value: "quille_7", label: "Quille 7" },
  { value: "quille_10", label: "Quille 10" },
  { value: "spares", label: "Spares (général)" },
  { value: "poche", label: "Poche" },
];

interface SessionBlocksManagerProps {
  blocks: SessionBlock[];
  onBlocksChange: (blocks: SessionBlock[]) => void;
  sportType?: string;
  categoryId: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
}

const INTENSITY_COLORS: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  2: "bg-emerald-200 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-400",
  3: "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400",
  4: "bg-lime-200 text-lime-800 dark:bg-lime-800/40 dark:text-lime-400",
  5: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  6: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  7: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  8: "bg-orange-200 text-orange-800 dark:bg-orange-800/40 dark:text-orange-400",
  9: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  10: "bg-red-200 text-red-800 dark:bg-red-800/40 dark:text-red-400",
};

export function SessionBlocksManager({
  blocks,
  onBlocksChange,
  sportType,
  categoryId,
  sessionStartTime,
  sessionEndTime,
}: SessionBlocksManagerProps) {
  const isRugby = isRugbyType(sportType || "");

  const addBlock = () => {
    const lastBlock = blocks[blocks.length - 1];
    const newStartTime = lastBlock?.end_time || sessionStartTime || undefined;
    
    const newBlock: SessionBlock = {
      block_order: blocks.length,
      start_time: newStartTime,
      end_time: undefined,
      training_type: "",
      intensity: null,
      notes: undefined,
      session_type: undefined,
      objective: undefined,
      target_intensity: undefined,
      volume: undefined,
      contact_charge: undefined,
    };
    
    onBlocksChange([...blocks, newBlock]);
  };

  const updateBlock = (index: number, field: keyof SessionBlock, value: any) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-chain times: when end_time of a block changes, update start_time of next block
    if (field === "end_time" && index < blocks.length - 1) {
      updated[index + 1] = { ...updated[index + 1], start_time: value };
    }
    
    onBlocksChange(updated);
  };

  const removeBlock = (index: number) => {
    const updated = blocks.filter((_, i) => i !== index);
    // Re-order blocks
    onBlocksChange(updated.map((block, i) => ({ ...block, block_order: i })));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === blocks.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...blocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    
    // Update block_order
    onBlocksChange(updated.map((block, i) => ({ ...block, block_order: i })));
  };

  const calculateDuration = (start?: string, end?: string): string => {
    if (!start || !end) return "";
    
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (endMinutes <= startMinutes) return "";
    
    const diff = endMinutes - startMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    
    if (hours > 0 && mins > 0) return `${hours}h${mins}min`;
    if (hours > 0) return `${hours}h`;
    return `${mins}min`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Structurer la séance en plusieurs thèmes
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Divisez votre séance en blocs horaires (ex: échauffement, technique, jeu)
          </p>
        </div>
        <Button type="button" variant="default" size="sm" onClick={addBlock} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un bloc
        </Button>
      </div>

      {blocks.length === 0 ? (
        <div 
          className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={addBlock}
        >
          <Clock className="h-8 w-8 mx-auto text-primary/50 mb-2" />
          <p className="text-muted-foreground text-sm font-medium">
            Cliquez ici pour structurer votre séance en plusieurs thèmes
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Ex: 18h30-19h Séparé • 19h-19h30 Physique • 19h30-20h Collectif
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, index) => {
            const duration = calculateDuration(block.start_time, block.end_time);
            const blockColor = getTrainingTypeColor(block.training_type);
            
            return (
              <Card key={index} className={cn("relative overflow-hidden border-0", blockColor, "bg-opacity-20 dark:bg-opacity-20")}>
                <div 
                  className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-md", blockColor)}
                />
                <CardContent className="p-4 pl-5 bg-background/70 dark:bg-background/60 backdrop-blur-sm rounded-md ml-1.5">
                  <div className="flex items-start gap-3">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveBlock(index, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveBlock(index, "down")}
                        disabled={index === blocks.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex-1 space-y-3">
                      {/* Header with block number and duration */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            Bloc {index + 1}
                          </Badge>
                          {duration && (
                            <Badge variant="secondary" className="text-xs">
                              {duration}
                            </Badge>
                          )}
                          {block.intensity && (
                            <Badge className={cn("text-xs", INTENSITY_COLORS[block.intensity])}>
                              RPE {block.intensity}
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeBlock(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Time inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Début</Label>
                          <Input
                            type="time"
                            value={block.start_time || ""}
                            onChange={(e) => updateBlock(index, "start_time", e.target.value || undefined)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Fin</Label>
                          <Input
                            type="time"
                            value={block.end_time || ""}
                            onChange={(e) => updateBlock(index, "end_time", e.target.value || undefined)}
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* Training type and intensity */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Thématique *</Label>
                          <CustomTrainingTypeSelect
                            value={block.training_type}
                            onValueChange={(val) => updateBlock(index, "training_type", val)}
                            sportType={sportType}
                            categoryId={categoryId}
                            placeholder="Sélectionner..."
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">RPE cible</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            placeholder="1-10"
                            value={block.intensity ?? ""}
                            onChange={(e) => updateBlock(index, "intensity", e.target.value ? parseInt(e.target.value) : null)}
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* Bowling precision exercise type */}
                      {block.training_type === "bowling_spare" && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Exercice précision</Label>
                          <Select
                            value={block.bowling_exercise_type || ""}
                            onValueChange={(val) => updateBlock(index, "bowling_exercise_type", val || undefined)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Sélectionner l'exercice..." />
                            </SelectTrigger>
                            <SelectContent>
                              {BOWLING_PRECISION_EXERCISES.map((ex) => (
                                <SelectItem key={ex.value} value={ex.value}>{ex.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Enrichment fields */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Objectif principal</Label>
                        <Select value={block.objective || ""} onValueChange={(val) => updateBlock(index, "objective", val || undefined)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SESSION_OBJECTIVES.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className={cn("grid gap-3", isRugby ? "grid-cols-3" : "grid-cols-2")}>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Intensité cible</Label>
                          <Select value={block.target_intensity || ""} onValueChange={(val) => updateBlock(index, "target_intensity", val || undefined)}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                              {TARGET_INTENSITIES.map(i => (
                                <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Volume</Label>
                          <Select value={block.volume || ""} onValueChange={(val) => updateBlock(index, "volume", val || undefined)}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                              {VOLUME_OPTIONS.map(v => (
                                <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {isRugby && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Charge contact</Label>
                            <Select value={block.contact_charge || ""} onValueChange={(val) => updateBlock(index, "contact_charge", val || undefined)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Sélectionner..." />
                              </SelectTrigger>
                              <SelectContent>
                                {CONTACT_CHARGE_OPTIONS.map(c => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Notes (optionnel)</Label>
                        <Textarea
                          value={block.notes || ""}
                          onChange={(e) => updateBlock(index, "notes", e.target.value || undefined)}
                          placeholder="Détails du bloc..."
                          rows={1}
                          className="min-h-[36px] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {blocks.length > 0 && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBlock}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un autre bloc
          </Button>

          {/* Summary */}
          {(() => {
            const summary = calculateBlocksSummary(blocks);
            const hasData = summary.mainSessionType || summary.avgIntensity || summary.dominantObjectives.length > 0;
            if (!hasData) return null;
            return (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Résumé séance</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {summary.mainSessionType && (
                      <Badge variant="default" className="text-xs">
                        {summary.mainSessionType}
                      </Badge>
                    )}
                    {summary.secondarySessionTypes.length > 0 && summary.secondarySessionTypes.map(t => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                    {summary.avgIntensity && (
                      <Badge variant="secondary" className="text-xs">
                        Intensité: {getIntensityLabel(summary.avgIntensity)}
                      </Badge>
                    )}
                    {summary.avgVolume && (
                      <Badge variant="secondary" className="text-xs">
                        Volume: {getVolumeLabel(summary.avgVolume)}
                      </Badge>
                    )}
                    {summary.avgContactCharge && (
                      <Badge variant="secondary" className="text-xs">
                        Contact: {getContactChargeLabel(summary.avgContactCharge)}
                      </Badge>
                    )}
                    {summary.avgRpeIntensity !== null && (
                      <Badge variant="secondary" className="text-xs">
                        RPE moy: {summary.avgRpeIntensity}
                      </Badge>
                    )}
                  </div>
                  {summary.dominantObjectives.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-muted-foreground">Filières:</span>
                      {summary.dominantObjectives.map(obj => (
                        <Badge key={obj} variant="outline" className="text-xs">
                          {getObjectiveLabel(obj)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}
    </div>
  );
}
