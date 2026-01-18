import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CalendarClock } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface InjuryAlert {
  id: string;
  player_id: string;
  injury_type: string;
  estimated_return_date: string;
  players: {
    id: string;
    name: string;
    category_id: string;
  };
}

export function InjuryReturnAlerts() {
  const navigate = useNavigate();
  
  const { data: upcomingReturns } = useQuery({
    queryKey: ["injury-return-alerts"],
    queryFn: async () => {
      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);

      const { data, error } = await supabase
        .from("injuries")
        .select(`
          id,
          player_id,
          injury_type,
          estimated_return_date,
          players (
            id,
            name,
            category_id
          )
        `)
        .eq("status", "active")
        .not("estimated_return_date", "is", null)
        .gte("estimated_return_date", today.toISOString().split("T")[0])
        .lte("estimated_return_date", threeDaysFromNow.toISOString().split("T")[0]);

      if (error) throw error;
      return data as InjuryAlert[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (!upcomingReturns || upcomingReturns.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {upcomingReturns.map((injury) => {
        const daysUntilReturn = differenceInDays(
          parseISO(injury.estimated_return_date),
          new Date()
        );
        const returnDate = format(parseISO(injury.estimated_return_date), "d MMMM yyyy", {
          locale: fr,
        });

        return (
          <Alert key={injury.id} className="bg-warning/10 border-warning">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertTitle className="flex items-center justify-between">
              <span className="font-semibold">Retour de blessure imminent</span>
              <CalendarClock className="h-4 w-4" />
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                <span className="font-medium">{injury.players.name}</span> devrait
                revenir dans{" "}
                <span className="font-semibold text-warning">
                  {daysUntilReturn === 0
                    ? "aujourd'hui"
                    : daysUntilReturn === 1
                    ? "1 jour"
                    : `${daysUntilReturn} jours`}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Blessure : {injury.injury_type} • Retour estimé : {returnDate}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => navigate(`/players/${injury.player_id}`)}
              >
                Voir le profil de l'athlète
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
