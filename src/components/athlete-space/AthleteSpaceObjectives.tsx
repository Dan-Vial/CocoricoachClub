import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  playerId: string;
  categoryId: string;
}

export function AthleteSpaceObjectives({ playerId, categoryId }: Props) {
  const { data: testReminders = [] } = useQuery({
    queryKey: ["athlete-space-test-reminders", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_reminders")
        .select("*")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("start_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            Objectifs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Les objectifs fixés par ton staff s'afficheront ici. Consulte régulièrement cette section pour suivre ta progression.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-warning" />
            Tests prévus
          </CardTitle>
        </CardHeader>
        <CardContent>
          {testReminders.length > 0 ? (
            <div className="space-y-2">
              {testReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{reminder.test_type}</p>
                    <p className="text-xs text-muted-foreground">Tous les {reminder.frequency_weeks} semaines</p>
                  </div>
                  {reminder.start_date && (
                    <Badge variant="outline" className="whitespace-nowrap">
                      {format(new Date(reminder.start_date), "dd MMM", { locale: fr })}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun test prévu pour le moment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
