import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Waves } from "lucide-react";

interface SurfEquipmentSelectorProps {
  playerId: string;
  categoryId: string;
  matchId?: string;
  trainingSessionId?: string;
  disabled?: boolean;
}

export function SurfEquipmentSelector({ playerId, categoryId, matchId, trainingSessionId, disabled }: SurfEquipmentSelectorProps) {
  const queryClient = useQueryClient();

  const { data: equipment = [] } = useQuery({
    queryKey: ["surf_equipment", playerId, categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_surf_equipment")
        .select("*")
        .eq("player_id", playerId)
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("equipment_type");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: selected = [] } = useQuery({
    queryKey: ["surf_session_equipment", playerId, matchId || trainingSessionId],
    queryFn: async () => {
      let query = supabase.from("surf_session_equipment").select("*, player_surf_equipment(*)").eq("player_id", playerId);
      if (matchId) query = query.eq("match_id", matchId);
      else if (trainingSessionId) query = query.eq("training_session_id", trainingSessionId);
      else return [];
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(matchId || trainingSessionId),
  });

  const addEquipment = useMutation({
    mutationFn: async (equipmentId: string) => {
      const { error } = await supabase.from("surf_session_equipment").insert({
        player_id: playerId,
        equipment_id: equipmentId,
        match_id: matchId || null,
        training_session_id: trainingSessionId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surf_session_equipment", playerId, matchId || trainingSessionId] }),
  });

  const removeEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("surf_session_equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surf_session_equipment", playerId, matchId || trainingSessionId] }),
  });

  const getLabel = (item: any) => {
    if (item.equipment_type === "board") {
      return `🏄 ${item.board_brand || ""} ${item.board_model || item.board_type || "Planche"}${item.board_volume_liters ? ` (${item.board_volume_liters}L)` : ""}`.trim();
    }
    if (item.equipment_type === "fins") {
      return `🔱 ${item.fins_brand || ""} ${item.fins_model || item.fins_type || "Ailerons"}`.trim();
    }
    return `🧥 ${item.wetsuit_brand || ""} ${item.wetsuit_thickness || "Combinaison"}`.trim();
  };

  const selectedIds = selected.map((s: any) => s.equipment_id);
  const available = equipment.filter((e: any) => !selectedIds.includes(e.id));

  if (equipment.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label className="text-xs flex items-center gap-1">
        <Waves className="h-3 w-3" /> Équipement utilisé
      </Label>
      
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s: any) => {
            const eq = s.player_surf_equipment || equipment.find((e: any) => e.id === s.equipment_id);
            return (
              <Badge key={s.id} variant="secondary" className="text-xs cursor-pointer hover:bg-destructive/20" onClick={() => !disabled && removeEquipment.mutate(s.id)}>
                {eq ? getLabel(eq) : "?"} ×
              </Badge>
            );
          })}
        </div>
      )}

      {!disabled && available.length > 0 && (
        <Select onValueChange={(v) => addEquipment.mutate(v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Ajouter un équipement..." />
          </SelectTrigger>
          <SelectContent>
            {available.map((e: any) => (
              <SelectItem key={e.id} value={e.id} className="text-xs">
                {getLabel(e)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
