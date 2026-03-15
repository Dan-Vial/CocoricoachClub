import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CircleDot } from "lucide-react";

interface BowlingBallSelectorProps {
  playerId: string;
  categoryId: string;
  mode: "simple" | "advanced";
  onModeChange: (mode: "simple" | "advanced") => void;
  selectedBallId: string | null;
  onBallChange: (ballId: string | null) => void;
  frameBalls?: (string | null)[];
  onFrameBallChange?: (frameIndex: number, ballId: string | null) => void;
}

export function BowlingBallSelector({
  playerId,
  categoryId,
  mode,
  onModeChange,
  selectedBallId,
  onBallChange,
  frameBalls,
  onFrameBallChange,
}: BowlingBallSelectorProps) {
  const { data: arsenal } = useQuery({
    queryKey: ["bowling_arsenal_selector", playerId],
    queryFn: async () => {
      const { data: catalog } = await supabase
        .from("bowling_ball_catalog" as any)
        .select("*");
      const catalogMap = new Map((catalog as any[] || []).map((b: any) => [b.id, b]));

      const { data, error } = await supabase
        .from("player_bowling_arsenal" as any)
        .select("*")
        .eq("player_id", playerId)
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;

      return (data as any[]).map((item: any) => ({
        ...item,
        displayName: item.ball_catalog_id && catalogMap.has(item.ball_catalog_id)
          ? `${catalogMap.get(item.ball_catalog_id).brand} ${catalogMap.get(item.ball_catalog_id).model}`
          : `${item.custom_ball_brand || ""} ${item.custom_ball_name || "Custom"}`.trim(),
        weight: item.weight_lbs,
      }));
    },
  });

  if (!arsenal || arsenal.length === 0) return null;

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4" />
          <span className="text-sm font-medium">Boule</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Par frame</Label>
          <Switch
            checked={mode === "advanced"}
            onCheckedChange={(checked) => onModeChange(checked ? "advanced" : "simple")}
          />
        </div>
      </div>

      {mode === "simple" ? (
        <Select value={selectedBallId || "none"} onValueChange={(v) => onBallChange(v === "none" ? null : v)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sélectionner une boule" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune</SelectItem>
            {arsenal.map((ball: any) => (
              <SelectItem key={ball.id} value={ball.id}>
                {ball.displayName} {ball.weight ? `(${ball.weight} lbs)` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">F{i + 1}</p>
              <Select
                value={frameBalls?.[i] || "none"}
                onValueChange={(v) => onFrameBallChange?.(i, v === "none" ? null : v)}
              >
                <SelectTrigger className="h-7 text-[10px] px-1">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {arsenal.map((ball: any) => (
                    <SelectItem key={ball.id} value={ball.id}>
                      {ball.displayName.split(" ").pop()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
