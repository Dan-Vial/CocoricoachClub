import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Circle, Lock, ChevronDown, ChevronRight, Package, ArrowRightLeft } from "lucide-react";
import { BowlingScoreSheet, FrameData, BowlingStats } from "@/components/athlete-portal/BowlingScoreSheet";

const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};

// Bowling competition categories
const BOWLING_COMPETITION_CATEGORIES = [
  { value: "individuelle", label: "Individuelle" },
  { value: "doublette", label: "Doublette" },
  { value: "equipe_4", label: "Équipe de 4" },
  { value: "masters", label: "Masters" },
  { value: "practice_officiel", label: "Practice officiel" },
  { value: "practice_non_officiel", label: "Practice non officiel" },
];

// Bowling phases
const BOWLING_PHASES = [
  { value: "qualification", label: "Qualifications" },
  { value: "round_robin", label: "Round Robin" },
  { value: "quart", label: "Quart de finale" },
  { value: "demi", label: "Demi-finale" },
  { value: "petite_finale", label: "Petite finale" },
  { value: "finale", label: "Finale" },
];

export { BOWLING_COMPETITION_CATEGORIES, BOWLING_PHASES };

export interface BowlingBlock {
  id: string;
  roundDate: string;
  bowlingCategory: string;
  phase: string;
  opponent_name: string;
  notes: string;
  debriefing: string;
  isCollapsed: boolean;
  trackPockets: boolean;
}

export interface Round {
  id?: string;
  round_number: number;
  opponent_name: string;
  result: string;
  notes: string;
  stats: Record<string, number>;
  phase: string;
  lane?: number;
  wind_conditions?: string;
  current_conditions?: string;
  temperature_celsius?: number;
  final_time_seconds?: number;
  ranking?: number;
  gap_to_first?: string;
  bowlingCategory?: string;
  isLocked?: boolean;
  bowlingFrames?: FrameData[];
  roundDate?: string;
  blockId?: string;
  ballData?: { mode: string; ballId?: string | null; frameBalls?: (string | null)[] };
  oilPatternId?: string;
}

interface BowlingBlockManagerProps {
  playerId: string;
  categoryId: string;
  matchId: string;
  rounds: Round[];
  blocks: BowlingBlock[];
  matchDate?: string;
  onBlocksChange: (blocks: BowlingBlock[]) => void;
  onRoundsChange: (rounds: Round[]) => void;
  onScoreSave: (roundNumber: number, stats: BowlingStats, frames: FrameData[], ballData?: any) => void;
  onLock: (roundNumber: number) => void;
  onUnlock: (roundNumber: number) => void;
}

export function BowlingBlockManager({
  playerId,
  categoryId,
  matchId,
  rounds,
  blocks,
  matchDate,
  onBlocksChange,
  onRoundsChange,
  onScoreSave,
  onLock,
  onUnlock,
}: BowlingBlockManagerProps) {
  // Load oil patterns for the match
  const { data: oilPatterns } = useQuery({
    queryKey: ["bowling_oil_patterns", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bowling_oil_patterns")
        .select("id, name, gender")
        .eq("match_id", matchId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!matchId,
  });
  const addBlock = () => {
    const newBlock: BowlingBlock = {
      id: `block_${Date.now()}`,
      roundDate: matchDate?.split("T")[0] || new Date().toISOString().split("T")[0],
      bowlingCategory: "",
      phase: "",
      opponent_name: "",
      notes: "",
      debriefing: "",
      isCollapsed: false,
      trackPockets: true,
    };
    onBlocksChange([...blocks, newBlock]);
  };

  const updateBlock = (blockId: string, updates: Partial<BowlingBlock>) => {
    onBlocksChange(blocks.map(b => b.id === blockId ? { ...b, ...updates } : b));
    // Also update all rounds in this block with shared metadata
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      const updatedRounds = rounds.map(r => {
        if (r.blockId === blockId) {
          return {
            ...r,
            roundDate: updates.roundDate ?? block.roundDate,
            bowlingCategory: updates.bowlingCategory ?? block.bowlingCategory,
            phase: updates.phase ?? block.phase,
            opponent_name: updates.opponent_name ?? block.opponent_name,
          };
        }
        return r;
      });
      onRoundsChange(updatedRounds);
    }
  };

  const removeBlock = (blockId: string) => {
    onBlocksChange(blocks.filter(b => b.id !== blockId));
    onRoundsChange(rounds.filter(r => r.blockId !== blockId));
  };

  const toggleBlock = (blockId: string) => {
    onBlocksChange(blocks.map(b => b.id === blockId ? { ...b, isCollapsed: !b.isCollapsed } : b));
  };

  const addGameToBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const maxRound = rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) : 0;
    const newRound: Round = {
      round_number: maxRound + 1,
      opponent_name: block.opponent_name,
      result: "",
      notes: "",
      stats: {},
      phase: block.phase,
      bowlingCategory: block.bowlingCategory,
      roundDate: block.roundDate,
      blockId: blockId,
      isLocked: false,
      bowlingFrames: undefined,
    };
    onRoundsChange([...rounds, newRound]);
  };

  const removeGame = (roundNumber: number) => {
    onRoundsChange(rounds.filter(r => r.round_number !== roundNumber));
  };

  const moveGameToBlock = (roundNumber: number, newBlockId: string) => {
    const targetBlock = blocks.find(b => b.id === newBlockId);
    if (!targetBlock) return;
    onRoundsChange(rounds.map(r => {
      if (r.round_number === roundNumber) {
        return {
          ...r,
          blockId: newBlockId,
          roundDate: targetBlock.roundDate,
          bowlingCategory: targetBlock.bowlingCategory,
          phase: targetBlock.phase,
          opponent_name: targetBlock.opponent_name,
        };
      }
      return r;
    }));
  };

  const getBlockRounds = (blockId: string) => {
    return rounds.filter(r => r.blockId === blockId).sort((a, b) => a.round_number - b.round_number);
  };

  // Orphan rounds (no block) - for backward compatibility
  const orphanRounds = rounds.filter(r => !r.blockId);

  return (
    <div className="space-y-4 pb-4">
      {/* Orphan rounds (legacy data without blocks) */}
      {orphanRounds.length > 0 && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Parties sans bloc (anciennes données)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orphanRounds.map(round => (
              <div key={round.round_number} className="p-2 rounded border text-sm flex items-center justify-between">
                <span>Partie #{round.round_number} — Score: {round.stats["gameScore"] || 0}</span>
                <div className="flex items-center gap-2">
                  {blocks.length > 0 && (
                    <Select onValueChange={(v) => moveGameToBlock(round.round_number, v)}>
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue placeholder="Déplacer..." />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        {blocks.map((b, i) => (
                          <SelectItem key={b.id} value={b.id}>Bloc {i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {round.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Blocks */}
      {blocks.map((block, blockIdx) => {
        const blockRounds = getBlockRounds(block.id);
        const blockHasLockedGames = blockRounds.some(r => r.isLocked);
        const blockTotal = blockRounds.reduce((s, r) => s + (r.stats["gameScore"] || 0), 0);
        const blockAvg = blockRounds.length > 0 ? (blockTotal / blockRounds.length).toFixed(1) : "—";

        return (
          <Card key={block.id} className="border-primary/20">
            <Collapsible open={!block.isCollapsed} onOpenChange={() => toggleBlock(block.id)}>
              {/* Block header */}
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                      {block.isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">Bloc {blockIdx + 1}</span>
                      {block.bowlingCategory && (
                        <Badge variant="secondary" className="text-xs">
                          {BOWLING_COMPETITION_CATEGORIES.find(c => c.value === block.bowlingCategory)?.label || block.bowlingCategory}
                        </Badge>
                      )}
                      {block.phase && (
                        <Badge variant="outline" className="text-xs">
                          {BOWLING_PHASES.find(p => p.value === block.phase)?.label || block.phase}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs ml-1">
                        {blockRounds.length} partie{blockRounds.length !== 1 ? "s" : ""}
                      </Badge>
                      {blockRounds.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          Moy: <strong>{blockAvg}</strong>
                        </span>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  {!blockHasLockedGames && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBlock(block.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {/* Block metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50 border">
                    <div>
                      <Label className="text-xs font-medium">Jour</Label>
                      <Input
                        type="date"
                        value={block.roundDate}
                        onChange={(e) => updateBlock(block.id, { roundDate: e.target.value })}
                        className="h-8 text-xs"
                        
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Catégorie</Label>
                      <Select
                        value={block.bowlingCategory}
                        onValueChange={(v) => updateBlock(block.id, { bowlingCategory: v })}
                        
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          {BOWLING_COMPETITION_CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Phase</Label>
                      <Select
                        value={block.phase}
                        onValueChange={(v) => updateBlock(block.id, { phase: v })}
                        
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          {BOWLING_PHASES.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Adversaire</Label>
                      <Input
                        value={block.opponent_name}
                        onChange={(e) => updateBlock(block.id, { opponent_name: e.target.value })}
                        placeholder="Nom adversaire"
                        className="h-8 text-xs"
                        
                      />
                    </div>
                  </div>
                  
                  {/* Pocket tracking toggle - prominent */}
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                    <Checkbox
                      id={`trackPockets-${block.id}`}
                      checked={block.trackPockets !== false}
                      onCheckedChange={(checked) => updateBlock(block.id, { trackPockets: !!checked })}
                    />
                    <Label htmlFor={`trackPockets-${block.id}`} className="text-sm font-medium cursor-pointer">
                      🎯 Statistiques de poches
                    </Label>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {block.trackPockets !== false ? "Activé" : "Désactivé"}
                    </span>
                  </div>

                  {/* Games within block */}
                  {blockRounds.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Aucune partie dans ce bloc. Ajoutez votre première partie ci-dessous.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {blockRounds.map((round, gameIdx) => (
                        <Card key={round.round_number} className={`relative ${round.isLocked ? "border-muted-foreground/30" : ""}`}>
                          {round.isLocked && (
                            <div className="absolute top-2 right-2 z-10">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => onUnlock(round.round_number)}
                              >
                                <Lock className="h-3 w-3" />
                                Modifier
                              </Button>
                            </div>
                          )}
                          <CardHeader className="pb-1 pt-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Circle className="h-3 w-3 text-primary" />
                                Partie {gameIdx + 1}
                                {round.stats["gameScore"] > 0 && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {round.stats["gameScore"]}
                                  </Badge>
                                )}
                              </CardTitle>
                              <div className="flex items-center gap-1">
                                {/* Move to another block */}
                                {blocks.length > 1 && (
                                  <Select onValueChange={(v) => moveGameToBlock(round.round_number, v)}>
                                    <SelectTrigger className="h-7 w-28 text-xs">
                                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                                      <span className="text-[10px]">Déplacer</span>
                                    </SelectTrigger>
                                    <SelectContent className="z-[200]">
                                      {blocks.filter(b => b.id !== block.id).map((b, i) => {
                                        const bIdx = blocks.findIndex(bl => bl.id === b.id);
                                        return (
                                          <SelectItem key={b.id} value={b.id}>Bloc {bIdx + 1}</SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                )}
                                {!round.isLocked && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeGame(round.round_number)}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          {/* Oil pattern selector */}
                          {oilPatterns && oilPatterns.length > 0 && (
                            <div className="px-3 pb-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium whitespace-nowrap">Huilage :</Label>
                                <Select
                                  value={round.oilPatternId || ""}
                                  onValueChange={(v) => {
                                    onRoundsChange(rounds.map(r =>
                                      r.round_number === round.round_number ? { ...r, oilPatternId: v } : r
                                    ));
                                  }}
                                  disabled={round.isLocked}
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1">
                                    <SelectValue placeholder="Sélectionner un huilage..." />
                                  </SelectTrigger>
                                  <SelectContent className="z-[200]">
                                    {oilPatterns.map((op) => (
                                      <SelectItem key={op.id} value={op.id}>
                                        {op.name}{op.gender ? ` (${op.gender === "male" ? "G" : "F"})` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                          <CardContent className="pt-0">
                            <BowlingScoreSheet
                              trackPockets={block.trackPockets !== false}
                              key={`bowling-${round.round_number}-${round.isLocked}`}
                              initialFrames={round.bowlingFrames}
                              playerId={playerId}
                              categoryId={categoryId}
                              readOnly={round.isLocked}
                              onSave={(stats, frames, ballData) => {
                                onScoreSave(round.round_number, stats, frames, ballData);
                              }}
                              onCancel={() => {
                                if (!round.isLocked) removeGame(round.round_number);
                              }}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Debriefing section */}
                  <div className="space-y-2 p-3 rounded-lg border border-primary/10 bg-primary/5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      📝 Débriefing du bloc {blockIdx + 1}
                    </Label>
                    <Textarea
                      value={block.debriefing || ""}
                      onChange={(e) => updateBlock(block.id, { debriefing: e.target.value })}
                      placeholder="Compte-rendu de la journée, axes de travail identifiés, observations du coach..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>

                  {/* Add game button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addGameToBlock(block.id)}
                    className="w-full gap-2 border-dashed"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une partie au bloc {blockIdx + 1}
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Add block button */}
      <Button
        size="sm"
        onClick={addBlock}
        className="w-full gap-2 bg-primary hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Ajouter un bloc
      </Button>
    </div>
  );
}
