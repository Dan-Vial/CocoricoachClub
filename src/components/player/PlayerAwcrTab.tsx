import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Heart } from "lucide-react";
import { calculateEWMASeries, transformToDailyLoadData } from "@/lib/trainingLoadCalculations";
import { HrvEntryDialog } from "@/components/category/hrv/HrvEntryDialog";

interface PlayerAwcrTabProps {
  playerId: string;
  categoryId: string;
  readOnly?: boolean;
}

export function PlayerAwcrTab({ playerId, categoryId, readOnly = false }: PlayerAwcrTabProps) {
  const [isHrvDialogOpen, setIsHrvDialogOpen] = useState(false);
  const { data: awcrData } = useQuery({
    queryKey: ["awcr_tracking", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*")
        .eq("player_id", playerId)
        .order("session_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Calculate EWMA data for table
  const ewmaResults = awcrData && awcrData.length > 0 
    ? calculateEWMASeries(transformToDailyLoadData(awcrData, []), "sRPE")
    : [];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Historique EWMA</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Ratio EWMA = Charge Aiguë (7j) / Charge Chronique (28j) | Zone optimale: 0.85 - 1.30
              </p>
            </div>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHrvDialogOpen(true)}
                className="gap-2"
              >
                <Heart className="h-4 w-4 text-destructive" />
                HRV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {ewmaResults.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>RPE</TableHead>
                    <TableHead>Durée (min)</TableHead>
                    <TableHead>sRPE</TableHead>
                    <TableHead>EWMA Aiguë (7j)</TableHead>
                    <TableHead>EWMA Chronique (28j)</TableHead>
                    <TableHead>Ratio EWMA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ewmaResults.map((result) => {
                    const sourceData = awcrData?.find(d => d.session_date === result.date);
                    return (
                      <TableRow key={result.date}>
                        <TableCell>
                          {new Date(result.date).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>{sourceData?.rpe}/10</TableCell>
                        <TableCell>{sourceData?.duration_minutes}</TableCell>
                        <TableCell className="font-semibold">{sourceData?.training_load}</TableCell>
                        <TableCell>{result.acute.toFixed(1)}</TableCell>
                        <TableCell>{result.chronic.toFixed(1)}</TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${
                              result.ratio < 0.85 || result.ratio > 1.3
                                ? "text-destructive"
                                : "text-primary"
                            }`}
                          >
                            {result.ratio.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Aucune donnée EWMA disponible</p>
          )}
        </CardContent>
      </Card>

      <HrvEntryDialog
        open={isHrvDialogOpen}
        onOpenChange={setIsHrvDialogOpen}
        categoryId={categoryId}
        defaultPlayerId={playerId}
      />
    </div>
  );
}