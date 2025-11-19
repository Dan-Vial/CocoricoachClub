import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PlayerRotationDialog } from "./PlayerRotationDialog";

interface MatchListProps {
  matches: Array<{
    id: string;
    match_date: string;
    match_time: string | null;
    opponent: string;
    match_order: number;
    result: string | null;
    notes: string | null;
  }>;
  tournamentId: string;
  categoryId: string;
}

export function MatchList({ matches, tournamentId, categoryId }: MatchListProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-2">
        {matches.map((match) => (
          <MatchItem
            key={match.id}
            match={match}
            onManageRotation={() => setSelectedMatchId(match.id)}
          />
        ))}
      </div>

      {selectedMatchId && (
        <PlayerRotationDialog
          open={!!selectedMatchId}
          onOpenChange={(open) => !open && setSelectedMatchId(null)}
          matchId={selectedMatchId}
          categoryId={categoryId}
        />
      )}
    </>
  );
}

interface MatchItemProps {
  match: {
    id: string;
    match_date: string;
    match_time: string | null;
    opponent: string;
    match_order: number;
    result: string | null;
    notes: string | null;
  };
  onManageRotation: () => void;
}

function MatchItem({ match, onManageRotation }: MatchItemProps) {
  const { data: playerRotations } = useQuery({
    queryKey: ["player-rotations", match.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_player_rotation")
        .select("*, players(name)")
        .eq("tournament_match_id", match.id);
      if (error) throw error;
      return data;
    },
  });

  const totalMinutes = playerRotations?.reduce((sum, p) => sum + p.minutes_played, 0) || 0;

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Match {match.match_order}</Badge>
            <span className="font-medium">{match.opponent}</span>
            {match.result && <Badge>{match.result}</Badge>}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(match.match_date), "dd MMM yyyy", { locale: fr })}
              {match.match_time && ` à ${match.match_time}`}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {playerRotations?.length || 0} joueur(s) - {totalMinutes} min
            </div>
          </div>
          {match.notes && (
            <p className="text-sm text-muted-foreground">{match.notes}</p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onManageRotation}>
          Gérer rotation
        </Button>
      </div>
    </Card>
  );
}
