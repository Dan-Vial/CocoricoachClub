import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Lock } from "lucide-react";

interface Props {
  clubId: string;
  categoryId: string;
  value: string | null; // null = saison active
  onChange: (seasonId: string | null) => void;
}

interface Season {
  id: string;
  name: string;
  is_active: boolean;
  start_date: string;
}

const ALL_SEASONS = "__all__";

export function SeasonHistorySelector({ clubId, categoryId, value, onChange }: Props) {
  const { data: seasons = [] } = useQuery({
    queryKey: ["athletics_history_seasons", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("id, name, is_active, start_date")
        .eq("club_id", clubId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []) as Season[];
    },
    enabled: !!clubId,
  });

  const { data: closures = [] } = useQuery({
    queryKey: ["season_closures", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("season_closures" as any)
        .select("closed_season_id")
        .eq("category_id", categoryId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!categoryId,
  });

  const closedIds = new Set(closures.map((c) => c.closed_season_id));

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value ?? ALL_SEASONS}
        onValueChange={(v) => onChange(v === ALL_SEASONS ? null : v)}
      >
        <SelectTrigger className="w-[220px] h-8 text-xs">
          <SelectValue placeholder="Saison" />
        </SelectTrigger>
        <SelectContent className="z-[200]">
          <SelectItem value={ALL_SEASONS}>Saison en cours (active)</SelectItem>
          {seasons.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <div className="flex items-center gap-2">
                <span>{s.name}</span>
                {s.is_active && (
                  <Badge variant="secondary" className="h-4 text-[9px] px-1">
                    active
                  </Badge>
                )}
                {closedIds.has(s.id) && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
