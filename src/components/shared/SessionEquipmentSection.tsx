import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mountain, Waves } from "lucide-react";
import { useState } from "react";
import { SurfEquipmentSelector } from "@/components/surf/SurfEquipmentSelector";
import { SkiEquipmentSelector } from "@/components/ski/SkiEquipmentSelector";
import { PadelEquipmentSelector } from "@/components/padel/PadelEquipmentSelector";
import { isSurfCategory, isSkiCategory, isPadelCategory } from "@/lib/constants/sportTypes";

interface SessionEquipmentSectionProps {
  categoryId: string;
  sportType: string;
  matchId?: string;
  trainingSessionId?: string;
  isViewer?: boolean;
}

export function SessionEquipmentSection({
  categoryId,
  sportType,
  matchId,
  trainingSessionId,
  isViewer,
}: SessionEquipmentSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isSurf = isSurfCategory(sportType);
  const isSki = isSkiCategory(sportType);
  const isPadel = isPadelCategory(sportType);

  if (!isSurf && !isSki && !isPadel) return null;

  const { data: players = [] } = useQuery({
    queryKey: ["category-players-equipment", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return (data || []) as { id: string; name: string; first_name: string | null }[];
    },
  });

  if (players.length === 0) return null;

  const icon = isSurf ? <Waves className="h-4 w-4" /> : isPadel ? null : <Mountain className="h-4 w-4" />;
  const title = isSurf ? "Matériel surf par athlète" : isPadel ? "Matériel padel par athlète" : "Matériel ski/snow par athlète";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {icon}
              {title}
              <span className="text-xs text-muted-foreground font-normal">
                ({players.length} athlète{players.length > 1 ? "s" : ""})
              </span>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {players.map((player) => (
              <div key={player.id} className="flex items-start gap-3 p-2 rounded-lg border bg-muted/20">
                <Avatar className="h-7 w-7 mt-0.5">
                  <AvatarFallback className="text-[10px]">
                    {(player.first_name?.[0] || "").toUpperCase()}
                    {(player.name?.[0] || "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium mb-1">
                    {player.first_name} {player.name}
                  </p>
                  {isSurf && (
                    <SurfEquipmentSelector
                      playerId={player.id}
                      categoryId={categoryId}
                      matchId={matchId}
                      trainingSessionId={trainingSessionId}
                      disabled={isViewer}
                    />
                  )}
                  {isSki && (
                    <SkiEquipmentSelector
                      playerId={player.id}
                      categoryId={categoryId}
                      matchId={matchId}
                      trainingSessionId={trainingSessionId}
                      disabled={isViewer}
                    />
                  )}
                  {isPadel && (
                    <PadelEquipmentSelector
                      playerId={player.id}
                      categoryId={categoryId}
                      matchId={matchId}
                      trainingSessionId={trainingSessionId}
                      disabled={isViewer}
                    />
                  )}
                  {isSki && (
                    <SkiEquipmentSelector
                      playerId={player.id}
                      categoryId={categoryId}
                      matchId={matchId}
                      trainingSessionId={trainingSessionId}
                      disabled={isViewer}
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
