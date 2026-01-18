import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PlayerComparisonProps {
  categoryIds: string[];
}

export function PlayerComparison({ categoryIds }: PlayerComparisonProps) {
  const { data: comparison, isLoading } = useQuery({
    queryKey: ["player-comparison", categoryIds],
    queryFn: async () => {
      if (categoryIds.length === 0) return [];

      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name")
        .in("category_id", categoryIds);

      if (playersError) throw playersError;
      if (!players || players.length === 0) return [];

      const playerIds = players.map((p) => p.id);

      const [awcrRes, speedRes, strengthRes] = await Promise.all([
        supabase
          .from("awcr_tracking")
          .select("player_id, awcr, training_load")
          .in("player_id", playerIds)
          .not("awcr", "is", null)
          .order("session_date", { ascending: false })
          .limit(100),
        supabase
          .from("speed_tests")
          .select("player_id, time_40m_seconds, vma_kmh")
          .in("player_id", playerIds)
          .order("test_date", { ascending: false })
          .limit(100),
        supabase
          .from("strength_tests")
          .select("player_id, weight_kg")
          .in("player_id", playerIds)
          .order("test_date", { ascending: false })
          .limit(100),
      ]);

      return players.map((player) => {
        const playerAwcr = awcrRes.data?.filter((a) => a.player_id === player.id) || [];
        const playerSpeed = speedRes.data?.filter((s) => s.player_id === player.id) || [];
        const playerStrength = strengthRes.data?.filter((s) => s.player_id === player.id) || [];

        const avgAwcr =
          playerAwcr.length > 0
            ? playerAwcr.reduce((sum, a) => sum + Number(a.awcr), 0) / playerAwcr.length
            : null;
        const avgLoad =
          playerAwcr.length > 0
            ? playerAwcr.reduce((sum, a) => sum + (a.training_load || 0), 0) / playerAwcr.length
            : null;
        const best40m =
          playerSpeed.length > 0
            ? Math.min(...playerSpeed.filter((s) => s.time_40m_seconds).map((s) => Number(s.time_40m_seconds)))
            : null;
        const avgVma =
          playerSpeed.filter((s) => s.vma_kmh).length > 0
            ? playerSpeed.filter((s) => s.vma_kmh).reduce((sum, s) => sum + Number(s.vma_kmh), 0) /
              playerSpeed.filter((s) => s.vma_kmh).length
            : null;
        const maxStrength =
          playerStrength.length > 0
            ? Math.max(...playerStrength.map((s) => Number(s.weight_kg)))
            : null;

        return {
          name: player.name,
          awcr: avgAwcr ? Number(avgAwcr.toFixed(2)) : null,
          load: avgLoad ? Math.round(avgLoad) : null,
          sprint40m: best40m ? Number(best40m.toFixed(2)) : null,
          vma: avgVma ? Number(avgVma.toFixed(1)) : null,
          strength: maxStrength ? Number(maxStrength.toFixed(1)) : null,
        };
      });
    },
    enabled: categoryIds.length > 0,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getAwcrBadge = (awcr: number | null) => {
    if (!awcr) return null;
    if (awcr < 0.8)
      return (
        <Badge variant="secondary" className="bg-blue-500/20 text-blue-700">
          Faible
        </Badge>
      );
    if (awcr > 1.3)
      return (
        <Badge variant="destructive" className="bg-red-500/20 text-red-700">
          Élevé
        </Badge>
      );
    return (
      <Badge variant="default" className="bg-green-500/20 text-green-700">
        Optimal
      </Badge>
    );
  };

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle>Comparaison des Athlètes</CardTitle>
      </CardHeader>
      <CardContent>
        {comparison && comparison.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Athlète</TableHead>
                <TableHead>AWCR Moyen</TableHead>
                <TableHead>Charge Moy.</TableHead>
                <TableHead>Meilleur 40m</TableHead>
                <TableHead>VMA Moy.</TableHead>
                <TableHead>Force Max</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((player, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {player.awcr || "—"}
                      {player.awcr && getAwcrBadge(player.awcr)}
                    </div>
                  </TableCell>
                  <TableCell>{player.load || "—"}</TableCell>
                  <TableCell>{player.sprint40m ? `${player.sprint40m}s` : "—"}</TableCell>
                  <TableCell>{player.vma ? `${player.vma} km/h` : "—"}</TableCell>
                  <TableCell>{player.strength ? `${player.strength} kg` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Aucune donnée de comparaison disponible
          </p>
        )}
      </CardContent>
    </Card>
  );
}
