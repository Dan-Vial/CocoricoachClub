import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, History } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PlayerTransferHistoryProps {
  playerId: string;
}

const reasonLabels: Record<string, string> = {
  age_promotion: "Montée de catégorie",
  level_promotion: "Promotion niveau supérieur",
  national_selection: "Sélection nationale",
  level_adjustment: "Ajustement de niveau",
  end_of_season: "Fin de saison",
  other: "Autre",
};

export function PlayerTransferHistory({ playerId }: PlayerTransferHistoryProps) {
  const { data: transfers, isLoading } = useQuery({
    queryKey: ["player-transfers", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_transfers")
        .select(`
          *,
          from_category:from_category_id (id, name),
          to_category:to_category_id (id, name)
        `)
        .eq("player_id", playerId)
        .order("transfer_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Historique des transferts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!transfers || transfers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Historique des transferts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="font-medium text-sm">
                  {(transfer.from_category as any)?.name}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm">
                  {(transfer.to_category as any)?.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {transfer.reason && (
                  <Badge variant="secondary">
                    {reasonLabels[transfer.reason] || transfer.reason}
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  {format(new Date(transfer.transfer_date), "d MMM yyyy", { locale: fr })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
